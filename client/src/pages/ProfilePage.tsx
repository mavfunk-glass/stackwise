import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StackyCat from '../components/StackyCat';
import ThemeToggle from '../theme/ThemeToggle';
import {
  getSubscription,
  getSubscriptionTier,
  hasEverPurchasedPlan,
  isBasicOrPro,
  isPro,
  loadStackArchive,
} from '../types/storage';
import { NavIcon } from '../copy/navWayfinding';
import { trackEvent } from '../analytics/track';

// ─── CANCEL OFFER MODAL ───────────────────────────────────────────────────────

function CancelOfferModal({
  tier,
  onStay,
  onCancel,
}: {
  tier: 'basic' | 'pro';
  onStay: () => void;
  onCancel: () => void;
}) {
  const isProTier = tier === 'pro';

  const valueItems = isProTier
    ? [
        'Unlimited Stacky questions: ask anything about your stack, any time',
        'Your personalized plan saved and synced across devices',
        'Rebuild your stack whenever your goals shift',
        'Peptide and advanced protocol guidance',
        'Flags potential conflicts with medications or health background',
        'Full dosing, timing, and form detail for every supplement',
        'Evaluates new products before you spend on them',
      ]
    : [
        '20 Stacky questions every month',
        'Your personalized plan saved and synced across devices',
        'Unlimited stack rebuilds as your goals change',
        'Full dosing, timing, and form detail for every supplement',
        'Daily check-ins, streak tracking, and email reminders',
        'LooksMaxxing goal: skin, hair, face definition',
      ];

  const price = isProTier ? '$19/month' : '$9/month';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4"
      style={{
        background: 'rgba(28,58,46,0.65)',
        backdropFilter: 'blur(10px)',
        paddingBottom: 'max(0px, env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div
        className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl overflow-hidden bg-sw-bg text-warm"
        style={{ maxHeight: '92dvh', overflowY: 'auto' }}
      >
        {/* Header — dark, sad Stacky */}
        <div className="px-6 pt-7 pb-5 text-center bg-forest">
          <div className="flex justify-center mb-3">
            <StackyCat mood="sad" size={80} />
          </div>
          <div
            className="font-serif font-light mb-1 text-on-dark-primary italic"
            style={{ fontSize: 22, lineHeight: 1.25 }}
          >
            Before you go…
          </div>
          <p className="text-xs leading-relaxed text-on-dark-subtle">
            Here&apos;s what cancelling removes from your account.
          </p>
        </div>

        <div className="px-5 py-5">
          {/* Value list */}
          <div className="space-y-2 mb-4">
            {valueItems.map((item) => (
              <div key={item} className="flex items-start gap-2.5">
                <span className="text-xs font-bold flex-shrink-0 mt-0.5 text-moss">✓</span>
                <span className="text-sm leading-snug text-warm">{item}</span>
              </div>
            ))}
          </div>

          <p className="text-xs text-center font-semibold mb-4 text-warm-light">
            All of this for {price}, less than a single supplement bottle.
          </p>

          {/* Basic users: offer to try Pro instead */}
          {!isProTier && (
            <div className="rounded-xl px-4 py-3 mb-4 bg-emerald-50/90 border border-emerald-200/80 dark:bg-emerald-950/30 dark:border-emerald-800/50">
              <p className="text-xs font-semibold mb-1 text-ink">
                Thinking about leaving because of the question limit?
              </p>
              <p className="text-xs leading-relaxed text-emerald-800 dark:text-emerald-100">
                Pro gives you unlimited Stacky questions for $10 more. Email{' '}
                <a href="mailto:stacky@stack-wise.org" className="text-ink underline dark:text-moss">
                  stacky@stack-wise.org
                </a>{' '}
                and we&apos;ll upgrade you for the rest of this billing period at no extra charge.
              </p>
            </div>
          )}

          {/* Keep plan — primary CTA */}
          <button
            type="button"
            onClick={onStay}
            className="w-full rounded-full font-semibold text-sm mb-2 transition-all active:scale-[0.98] bg-forest text-on-dark-primary hover:bg-forest-light"
            style={{ height: 52 }}
          >
            Keep my {isProTier ? 'Pro' : 'Basic'} plan →
          </button>

          {/* Cancel — lowest visual weight */}
          <button
            type="button"
            onClick={onCancel}
            className="w-full text-center text-xs py-2.5 transition-all text-warm-light hover:text-warm-mid"
          >
            I still want to cancel. Take me to PayPal
          </button>

          <p className="text-center text-[10px] mt-2 text-stone dark:text-warm-light">
            Access continues until the end of your current billing period.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const navigate = useNavigate();
  const tier = getSubscriptionTier();
  const pro = isPro();
  const paid = isBasicOrPro();
  const subRecord = getSubscription();
  const stackArchive = loadStackArchive();
  const [showCancelOffer, setShowCancelOffer] = useState(false);

  function handleCancelIntent() {
    trackEvent('cancel_offer_open', { tier: pro ? 'pro' : 'basic' });
    setShowCancelOffer(true);
  }

  function handleStay() {
    trackEvent('cancel_offer_keep_plan', { tier: pro ? 'pro' : 'basic' });
    setShowCancelOffer(false);
  }

  function handleConfirmCancel() {
    trackEvent('cancel_offer_go_paypal', { tier: pro ? 'pro' : 'basic' });
    setShowCancelOffer(false);
    window.open('https://www.paypal.com/myaccount/autopay/', '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="min-h-screen bg-sw-bg text-warm max-w-lg mx-auto pb-24">
      {showCancelOffer && paid && (
        <CancelOfferModal
          tier={pro ? 'pro' : 'basic'}
          onStay={handleStay}
          onCancel={handleConfirmCancel}
        />
      )}

      <nav
        className="sticky top-0 z-40 px-5 border-b border-stone sw-sticky-nav"
        style={{
          paddingTop: 'max(14px, env(safe-area-inset-top, 14px))',
          paddingBottom: 14,
        }}
      >
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/landing')}
            className="inline-flex items-center gap-1.5 font-serif font-light tracking-widest text-sm text-ink"
            style={{ letterSpacing: '0.15em' }}
          >
            <NavIcon kind="home" size={17} className="text-ink opacity-90" />
            <span>STACKWISE</span>
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 text-sm font-medium text-warm-light hover:text-ink transition-colors"
          >
            <span aria-hidden>←</span>
            <span>Back</span>
          </button>
        </div>
      </nav>

      <div className="p-6 pt-8">
        <h1 className="font-display text-2xl text-ink mb-4">Profile</h1>
        <div className="mb-6">
          <ThemeToggle />
        </div>

        {/* Plan card */}
        <div className="rounded-2xl border border-stone bg-white p-5 mb-6">
          <div
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: '#9C8E84' }}
          >
            Current plan
          </div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-lg capitalize text-ink">{tier}</span>
              {paid && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: '#F0F5F2', color: '#4A7C59', border: '1px solid #D4E8DA' }}
                >
                  Active
                </span>
              )}
            </div>
            {!paid && (
              <button
                type="button"
                onClick={() => navigate('/pricing')}
                className="text-xs font-semibold px-3 py-1.5 rounded-full"
                style={{ background: '#1C3A2E', color: '#F9F6F1' }}
              >
                Upgrade →
              </button>
            )}
          </div>

          {subRecord && (
            <p className="text-xs mb-3" style={{ color: '#9C8E84' }}>
              Active since {new Date(subRecord.activatedAt).toLocaleDateString()} · ref{' '}
              <span className="font-mono tabular-nums">{subRecord.subscriptionId.slice(-8)}</span>
            </p>
          )}
          {!subRecord && hasEverPurchasedPlan() && (
            <p className="text-xs mb-3" style={{ color: '#9C8E84' }}>
              This device had a paid plan before. Resubscribe to restore access.
            </p>
          )}

          {paid && (
            <div className="border-t border-stone pt-3 mt-2">
              <p className="text-xs leading-relaxed mb-2" style={{ color: '#C4B9AC' }}>
                Cancellations are processed through PayPal. You keep access until the end of your
                current billing period.
              </p>
              <button
                type="button"
                onClick={handleCancelIntent}
                className="text-xs underline underline-offset-2 transition-colors hover:text-warm"
                style={{ color: '#C4B9AC' }}
              >
                Cancel subscription
              </button>
            </div>
          )}
        </div>

        {/* Stack archive */}
        {paid && (
          <div className="rounded-2xl border border-stone bg-white p-5 mb-6">
            <div className="text-xs font-semibold uppercase tracking-widest mb-2 text-moss">
              Saved previous stacks
            </div>
            <p className="text-xs text-warm-mid leading-relaxed mb-3">
              Each time you rebuild, your prior stack is archived here, up to 15 most recent.
            </p>
            {stackArchive.length === 0 ? (
              <p className="text-sm text-warm-light">
                No archived stacks yet. Rebuild from Results or Stack Hub to save your first one.
              </p>
            ) : (
              <ul className="space-y-2">
                {stackArchive.map((a) => {
                  const goals = a.quiz?.primaryGoals?.slice(0, 3).join(', ') ?? 'Quiz snapshot';
                  return (
                    <li
                      key={a.id}
                      className="rounded-xl border border-stone/80 bg-cream/40 px-3 py-2 text-xs text-warm-mid"
                    >
                      <div className="font-semibold text-ink">{a.label}</div>
                      <div className="mt-0.5 line-clamp-2">{goals}</div>
                      <div className="text-[10px] text-warm-light mt-1 tabular-nums">
                        {a.savedAt.slice(0, 10)}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {pro ? (
          <div className="rounded-2xl border border-stone bg-white p-5 mb-6">
            <div className="text-xs font-semibold uppercase tracking-widest mb-3 text-moss">
              Pro · Stacky look
            </div>
            <p className="text-sm leading-relaxed mb-4 text-warm-mid">
              Pro includes Stacky in his signature gold cowboy hat everywhere in the app. On
              automatically.
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex justify-center sm:justify-start flex-shrink-0">
                <StackyCat mood="wave" size={112} />
              </div>
              <p className="text-sm font-medium text-ink">Always on in Pro.</p>
            </div>
            <p className="text-xs text-warm-light mt-3">
              Visible in quiz steps, chat, results, and all other Stacky appearances.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-stone bg-[#FDFCFA] p-5 mb-6">
            <div className="text-xs font-semibold uppercase tracking-widest mb-2 text-warm-light">
              Pro perk
            </div>
            <p className="text-sm leading-relaxed text-warm-mid">
              <span className="font-semibold text-warm">StackWise Pro</span> gives Stacky a gold
              cowboy hat across the app, plus unlimited questions and peptide guidance.{' '}
              <button
                type="button"
                onClick={() => navigate('/pricing')}
                className="font-semibold underline underline-offset-2 text-ink hover:text-forest-light"
              >
                View Pro →
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
