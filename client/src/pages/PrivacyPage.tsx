import { useNavigate } from 'react-router-dom';

const LAST_UPDATED = 'April 2025';
const CONTACT_EMAIL = 'healthpro@stackdsup.com'; // <- replace with your support email

export default function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ background: '#F9F6F1' }}>
      <div
        className="sticky top-0 z-40 px-5"
        style={{
          background: 'rgba(249,246,241,0.95)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          paddingTop: 'max(14px, env(safe-area-inset-top, 14px))',
          paddingBottom: 14,
          borderBottom: '1px solid #E8E0D5',
        }}
      >
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button type="button" onClick={() => navigate('/')} className="font-serif font-light tracking-widest text-sm" style={{ color: '#1C3A2E', letterSpacing: '0.15em' }}>
            STACKWISE
          </button>
          <button type="button" onClick={() => navigate(-1)} className="text-xs font-medium" style={{ color: '#9C8E84' }}>← Back</button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 pt-10 pb-20">
        <div className="mb-8">
          <h1 className="font-serif font-light mb-2" style={{ fontSize: 32, color: '#1C3A2E', letterSpacing: '-0.01em', fontStyle: 'italic' }}>
            Privacy Policy
          </h1>
          <p className="text-xs" style={{ color: '#9C8E84' }}>Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="space-y-5">

          <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid #E8E0D5' }}>
            <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9C8E84' }}>01</div>
            <h2 className="font-serif font-light mb-3" style={{ fontSize: 20, color: '#1C3A2E' }}>Overview</h2>
            <p className="text-sm leading-relaxed" style={{ color: '#6B5B4E' }}>
              StackWise ("we", "us", "our") provides a personalized supplement guidance service. This Privacy Policy explains what information we collect, how we use it, and your rights. We collect only what we need, we do not sell your data, and we give you control over what you share.
            </p>
          </div>

          <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid #E8E0D5' }}>
            <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9C8E84' }}>02</div>
            <h2 className="font-serif font-light mb-3" style={{ fontSize: 20, color: '#1C3A2E' }}>Information we collect</h2>
            <p className="text-sm font-semibold mb-2 text-forest">Information you provide directly</p>
            <ul className="space-y-1.5 mb-4">
              {[
                'Email address - collected when you save your stack or set up reminders. Entirely optional.',
                'Display name - your first name, if you choose to provide it. Optional.',
                'Quiz answers - age range, biological sex, height, weight, health goals, symptoms, health background, medications, diet preferences, and budget. Used only to generate your supplement guidance.',
                'Check-in notes - optional mood and notes added in the Dashboard.',
                'Chat messages - processed in real time to generate responses. Not stored on our servers beyond the active session.',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm" style={{ color: '#6B5B4E' }}>
                  <span className="text-moss font-bold flex-shrink-0 mt-0.5">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm font-semibold mb-2 text-forest">Information collected automatically</p>
            <ul className="space-y-1.5 mb-4">
              {[
                'Session token - an anonymous identifier in localStorage that links your device to your account. Required for the app to function.',
                'Browser timezone - collected when you set a reminder, used only to send your email at the correct local time.',
                'Saved stack data - if you create an account, a copy of your stack is stored on our servers.',
                "Check-in history - stored in your browser's localStorage only.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm" style={{ color: '#6B5B4E' }}>
                  <span className="text-moss font-bold flex-shrink-0 mt-0.5">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="rounded-xl px-4 py-3" style={{ background: '#F0F5F2', border: '1px solid #D4E8DA' }}>
              <p className="text-xs leading-relaxed" style={{ color: '#4A7C59' }}>
                <strong>Health data:</strong> Your quiz answers may include health background information. We use this only to generate your supplement guidance. We do not sell, share, or use it for advertising.
              </p>
            </div>
          </div>

          <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid #E8E0D5' }}>
            <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9C8E84' }}>03</div>
            <h2 className="font-serif font-light mb-3" style={{ fontSize: 20, color: '#1C3A2E' }}>How we use your information</h2>
            <ul className="space-y-1.5">
              {[
                'Generate your personalized supplement plan - quiz answers are sent to Google Gemini AI API. Google processes this under their terms.',
                'Send daily reminder emails - if you set a reminder, we use your email and timezone to email your supplement schedule.',
                'Send magic link sign-in emails - if you save your stack, we email you a one-click sign-in link.',
                'Maintain your account - email, display name, and saved stack stored so you can access your plan across devices.',
                'Verify subscription entitlements - we record your subscription status, verified through PayPal.',
                'Protect the service - session tokens and rate limiting prevent abuse.',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm" style={{ color: '#6B5B4E' }}>
                  <span className="text-moss font-bold flex-shrink-0 mt-0.5">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid #E8E0D5' }}>
            <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9C8E84' }}>04</div>
            <h2 className="font-serif font-light mb-3" style={{ fontSize: 20, color: '#1C3A2E' }}>Third-party services</h2>
            <p className="text-sm mb-4" style={{ color: '#6B5B4E' }}>Each of the following has its own privacy policy which governs their processing of your data.</p>
            <div className="space-y-2">
              {[
                { name: 'Google Gemini API', use: 'AI processing for stack generation and chat. Your quiz inputs and messages are sent to Google.', url: 'https://policies.google.com/privacy' },
                { name: 'PayPal', use: 'Subscription billing. PayPal handles all payment data - we never see your card or bank details. PayPal may set cookies.', url: 'https://www.paypal.com/us/legalhub/privacy-full' },
                { name: 'Resend', use: 'Email delivery for sign-in links and daily reminders.', url: 'https://resend.com/privacy' },
                { name: 'Amazon / iHerb', use: "Affiliate buy links in your results. Clicking these may set affiliate cookies on those retailers' sites.", url: 'https://affiliate-program.amazon.com' },
              ].map((tp) => (
                <div key={tp.name} className="rounded-xl p-3" style={{ background: '#FDFCFA', border: '1px solid #E8E0D5' }}>
                  <div className="font-semibold text-sm text-forest mb-0.5">{tp.name}</div>
                  <p className="text-xs leading-relaxed mb-1" style={{ color: '#6B5B4E' }}>{tp.use}</p>
                  <a href={tp.url} target="_blank" rel="noopener noreferrer" className="text-xs text-moss underline">Privacy policy →</a>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid #E8E0D5' }}>
            <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9C8E84' }}>05</div>
            <h2 className="font-serif font-light mb-3" style={{ fontSize: 20, color: '#1C3A2E' }}>Data storage and retention</h2>
            <div className="space-y-3 text-sm" style={{ color: '#6B5B4E' }}>
              <p>Most of your data - quiz results, stack, check-in history - lives in your browser's localStorage. It is not sent to our servers unless you save your stack to an account.</p>
              <p>If you create an account, we store your email, display name, saved stack, and subscription status on a secured server. We retain this while your account is active.</p>
              <p>Magic link tokens expire in 15 minutes. Check-in tokens expire after 36 hours. Expired tokens are deleted regularly.</p>
            </div>
          </div>

          <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid #E8E0D5' }}>
            <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9C8E84' }}>06</div>
            <h2 className="font-serif font-light mb-3" style={{ fontSize: 20, color: '#1C3A2E' }}>Your rights</h2>
            <ul className="space-y-1.5 mb-4">
              {[
                "Access - email us and we'll send you a copy of the data we hold.",
                "Deletion - email us and we'll remove your account and server-side data within 30 days.",
                'Opt out of emails - use the unsubscribe link in any reminder email, or turn off reminders in the Dashboard.',
                'Correction - contact us to update your email or display name.',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm" style={{ color: '#6B5B4E' }}>
                  <span className="text-moss font-bold flex-shrink-0 mt-0.5">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm" style={{ color: '#6B5B4E' }}>
              If you are in the EEA (GDPR) or California (CCPA), you may have additional rights. Contact us at{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-moss underline">{CONTACT_EMAIL}</a>.
            </p>
          </div>

          <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid #E8E0D5' }}>
            <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9C8E84' }}>07</div>
            <h2 className="font-serif font-light mb-3" style={{ fontSize: 20, color: '#1C3A2E' }}>Cookies and local storage</h2>
            <p className="text-sm leading-relaxed" style={{ color: '#6B5B4E' }}>
              StackWise uses browser localStorage - not cookies - to store your session, preferences, and quiz data. We do not set advertising or tracking cookies. The PayPal SDK on our pricing page may set its own cookies. Blocking those may prevent checkout from working.
            </p>
          </div>

          <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid #E8E0D5' }}>
            <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9C8E84' }}>08</div>
            <h2 className="font-serif font-light mb-3" style={{ fontSize: 20, color: '#1C3A2E' }}>Children's privacy</h2>
            <p className="text-sm leading-relaxed" style={{ color: '#6B5B4E' }}>
              StackWise is intended for users 18 and older. We do not knowingly collect data from anyone under 18. Contact us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-moss underline">{CONTACT_EMAIL}</a> if you believe we have done so.
            </p>
          </div>

          <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid #E8E0D5' }}>
            <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9C8E84' }}>09</div>
            <h2 className="font-serif font-light mb-3" style={{ fontSize: 20, color: '#1C3A2E' }}>Changes to this policy</h2>
            <p className="text-sm leading-relaxed" style={{ color: '#6B5B4E' }}>
              We may update this policy from time to time. When we do, we will update the date at the top. For significant changes, we will notify users with accounts via email.
            </p>
          </div>

          <div className="rounded-2xl p-5" style={{ background: '#1C3A2E' }}>
            <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(249,246,241,0.45)' }}>10</div>
            <h2 className="font-serif font-light mb-2" style={{ fontSize: 20, color: '#F9F6F1' }}>Contact us</h2>
            <p className="text-sm leading-relaxed mb-3" style={{ color: 'rgba(249,246,241,0.75)' }}>Questions, data requests, or privacy concerns?</p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-block text-sm font-semibold px-5 py-2.5 rounded-full transition-opacity hover:opacity-90"
              style={{ background: '#F9F6F1', color: '#1C3A2E' }}
            >
              {CONTACT_EMAIL}
            </a>
            <p className="text-xs mt-3" style={{ color: 'rgba(249,246,241,0.4)' }}>We aim to respond within 5 business days.</p>
          </div>

        </div>
      </div>
    </div>
  );
}
