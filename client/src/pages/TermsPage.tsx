import { useNavigate } from 'react-router-dom';

const LAST_UPDATED = 'April 2025';
const CONTACT_EMAIL = 'healthpro@stackdsup.com'; // <- replace with your support email
const JURISDICTION = 'California, United States'; // <- replace with your jurisdiction

export default function TermsPage() {
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
            Terms of Service
          </h1>
          <p className="text-xs" style={{ color: '#9C8E84' }}>Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="space-y-5">

          <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid #E8E0D5' }}>
            <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9C8E84' }}>01</div>
            <h2 className="font-serif font-light mb-3" style={{ fontSize: 20, color: '#1C3A2E' }}>Acceptance of terms</h2>
            <p className="text-sm leading-relaxed" style={{ color: '#6B5B4E' }}>
              By accessing or using StackWise, you agree to these Terms of Service and our Privacy Policy. If you do not agree, do not use the service. Continued use after changes are posted constitutes acceptance.
            </p>
          </div>

          <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid #E8E0D5' }}>
            <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9C8E84' }}>02</div>
            <h2 className="font-serif font-light mb-3" style={{ fontSize: 20, color: '#1C3A2E' }}>Eligibility</h2>
            <p className="text-sm leading-relaxed" style={{ color: '#6B5B4E' }}>
              You must be at least 18 years old to use StackWise. By using the service, you represent and warrant that you are 18 or older. We strongly encourage consulting a qualified healthcare professional before acting on any recommendations.
            </p>
          </div>

          <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid #E8E0D5' }}>
            <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9C8E84' }}>03</div>
            <h2 className="font-serif font-light mb-3" style={{ fontSize: 20, color: '#1C3A2E' }}>Educational use only - not medical advice</h2>
            <p className="text-sm leading-relaxed mb-3" style={{ color: '#6B5B4E' }}>
              StackWise provides AI-generated supplement guidance for educational and informational purposes only. Nothing constitutes medical advice, diagnosis, treatment, or a substitute for professional medical consultation.
            </p>
            <p className="text-sm leading-relaxed mb-3" style={{ color: '#6B5B4E' }}>StackWise does not and cannot:</p>
            <ul className="space-y-1.5 mb-3">
              {[
                'Diagnose any health condition',
                'Prescribe or recommend medications',
                'Replace the advice of a licensed physician, dietitian, or other healthcare provider',
                'Guarantee any specific health outcome',
                'Detect nutrient deficiencies',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm" style={{ color: '#6B5B4E' }}>
                  <span className="text-moss font-bold flex-shrink-0 mt-0.5">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="rounded-xl px-4 py-3" style={{ background: '#FDF6EE', border: '1px solid #F0D9BE' }}>
              <p className="text-xs leading-relaxed font-semibold" style={{ color: '#8A5C2E' }}>
                Always consult a qualified healthcare professional before starting, stopping, or changing any supplement regimen - especially if you take prescription medications or have a medical condition.
              </p>
            </div>
          </div>

          <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid #E8E0D5' }}>
            <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9C8E84' }}>04</div>
            <h2 className="font-serif font-light mb-3" style={{ fontSize: 20, color: '#1C3A2E' }}>AI-generated content</h2>
            <p className="text-sm leading-relaxed mb-3" style={{ color: '#6B5B4E' }}>
              StackWise uses AI (Google Gemini) to generate recommendations and responses. AI-generated content may contain errors or inaccuracies and is not reviewed by a licensed professional before delivery.
            </p>
            <p className="text-sm leading-relaxed" style={{ color: '#6B5B4E' }}>
              You are solely responsible for evaluating the appropriateness of any recommendation for your situation.
            </p>
          </div>

          <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid #E8E0D5' }}>
            <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9C8E84' }}>05</div>
            <h2 className="font-serif font-light mb-3" style={{ fontSize: 20, color: '#1C3A2E' }}>Subscriptions and billing</h2>
            <p className="text-sm leading-relaxed mb-3" style={{ color: '#6B5B4E' }}>
              Paid plans (Basic and Pro) are billed monthly through PayPal. By subscribing, you authorize recurring charges.
            </p>
            <ul className="space-y-1.5 mb-3">
              {[
                'Subscriptions renew automatically each month until cancelled.',
                'Cancel any time through your PayPal account. Access continues until end of billing period.',
                'No partial refunds for unused time, except under the 30-day guarantee below.',
                'We reserve the right to modify pricing with reasonable advance notice.',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm" style={{ color: '#6B5B4E' }}>
                  <span className="text-moss font-bold flex-shrink-0 mt-0.5">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm leading-relaxed" style={{ color: '#6B5B4E' }}>
              <strong className="text-forest">To cancel:</strong> PayPal account → Settings → Payments → Manage pre-approved payments → StackWise → Cancel.
            </p>
          </div>

          <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid #E8E0D5' }}>
            <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9C8E84' }}>06</div>
            <h2 className="font-serif font-light mb-3" style={{ fontSize: 20, color: '#1C3A2E' }}>30-day money-back guarantee</h2>
            <p className="text-sm leading-relaxed mb-3" style={{ color: '#6B5B4E' }}>
              If you are not satisfied within the first 30 days of your initial purchase, email{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-moss underline">{CONTACT_EMAIL}</a>{' '}
              with subject "Refund request" and your PayPal email. We will process your refund within 5 business days.
            </p>
            <p className="text-sm leading-relaxed" style={{ color: '#6B5B4E' }}>
              This applies to first-time subscribers only. One refund per user.
            </p>
          </div>

          <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid #E8E0D5' }}>
            <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9C8E84' }}>07</div>
            <h2 className="font-serif font-light mb-3" style={{ fontSize: 20, color: '#1C3A2E' }}>Account and data</h2>
            <p className="text-sm leading-relaxed mb-3" style={{ color: '#6B5B4E' }}>
              You are responsible for maintaining the security of your account access. Notify us immediately if you believe your account has been compromised.
            </p>
            <p className="text-sm leading-relaxed" style={{ color: '#6B5B4E' }}>
              If you request data deletion, we will remove your server-side data within 30 days. Browser data can be deleted by clearing your browser's local storage.
            </p>
          </div>

          <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid #E8E0D5' }}>
            <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9C8E84' }}>08</div>
            <h2 className="font-serif font-light mb-3" style={{ fontSize: 20, color: '#1C3A2E' }}>Acceptable use</h2>
            <p className="text-sm leading-relaxed mb-2" style={{ color: '#6B5B4E' }}>You agree not to:</p>
            <ul className="space-y-1.5">
              {[
                'Circumvent rate limits, credit limits, or paywalls through technical means',
                'Use the service to generate content for resale without our permission',
                'Provide false health information that could compromise AI guidance safety',
                'Use automated tools to access the service at scale',
                'Attempt to reverse-engineer the underlying AI system prompts',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm" style={{ color: '#6B5B4E' }}>
                  <span className="text-moss font-bold flex-shrink-0 mt-0.5">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid #E8E0D5' }}>
            <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9C8E84' }}>09</div>
            <h2 className="font-serif font-light mb-3" style={{ fontSize: 20, color: '#1C3A2E' }}>Limitation of liability</h2>
            <p className="text-sm leading-relaxed mb-3" style={{ color: '#6B5B4E' }}>
              To the maximum extent permitted by law, StackWise shall not be liable for any indirect, incidental, special, consequential, or punitive damages including loss of health, bodily injury, or financial loss arising from your use of or reliance on StackWise.
            </p>
            <p className="text-sm leading-relaxed" style={{ color: '#6B5B4E' }}>
              Our total liability for any claim shall not exceed the amount you paid us in the 30 days preceding the claim.
            </p>
          </div>

          <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid #E8E0D5' }}>
            <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9C8E84' }}>10</div>
            <h2 className="font-serif font-light mb-3" style={{ fontSize: 20, color: '#1C3A2E' }}>Disclaimer of warranties</h2>
            <p className="text-sm leading-relaxed" style={{ color: '#6B5B4E' }}>
              StackWise is provided "as is" without warranties of any kind. We do not warrant that AI-generated recommendations will be accurate, complete, or suitable for your circumstances. These statements have not been evaluated by the FDA. Supplement recommendations are not intended to diagnose, treat, cure, or prevent any disease.
            </p>
          </div>

          <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid #E8E0D5' }}>
            <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9C8E84' }}>11</div>
            <h2 className="font-serif font-light mb-3" style={{ fontSize: 20, color: '#1C3A2E' }}>Governing law</h2>
            <p className="text-sm leading-relaxed" style={{ color: '#6B5B4E' }}>
              These terms are governed by the laws of {JURISDICTION}. Any disputes shall be resolved in the courts of that jurisdiction. If any provision is found unenforceable, the remaining provisions continue in full force.
            </p>
          </div>

          <div className="rounded-2xl p-5" style={{ background: '#1C3A2E' }}>
            <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(249,246,241,0.45)' }}>12</div>
            <h2 className="font-serif font-light mb-2" style={{ fontSize: 20, color: '#F9F6F1' }}>Questions</h2>
            <p className="text-sm leading-relaxed mb-3" style={{ color: 'rgba(249,246,241,0.75)' }}>
              Questions, refund requests, or account deletion?
            </p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-block text-sm font-semibold px-5 py-2.5 rounded-full transition-opacity hover:opacity-90"
              style={{ background: '#F9F6F1', color: '#1C3A2E' }}
            >
              {CONTACT_EMAIL}
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}
