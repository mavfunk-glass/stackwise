import { useNavigate } from 'react-router-dom';

const LAST_UPDATED = 'April 2026';
const CONTACT_EMAIL = 'stacky@stack-wise.org';

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p className="text-xs text-warm-light">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="space-y-5">

          <div className="rounded-2xl p-5 bg-white border border-stone">
            <div className="text-xs font-semibold uppercase tracking-widest mb-3 text-warm-light">01</div>
            <h2 className="font-serif font-light mb-3 text-xl text-ink">Overview</h2>
            <p className="text-sm leading-relaxed text-warm-mid">
              StackWise ("we", "us", "our") provides a personalized supplement guidance service. This Privacy Policy explains what information we collect, how we use it, and your rights. We collect only what we need, we do not sell your data, and we give you control over what you share.
            </p>
          </div>

          <div className="rounded-2xl p-5 bg-white border border-stone">
            <div className="text-xs font-semibold uppercase tracking-widest mb-3 text-warm-light">02</div>
            <h2 className="font-serif font-light mb-3 text-xl text-ink">Information we collect</h2>
            <p className="text-sm font-semibold mb-2 text-ink">Information you provide directly</p>
            <ul className="space-y-1.5 mb-4">
              {[
                'Email address - collected when you save your stack or set up reminders. Entirely optional.',
                'Display name - your first name, if you choose to provide it. Optional.',
                'Quiz answers - age range, biological sex, height, weight, health goals, symptoms, health background, medications, diet preferences, and budget. Used only to generate your supplement guidance.',
                'Check-in notes - optional mood and notes added in the Dashboard.',
                'Chat messages - processed in real time to generate responses. Not stored on our servers beyond the active session.',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-warm-mid">
                  <span className="text-moss font-bold flex-shrink-0 mt-0.5">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm font-semibold mb-2 text-ink">Information collected automatically</p>
            <ul className="space-y-1.5 mb-4">
              {[
                'Session token - an anonymous identifier in localStorage that links your device to your account. Required for the app to function.',
                'Browser timezone - collected when you set a reminder, used only to send your email at the correct local time.',
                'Saved stack data - if you create an account, a copy of your stack is stored on our servers.',
                "Check-in history - stored in your browser's localStorage only.",
                'Anonymous product analytics - see section below.',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-warm-mid">
                  <span className="text-moss font-bold flex-shrink-0 mt-0.5">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="rounded-xl px-4 py-3 bg-emerald-50/90 border border-emerald-200/80 dark:bg-emerald-950/30 dark:border-emerald-800/50">
              <p className="text-xs leading-relaxed text-emerald-800 dark:text-emerald-100">
                <strong>Health data:</strong> Your quiz answers may include health background information, including medications and health conditions. We use this only to generate your supplement guidance. This information is never used in analytics, never sold, and never shared for advertising.
              </p>
            </div>
          </div>

          <div className="rounded-2xl p-5 bg-white border border-stone">
            <div className="text-xs font-semibold uppercase tracking-widest mb-3 text-warm-light">03</div>
            <h2 className="font-serif font-light mb-3 text-xl text-ink">How we use your information</h2>
            <ul className="space-y-1.5">
              {[
                'Generate your personalized supplement plan - quiz answers are sent to Google Gemini AI API. Google processes this under their terms.',
                'Send daily reminder emails - if you set a reminder, we use your email and timezone to email your supplement schedule.',
                'Send magic link sign-in emails - if you save your stack, we email you a one-click sign-in link.',
                'Maintain your account - email, display name, and saved stack stored so you can access your plan across devices.',
                'Verify subscription entitlements - we record your subscription status, verified through PayPal or Stripe.',
                'Protect the service - session tokens and rate limiting prevent abuse.',
                'Understand how the product is used - anonymous product analytics (see section below). No health data is used for this purpose.',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-warm-mid">
                  <span className="text-moss font-bold flex-shrink-0 mt-0.5">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl p-5 bg-white border border-stone">
            <div className="text-xs font-semibold uppercase tracking-widest mb-3 text-warm-light">04</div>
            <h2 className="font-serif font-light mb-3 text-xl text-ink">Third-party services</h2>
            <p className="text-sm mb-4 text-warm-mid">Each of the following has its own privacy policy which governs their processing of your data.</p>
            <div className="space-y-2">
              {[
                { name: 'Google Gemini API', use: 'AI processing for stack generation and chat. Your quiz inputs and messages are sent to Google.', url: 'https://policies.google.com/privacy' },
                { name: 'PayPal', use: 'Subscription billing. PayPal handles all payment data - we never see your card or bank details. PayPal may set cookies.', url: 'https://www.paypal.com/us/legalhub/privacy-full' },
                { name: 'Stripe', use: 'Optional card checkout on pricing. Stripe processes payment details; we receive subscription status and ids only.', url: 'https://stripe.com/privacy' },
                { name: 'Resend', use: 'Email delivery for sign-in links and daily reminders.', url: 'https://resend.com/privacy' },
                { name: 'Amazon / iHerb', use: "Affiliate buy links in your results. Clicking these may set affiliate cookies on those retailers' sites.", url: 'https://affiliate-program.amazon.com' },
              ].map((tp) => (
                <div key={tp.name} className="rounded-xl p-3 bg-cream-dark border border-stone">
                  <div className="font-semibold text-sm text-ink mb-0.5">{tp.name}</div>
                  <p className="text-xs leading-relaxed mb-1 text-warm-mid">{tp.use}</p>
                  <a href={tp.url} target="_blank" rel="noopener noreferrer" className="text-xs text-moss underline">Privacy policy →</a>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl p-5 bg-white border border-stone">
            <div className="text-xs font-semibold uppercase tracking-widest mb-3 text-warm-light">05</div>
            <h2 className="font-serif font-light mb-3 text-xl text-ink">Data storage and retention</h2>
            <div className="space-y-3 text-sm text-warm-mid">
              <p>Most of your data - quiz results, stack, check-in history - lives in your browser's localStorage. It is not sent to our servers unless you save your stack to an account.</p>
              <p>If you create an account, we store your email, display name, saved stack, and subscription status on a secured server. We retain this while your account is active.</p>
              <p>Magic link tokens expire in 15 minutes. Check-in tokens expire after 36 hours. Expired tokens are deleted regularly.</p>
            </div>
          </div>

          <div className="rounded-2xl p-5 bg-white border border-stone">
            <div className="text-xs font-semibold uppercase tracking-widest mb-3 text-warm-light">06</div>
            <h2 className="font-serif font-light mb-3 text-xl text-ink">Your rights</h2>
            <ul className="space-y-1.5 mb-4">
              {[
                "Access - email us and we'll send you a copy of the data we hold.",
                "Deletion - email us and we'll remove your account and server-side data within 30 days.",
                'Opt out of emails - use the unsubscribe link in any reminder email, or turn off reminders in the Dashboard.',
                'Correction - contact us to update your email or display name.',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-warm-mid">
                  <span className="text-moss font-bold flex-shrink-0 mt-0.5">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm text-warm-mid">
              If you are in the EEA (GDPR) or California (CCPA), you may have additional rights. Contact us at{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-moss underline">{CONTACT_EMAIL}</a>.
            </p>
          </div>

          <div className="rounded-2xl p-5 bg-white border border-stone">
            <div className="text-xs font-semibold uppercase tracking-widest mb-3 text-warm-light">07</div>
            <h2 className="font-serif font-light mb-3 text-xl text-ink">Cookies and local storage</h2>
            <p className="text-sm leading-relaxed text-warm-mid">
              StackWise uses browser localStorage - not cookies - to store your session, preferences, and quiz data. We do not set advertising or tracking cookies. The PayPal SDK on our pricing page may set its own cookies. Blocking those may prevent checkout from working.
            </p>
          </div>

          <div className="rounded-2xl p-5 bg-white border border-stone">
            <div className="text-xs font-semibold uppercase tracking-widest mb-3 text-warm-light">08</div>
            <h2 className="font-serif font-light mb-3 text-xl text-ink">Product analytics</h2>
            <p className="text-sm leading-relaxed mb-3 text-warm-mid">
              We collect anonymous product usage events to understand how the app is used and how to improve it. These events are tied to a randomly generated ID stored in your browser (not your email, name, or any account). They are never linked to your identity.
            </p>
            <p className="text-sm font-semibold mb-2 text-ink">What we do track (anonymously)</p>
            <ul className="space-y-1.5 mb-4">
              {[
                'Page views and navigation (which pages are visited).',
                'Quiz funnel progression (which step you are on, not your answers).',
                'Whether a stack was generated, and your subscription tier at that point.',
                'Pricing page visits and subscription flow events (clicks, completions, cancellations).',
                'Whether the Stacky chat was opened, and whether you are on a paid plan.',
                'Cancel-offer interactions (opened, kept plan, proceeded to PayPal).',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-warm-mid">
                  <span className="text-moss font-bold flex-shrink-0 mt-0.5">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="rounded-xl px-4 py-3 bg-emerald-50/90 border border-emerald-200/80 dark:bg-emerald-950/30 dark:border-emerald-800/50">
              <p className="text-xs leading-relaxed text-emerald-800 dark:text-emerald-100">
                <strong>We never track health data analytically.</strong> Your medications, health conditions, health background answers, quiz free-text responses, supplement choices, and chat messages are never included in analytics events.
              </p>
            </div>
          </div>

          <div className="rounded-2xl p-5 bg-white border border-stone">
            <div className="text-xs font-semibold uppercase tracking-widest mb-3 text-warm-light">10</div>
            <h2 className="font-serif font-light mb-3 text-xl text-ink">Children's privacy</h2>
            <p className="text-sm leading-relaxed text-warm-mid">
              StackWise is intended for users 18 and older. We do not knowingly collect data from anyone under 18. Contact us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-moss underline">{CONTACT_EMAIL}</a> if you believe we have done so.
            </p>
          </div>

          <div className="rounded-2xl p-5 bg-white border border-stone">
            <div className="text-xs font-semibold uppercase tracking-widest mb-3 text-warm-light">11</div>
            <h2 className="font-serif font-light mb-3 text-xl text-ink">Changes to this policy</h2>
            <p className="text-sm leading-relaxed text-warm-mid">
              We may update this policy from time to time. When we do, we will update the date at the top. For significant changes, we will notify users with accounts via email.
            </p>
          </div>

          <div className="rounded-2xl p-5 bg-forest">
            <div className="text-xs font-semibold uppercase tracking-widest mb-3 text-on-dark-subtle">12</div>
            <h2 className="font-serif font-light mb-2 text-xl text-on-dark-primary">Contact us</h2>
            <p className="text-sm leading-relaxed mb-3 text-on-dark-muted">Questions, data requests, or privacy concerns?</p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-block text-sm font-semibold px-5 py-2.5 rounded-full transition-opacity hover:opacity-90 bg-[#F9F6F1] text-[#1C3A2E] dark:bg-surface-elevated dark:text-warm dark:border dark:border-stone/90"
            >
              {CONTACT_EMAIL}
            </a>
            <p className="text-xs mt-3 text-on-dark-subtle">We aim to respond within 5 business days.</p>
          </div>

        </div>
      </div>
    </div>
  );
}
