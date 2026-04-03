import { useEffect, useState } from 'react';
import { PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { useLocation, useNavigate } from 'react-router-dom';
import { activateSubscriptionOnServer, fetchBillingStatus } from '../api/session';
import { REBUILD_SAVINGS_BODY } from '../copy/rebuildStackUpsell';
import { NavIcon } from '../copy/navWayfinding';
import { saveSubscription } from '../types/storage';
import { trackEvent } from '../analytics/track';

const BASIC_PLAN_ID = import.meta.env.VITE_PAYPAL_BASIC_PLAN_ID as string;
const PRO_PLAN_ID = import.meta.env.VITE_PAYPAL_PRO_PLAN_ID as string;
type SubscriptionTier = 'basic' | 'pro';

function PayPalWrapper({ planId, tier, onSuccess }: { planId: string; tier: SubscriptionTier; onSuccess: () => void }) {
  const [{ isPending }] = usePayPalScriptReducer();
  const [err, setErr] = useState<string | null>(null);
  if (isPending) return <div className="text-center text-xs py-4" style={{ color: '#9C8E84' }}>Loading payment options…</div>;
  return (
    <div className="min-w-0">
      {err && <div className="mb-3 text-xs text-center rounded-xl p-2" style={{ background: '#FEF2F2', color: '#B91C1C' }}>{err}</div>}
      <div className="w-full rounded-xl overflow-hidden" style={{ maxWidth: '100%' }}>
        <PayPalButtons
          style={{ layout: 'vertical', color: 'black', shape: 'pill', label: 'subscribe', height: 50 }}
          createSubscription={(_d, actions) => {
            trackEvent('paypal_subscribe_click', { tier });
            setErr(null);
            return actions.subscription.create({ plan_id: planId });
          }}
          onApprove={async (data) => {
            const subscriptionId = (data.subscriptionID ?? '').trim();
            if (!subscriptionId) {
              setErr('Missing subscription reference. Please try again.');
              return;
            }
            const act = await activateSubscriptionOnServer(subscriptionId, tier);
            if (!act.ok) {
              const msg = (act.error ?? '').toLowerCase();
              const entitlementsOff =
                msg.includes('disabled') || msg.includes('server entitlements');
              if (import.meta.env.DEV && entitlementsOff) {
                saveSubscription({
                  tier,
                  subscriptionId,
                  activatedAt: new Date().toISOString(),
                });
                trackEvent('subscription_activated', { tier, dev_bypass: true });
                onSuccess();
                return;
              }
              setErr(act.error ?? 'We could not verify your subscription. Please try again or contact support.');
              return;
            }
            const billing = await fetchBillingStatus();
            if (billing?.paypalSubscriptionId && (billing.tier === 'basic' || billing.tier === 'pro')) {
              saveSubscription({
                tier: billing.tier,
                subscriptionId: billing.paypalSubscriptionId,
                activatedAt: billing.activatedAt ?? new Date().toISOString(),
              });
            } else {
              saveSubscription({
                tier,
                subscriptionId,
                activatedAt: new Date().toISOString(),
              });
            }
            trackEvent('subscription_activated', { tier });
            onSuccess();
          }}
          onError={() => setErr('Something went wrong. Please try again.')}
          onCancel={() => {
            trackEvent('paypal_checkout_cancelled', { tier });
            setErr('Payment cancelled.');
          }}
        />
      </div>
    </div>
  );
}

function SuccessModal({ tier, onContinue }: { tier: SubscriptionTier; onContinue: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(28,58,46,0.6)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-sm rounded-3xl p-8 text-center" style={{ background: '#F9F6F1' }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: '#F0F5F2', border: '2px solid #D4E8DA' }}>
          <svg width="28" height="22" viewBox="0 0 28 22" fill="none">
            <path d="M2 11L10 19L26 3" stroke="#1C3A2E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2 className="font-serif font-light mb-2" style={{ fontSize: 28, color: '#1C3A2E' }}>
          {tier === 'pro' ? 'Welcome to Pro.' : 'Welcome to Basic.'}
        </h2>
        <p className="text-sm leading-relaxed mb-6" style={{ color: '#6B5B4E' }}>
          {tier === 'pro'
            ? 'Your plan is live. Peptide Optimization is unlocked in your quiz, plus ongoing guidance, follow-ups, and stack updates as goals evolve.'
            : 'Your stack is saved. LooksMaxxing is unlocked in your quiz, with daily check-ins, reminders, and unlimited stack generations.'}
        </p>
        <button onClick={onContinue} className="btn-primary w-full" style={{ height: 50 }}>
          {tier === 'pro' ? 'Meet My Stack Guide →' : 'Continue →'}
        </button>
      </div>
    </div>
  );
}

export default function PricingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const rebuildIntent = (location.state as { intent?: string } | null)?.intent === 'rebuild';
  const [successTier, setSuccessTier] = useState<SubscriptionTier | null>(null);

  useEffect(() => {
    trackEvent('pricing_view', { rebuild_intent: rebuildIntent });
  }, [rebuildIntent]);

  return (
    <div className="min-h-screen pb-16" style={{ background: '#F9F6F1' }}>
      {successTier && <SuccessModal tier={successTier} onContinue={() => navigate(successTier === 'pro' ? '/results' : '/quiz')} />}

      {/* Nav */}
      <div className="sticky top-0 z-40 px-5" style={{ background: 'rgba(249,246,241,0.95)', backdropFilter: 'blur(12px)', paddingTop: 'max(14px, env(safe-area-inset-top, 14px))', paddingBottom: 14, borderBottom: '1px solid #E8E0D5' }}>
        <div className="max-w-lg mx-auto flex items-center justify-between gap-2">
          <button
            onClick={() => navigate('/landing')}
            className="inline-flex items-center gap-1.5 font-serif font-light tracking-widest text-sm"
            style={{ color: '#1C3A2E', letterSpacing: '0.15em' }}
          >
            <NavIcon kind="home" size={17} className="text-forest opacity-90" />
            <span>STACKWISE</span>
          </button>
          <button
            onClick={() => navigate('/results')}
            className="inline-flex items-center gap-1 text-xs font-medium"
            style={{ color: '#9C8E84' }}
          >
            <NavIcon kind="stack" size={15} className="text-warm-mid opacity-90" />
            <span>Back to stack</span>
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 pt-8">
        {rebuildIntent && (
          <div
            className="rounded-2xl border px-4 py-3 mb-6 text-left text-sm"
            style={{ background: '#F0F5F2', borderColor: '#D4E8DA', color: '#1C3A2E' }}
          >
            <span className="font-semibold block mb-1.5">Rebuild your stack for new goals</span>
            <span className="block leading-relaxed" style={{ color: '#6B5B4E' }}>
              {REBUILD_SAVINGS_BODY}
            </span>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-10">
          <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#4A7C59', letterSpacing: '0.1em' }}>
            StackWise · personalized supplement guidance
          </div>
          <h1 className="font-serif mb-3" style={{ fontSize: 36, color: '#1C3A2E', fontWeight: 300, fontStyle: 'italic', letterSpacing: '-0.01em', lineHeight: 1.15 }}>
            Stop guessing with supplements.
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: '#6B5B4E' }}>
            Build a stack that fits your goals, routine, and budget, then get ongoing guidance as it evolves.
          </p>
        </div>

        {/* Comparison table */}
        <div className="rounded-2xl overflow-hidden mb-8" style={{ border: '1px solid #E8E0D5' }}>
          <div className="grid grid-cols-3" style={{ background: '#FDFCFA', borderBottom: '1px solid #E8E0D5' }}>
            <div className="p-3 text-xs font-semibold uppercase tracking-widest" style={{ color: '#9C8E84' }}>What you get</div>
            <div className="p-3 text-center text-xs font-semibold uppercase tracking-widest" style={{ color: '#9C8E84', borderLeft: '1px solid #E8E0D5' }}>Trial and error</div>
            <div className="p-3 text-center text-xs font-semibold" style={{ color: '#1C3A2E', borderLeft: '1px solid #E8E0D5', background: '#F0F5F2' }}>StackWise Pro</div>
          </div>
          {[
            ['Personalized to your goals and routine', '✗', '✓'],
            ['Clear reasoning behind every recommendation', '✗', '✓'],
            ['Available whenever you have questions', '✗', '✓'],
            ['Updates as your goals change', '✗', '✓'],
            ['Helps you evaluate new additions', '✗', '✓'],
            ['Monthly cost', 'Wasted spending', '$9-19'],
          ].map(([label, theirs, ours]) => (
            <div key={label} className="grid grid-cols-3" style={{ borderTop: '1px solid #F0EBE3' }}>
              <div className="p-3 text-xs font-medium" style={{ color: '#6B5B4E' }}>{label}</div>
              <div className="p-3 text-center text-xs" style={{ color: '#C4B9AC', borderLeft: '1px solid #F0EBE3' }}>{theirs}</div>
              <div className="p-3 text-center text-xs font-semibold" style={{ color: '#1C3A2E', borderLeft: '1px solid #F0EBE3', background: '#F9FCF9' }}>{ours}</div>
            </div>
          ))}
        </div>

        <div
          className="rounded-2xl px-4 py-3.5 mb-8 text-left"
          style={{ background: '#FDFCFA', border: '1px solid #E8E0D5' }}
        >
          <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#9C8E84', letterSpacing: '0.08em' }}>
            Quiz goal unlocks
          </div>
          <ul className="text-xs leading-relaxed space-y-1.5" style={{ color: '#6B5B4E' }}>
            <li>
              <strong style={{ color: '#1C3A2E' }}>Free</strong>: core health goals only. LooksMaxxing and Peptide Optimization stay locked.
            </li>
            <li>
              <strong style={{ color: '#1C3A2E' }}>Basic</strong>: unlocks <strong style={{ color: '#1C3A2E' }}>LooksMaxxing</strong> in the quiz (advanced appearance goals). Peptide Optimization remains Pro-only.
            </li>
            <li>
              <strong style={{ color: '#1C3A2E' }}>Pro</strong>: everything in Basic, plus <strong style={{ color: '#1C3A2E' }}>Peptide Optimization</strong> in the quiz and peptide education in your guide when relevant.
            </li>
          </ul>
        </div>

        {/* PRO card */}
        <div className="rounded-2xl overflow-hidden mb-4" style={{ background: '#1C3A2E' }}>
          <div className="px-5 pt-5 pb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold uppercase tracking-widest text-on-dark-muted">Pro</span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(249,246,241,0.1)', color: '#F9F6F1' }}>Most Popular</span>
            </div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="font-serif" style={{ fontSize: 42, color: '#F5924A', fontWeight: 300 }}>$19</span>
              <span className="text-sm text-on-dark-muted">/month</span>
            </div>
            <p className="text-sm mb-5 text-on-dark-muted">Cancel anytime. 7-day fit guarantee on your first charge.</p>

            <div className="space-y-2.5 mb-5">
              {[
                ['💬', 'Unlimited guidance: ask follow-ups anytime'],
                ['📋', 'Understand why each recommendation fits your goals'],
                ['🔄', 'Rebuild and refine your stack as goals change (unlimited generations)'],
                ['🗂️', 'Name and organize your stacks in Stack Hub'],
                ['🔍', 'Evaluate new supplements before you buy: fit, overlap, timing'],
                ['📈', 'Ongoing support for smarter decisions as life changes'],
                ['🧬', 'Unlock Peptide Optimization in the quiz + peptide guidance when relevant (Pro only, not on Basic)'],
                ['⚕️', 'Nudges to check with a professional when something is medical or uncertain'],
                ['📧', 'Education that stays relevant to your goals and current stack'],
                ['✓', 'Everything in Basic'],
              ].map(([icon, text]) => (
                <div key={text as string} className="flex items-start gap-3">
                  <span className="flex-shrink-0 text-base" style={{ lineHeight: '1.4' }}>{icon}</span>
                  <span className="text-sm leading-snug" style={{ color: 'rgba(249,246,241,0.8)' }}>{text}</span>
                </div>
              ))}
            </div>

            <PayPalWrapper planId={PRO_PLAN_ID} tier="pro" onSuccess={() => setSuccessTier('pro')} />

            {/* Guarantee */}
            <div className="mt-4 flex items-start gap-2.5 rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <span className="text-on-dark-muted" style={{ fontSize: 14, flexShrink: 0 }}>🛡</span>
              <p className="text-xs leading-relaxed text-on-dark-muted">
                <strong style={{ color: '#F9F6F1' }}>7-day fit guarantee.</strong> If StackWise isn&apos;t the right fit within your first 7 days, email <a href="mailto:MAVFunk@gmail.com" style={{ color: 'rgba(249,246,241,0.7)', textDecoration: 'underline' }}>MAVFunk@gmail.com</a> for a full refund.
              </p>
            </div>

            {/* Testimonial */}
            <div className="mt-4 rounded-xl px-3 py-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-xs italic leading-relaxed mb-1.5 text-on-dark-muted">
                &ldquo;I was buying supplements that didn&apos;t fit what I was trying to do. StackWise gave me a clear plan and ongoing guidance. It&apos;s one of the better spends in my routine.&rdquo;
              </p>
              <p className="text-xs font-semibold" style={{ color: 'rgba(249,246,241,0.35)' }}>James K., Pro member</p>
            </div>
          </div>
        </div>

        {/* BASIC card */}
        <div className="rounded-2xl overflow-hidden mb-8" style={{ background: '#FFFFFF', border: '1px solid #E8E0D5' }}>
          <div className="px-5 pt-5 pb-5">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#9C8E84' }}>Basic</span>
            <div className="flex items-baseline gap-1 mt-1 mb-1">
              <span className="font-serif font-light" style={{ fontSize: 36, color: '#1C3A2E' }}>$9</span>
              <span className="text-sm" style={{ color: '#9C8E84' }}>/month</span>
            </div>
            <p className="text-sm mb-4" style={{ color: '#6B5B4E' }}>A personalized stack and a practical routine you can actually use.</p>
            <div className="space-y-2 mb-5">
              {[
                ['🪞', 'Unlocks LooksMaxxing in your quiz (appearance and symmetry goals, not on Free)'],
                ['✓', 'Unlimited stack generations: rebuild anytime your goals change'],
                ['✓', 'Full plan: exact forms, dosing, and timing for every supplement'],
                ['✓', 'Daily check-in with mood tracking and streak counter'],
                ['✓', 'Supplement reminders via push notification'],
                ['✓', 'Stack saved to your profile, accessible whenever you need it'],
              ].map(([icon, text]) => (
                <div key={text as string} className="flex items-start gap-2.5">
                  <span className="text-xs font-bold flex-shrink-0 mt-0.5" style={{ color: '#4A7C59' }}>{icon}</span>
                  <span className="text-sm leading-snug" style={{ color: '#6B5B4E' }}>{text}</span>
                </div>
              ))}
            </div>
            <PayPalWrapper planId={BASIC_PLAN_ID} tier="basic" onSuccess={() => setSuccessTier('basic')} />
            <p className="text-xs text-center mt-2 leading-relaxed px-1" style={{ color: '#C4B9AC' }}>
              Cancel anytime. Peptide Optimization stays on Pro.
            </p>
          </div>
        </div>

        {/* FAQ link moved off main pricing area */}
        <div className="mt-4 mb-8 text-center">
          <button
            type="button"
            onClick={() => navigate('/faq')}
            className="text-xs font-semibold underline-offset-2"
            style={{ color: '#9C8E84', textDecoration: 'underline' }}
          >
            Common questions about StackWise →
          </button>
        </div>

        <p className="text-xs text-center leading-relaxed mt-8 px-4" style={{ color: '#C4B9AC', maxWidth: 480, margin: '32px auto 0' }}>
          StackWise provides personalized supplement guidance for informational and educational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare professional before making changes to your supplement routine, especially if you take medications or have a health condition.
        </p>

      </div>
    </div>
  );
}
