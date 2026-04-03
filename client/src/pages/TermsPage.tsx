import { useNavigate } from 'react-router-dom';

const LAST_UPDATED = 'April 2025';
const CONTACT_EMAIL = 'stacky@stack-wise.org';
const JURISDICTION = 'California, United States'; // <- replace with your jurisdiction

export default function TermsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-sw-bg text-warm">
      <div
        className="sticky top-0 z-40 px-5 border-b border-stone sw-sticky-nav"
        style={{
          paddingTop: 'max(14px, env(safe-area-inset-top, 14px))',
          paddingBottom: 14,
        }}
      >
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="font-serif font-light tracking-widest text-sm text-ink"
            style={{ letterSpacing: '0.15em' }}
          >
            STACKWISE
          </button>
          <button type="button" onClick={() => navigate(-1)} className="text-xs font-medium text-warm-light">
            ← Back
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 pt-10 pb-20">
        <div className="mb-8">
          <h1
            className="font-serif font-light mb-2 text-ink italic"
            style={{ fontSize: 32, letterSpacing: '-0.01em' }}
          >
            Terms of Service
          </h1>
          <p className="text-xs text-warm-light">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="space-y-5">

          <div className="rounded-2xl p-5 bg-white border border-stone">
            <div className="text-xs font-semibold uppercase tracking-widest mb-3 text-warm-light">01</div>
            <h2 className="font-serif font-light mb-3 text-xl text-ink">Acceptance of terms</h2>
            <p className="text-sm leading-relaxed text-warm-mid">
              By accessing or using StackWise, you agree to these Terms of Service and our Privacy Policy. If you do not agree, do not use the service. Continued use after changes are posted constitutes acceptance.
            </p>
          </div>

          <div className="rounded-2xl p-5 bg-white border border-stone">
            <div className="text-xs font-semibold uppercase tracking-widest mb-3 text-warm-light">02</div>
            <h2 className="font-serif font-light mb-3 text-xl text-ink">Eligibility</h2>
            <p className="text-sm leading-relaxed text-warm-mid">
              You must be at least 18 years old to use StackWise. By using the service, you represent and warrant that you are 18 or older. We strongly encourage consulting a qualified healthcare professional before acting on any recommendations.
            </p>
          </div>

          <div className="rounded-2xl p-5 bg-white border border-stone">
            <div className="text-xs font-semibold uppercase tracking-widest mb-3 text-warm-light">03</div>
            <h2 className="font-serif font-light mb-3 text-xl text-ink">Educational use only - not medical advice</h2>
            <p className="text-sm leading-relaxed mb-3 text-warm-mid">
              StackWise provides AI-generated supplement guidance for educational and informational purposes only. Nothing constitutes medical advice, diagnosis, treatment, or a substitute for professional medical consultation.
            </p>
            <p className="text-sm leading-relaxed mb-3 text-warm-mid">StackWise does not and cannot:</p>
            <ul className="space-y-1.5 mb-3">
              {[
                'Diagnose any health condition',
                'Prescribe or recommend medications',
                'Replace the advice of a licensed physician, dietitian, or other healthcare provider',
                'Guarantee any specific health outcome',
                'Detect nutrient deficiencies',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-warm-mid">
                  <span className="text-moss font-bold flex-shrink-0 mt-0.5">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="rounded-xl px-4 py-3 bg-amber-50 border border-amber-200/90 dark:bg-amber-950/35 dark:border-amber-800/60">
              <p className="text-xs leading-relaxed font-semibold text-amber-900 dark:text-amber-100">
                Always consult a qualified healthcare professional before starting, stopping, or changing any supplement regimen - especially if you take prescription medications or have a medical condition.
              </p>
            </div>
          </div>

          <div className="rounded-2xl p-5 bg-white border border-stone">
            <div className="text-xs font-semibold uppercase tracking-widest mb-3 text-warm-light">04</div>
            <h2 className="font-serif font-light mb-3 text-xl text-ink">AI-generated content</h2>
            <p className="text-sm leading-relaxed mb-3 text-warm-mid">
              StackWise uses AI (Google Gemini) to generate recommendations and responses. AI-generated content may contain errors or inaccuracies and is not reviewed by a licensed professional before delivery.
            </p>
            <p className="text-sm leading-relaxed text-warm-mid">
              You are solely responsible for evaluating the appropriateness of any recommendation for your situation.
            </p>
          </div>

          <div className="rounded-2xl p-5 bg-white border border-stone">
            <div className="text-xs font-semibold uppercase tracking-widest mb-3 text-warm-light">05</div>
            <h2 className="font-serif font-light mb-3 text-xl text-ink">Subscriptions and billing</h2>
            <p className="text-sm leading-relaxed mb-3 text-warm-mid">
              Paid plans (Basic and Pro) are billed monthly through PayPal. By subscribing, you authorize recurring charges.
            </p>
            <ul className="space-y-1.5 mb-3">
              {[
                'Subscriptions renew automatically each month until cancelled.',
                'Cancel any time through your PayPal account. Access continues until end of billing period.',
                'No partial refunds are issued for unused time in a billing period, except as described in our 7-day fit guarantee below.',
                'We reserve the right to modify pricing with reasonable advance notice.',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-warm-mid">
                  <span className="text-moss font-bold flex-shrink-0 mt-0.5">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm leading-relaxed text-warm-mid">
              <strong className="text-ink">To cancel:</strong> PayPal account → Settings → Payments → Manage pre-approved payments → StackWise → Cancel.
            </p>
          </div>

          <div className="rounded-2xl p-5 bg-white border border-stone">
            <div className="text-xs font-semibold uppercase tracking-widest mb-3 text-warm-light">06</div>
            <h2 className="font-serif font-light mb-3 text-xl text-ink">7-day fit guarantee</h2>
            <p className="text-sm leading-relaxed mb-3 text-warm-mid">
              If StackWise is not the right fit within the first 7 days of your initial charge, you may request a full refund of that charge. This guarantee covers fit and clarity: whether the plan makes sense for your goals and whether the guidance is useful. It does not guarantee specific supplement outcomes, as those depend on the supplements themselves and individual biology.
            </p>
            <p className="text-sm leading-relaxed mb-3 text-warm-mid">
              To request a refund, email <a href={`mailto:${CONTACT_EMAIL}`} className="text-moss underline">{CONTACT_EMAIL}</a> within 7 days of your initial charge with the subject line &quot;Refund request&quot; and your PayPal email address. We will process your refund within 5 business days.
            </p>
            <p className="text-sm leading-relaxed text-warm-mid">
              This guarantee applies to your first subscription charge only. Refunds are not available for renewal charges. One refund per customer.
            </p>
          </div>

          <div className="rounded-2xl p-5 bg-white border border-stone">
            <div className="text-xs font-semibold uppercase tracking-widest mb-3 text-warm-light">07</div>
            <h2 className="font-serif font-light mb-3 text-xl text-ink">Account and data</h2>
            <p className="text-sm leading-relaxed mb-3 text-warm-mid">
              You are responsible for maintaining the security of your account access. Notify us immediately if you believe your account has been compromised.
            </p>
            <p className="text-sm leading-relaxed mb-3 text-warm-mid">
              If you request data deletion, we will remove your server-side data within 30 days. Browser data can be deleted by clearing your browser's local storage.
            </p>
            <p className="text-sm leading-relaxed text-warm-mid">
              By using StackWise, you agree to the collection of anonymous product usage events as described in our <a href="/privacy" className="text-moss underline">Privacy Policy</a>. These events contain no personally identifiable information, no health data, and no quiz content. They are used solely to understand and improve the product.
            </p>
          </div>

          <div className="rounded-2xl p-5 bg-white border border-stone">
            <div className="text-xs font-semibold uppercase tracking-widest mb-3 text-warm-light">08</div>
            <h2 className="font-serif font-light mb-3 text-xl text-ink">Acceptable use</h2>
            <p className="text-sm leading-relaxed mb-2 text-warm-mid">You agree not to:</p>
            <ul className="space-y-1.5">
              {[
                'Circumvent rate limits, credit limits, or paywalls through technical means',
                'Use the service to generate content for resale without our permission',
                'Provide false health information that could compromise AI guidance safety',
                'Use automated tools to access the service at scale',
                'Attempt to reverse-engineer the underlying AI system prompts',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-warm-mid">
                  <span className="text-moss font-bold flex-shrink-0 mt-0.5">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl p-5 bg-white border border-stone">
            <div className="text-xs font-semibold uppercase tracking-widest mb-3 text-warm-light">09</div>
            <h2 className="font-serif font-light mb-3 text-xl text-ink">Limitation of liability</h2>
            <p className="text-sm leading-relaxed mb-3 text-warm-mid">
              To the maximum extent permitted by law, StackWise shall not be liable for any indirect, incidental, special, consequential, or punitive damages including loss of health, bodily injury, or financial loss arising from your use of or reliance on StackWise.
            </p>
            <p className="text-sm leading-relaxed text-warm-mid">
              Our total liability for any claim shall not exceed the amount you paid us in the 30 days preceding the claim.
            </p>
          </div>

          <div className="rounded-2xl p-5 bg-white border border-stone">
            <div className="text-xs font-semibold uppercase tracking-widest mb-3 text-warm-light">10</div>
            <h2 className="font-serif font-light mb-3 text-xl text-ink">Disclaimer of warranties</h2>
            <p className="text-sm leading-relaxed text-warm-mid">
              StackWise is provided "as is" without warranties of any kind. We do not warrant that AI-generated recommendations will be accurate, complete, or suitable for your circumstances. These statements have not been evaluated by the FDA. Supplement recommendations are not intended to diagnose, treat, cure, or prevent any disease.
            </p>
          </div>

          <div className="rounded-2xl p-5 bg-white border border-stone">
            <div className="text-xs font-semibold uppercase tracking-widest mb-3 text-warm-light">11</div>
            <h2 className="font-serif font-light mb-3 text-xl text-ink">Governing law</h2>
            <p className="text-sm leading-relaxed text-warm-mid">
              These terms are governed by the laws of {JURISDICTION}. Any disputes shall be resolved in the courts of that jurisdiction. If any provision is found unenforceable, the remaining provisions continue in full force.
            </p>
          </div>

          <div className="rounded-2xl p-5 bg-forest">
            <div className="text-xs font-semibold uppercase tracking-widest mb-3 text-on-dark-subtle">12</div>
            <h2 className="font-serif font-light mb-2 text-xl text-on-dark-primary">Questions</h2>
            <p className="text-sm leading-relaxed mb-3 text-on-dark-muted">
              Questions, refund requests, or account deletion?
            </p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-block text-sm font-semibold px-5 py-2.5 rounded-full transition-opacity hover:opacity-90 bg-[#F9F6F1] text-[#1C3A2E] dark:bg-surface-elevated dark:text-warm dark:border dark:border-stone/90"
            >
              {CONTACT_EMAIL}
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}
