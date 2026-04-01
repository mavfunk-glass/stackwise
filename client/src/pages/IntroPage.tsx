import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestMagicLink } from '../api/session';
import StackyCat from '../components/StackyCat';
import { ensureCurrentStackFromProfile, hasSavedStackAvailable } from '../types/storage';

export default function IntroPage() {
  const navigate = useNavigate();
  const [showSignIn, setShowSignIn] = useState(false);
  const [signInEmail, setSignInEmail] = useState('');
  const [signInStatus, setSignInStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function handleSignIn() {
    if (!signInEmail.includes('@')) return;
    setSignInStatus('sending');
    const res = await requestMagicLink(signInEmail.trim());
    setSignInStatus(res.ok ? 'sent' : 'error');
  }

  const canSkipToStack = hasSavedStackAvailable();
  const goCoach = () => {
    if (ensureCurrentStackFromProfile()) navigate('/coach');
    else navigate('/quiz');
  };

  return (
    <div className="min-h-screen bg-cream text-warm font-body">
      <nav
        className="sticky top-0 z-50 border-b border-stone px-5"
        style={{
          background: 'rgba(249,246,241,0.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 6px)',
          paddingBottom: 6,
        }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between min-h-[36px]">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="font-serif font-light tracking-widest text-sm text-forest"
            style={{ letterSpacing: '0.15em' }}
          >
            STACKWISE
          </button>
          <button
            type="button"
            onClick={() => navigate('/landing')}
            className="hidden md:inline-flex rounded-xl bg-forest text-cream px-4 py-2 text-sm font-semibold hover:bg-forest-light transition-colors focus:outline-none focus:ring-2 focus:ring-moss/50"
          >
            Continue →
          </button>
        </div>
      </nav>

      {canSkipToStack && (
        <div className="border-b border-sage/25 bg-[#F0F5F2] px-4 py-3">
          <div className="max-w-6xl mx-auto flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs sm:text-sm text-forest leading-snug pr-2">
              You already have a saved stack. Skip the quiz and open Stack Hub to talk to Stacky about timing, your plan, and what you take.
            </p>
            <button
              type="button"
              onClick={goCoach}
              className="shrink-0 rounded-xl bg-forest px-4 py-2.5 text-xs font-semibold text-on-dark-primary hover:bg-forest-light transition-colors"
            >
              Skip quiz · Stack Hub
            </button>
          </div>
        </div>
      )}

      <section className="max-w-6xl mx-auto px-4 pt-12 pb-10">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest mb-4 px-3 py-1.5 rounded-full" style={{ background: '#F0F5F2', color: '#4A7C59', border: '1px solid #D4E8DA' }}>
            Supplement clarity · personalized support
          </div>

          <p className="text-sm font-semibold text-center max-w-lg mx-auto mb-5 leading-snug px-1" style={{ color: '#1C3A2E' }}>
            StackWise is a supplement clarity platform that helps people build a personalized stack, understand why it fits, and get ongoing support as their routine evolves.
          </p>

          <div className="flex justify-center mb-8">
            <StackyCat mood="wave" size={120} bubble="Hey! I'm Stacky 🐾 I will walk you through the quiz, then support your stack as your routine evolves." bubblePosition="top" />
          </div>

          <h1 className="font-serif mb-5" style={{ fontSize: 'clamp(36px, 7vw, 54px)', color: '#1C3A2E', letterSpacing: '-0.02em', lineHeight: 1.08, fontWeight: 300, fontStyle: 'italic' }}>
            Stop guessing with supplements.
            <br />
            <em style={{ color: '#4A7C59' }}>Build a stack that fits your goals, routine, and budget, then get ongoing guidance as it evolves.</em>
          </h1>

          <p className="text-base leading-relaxed mb-8 max-w-xl mx-auto" style={{ color: '#6B5B4E' }}>
            A short quiz becomes a personalized starting plan: what fits your goals, routine, and budget, with clear reasoning. Stacky stays with you for follow-ups when the shelf gets confusing or your goals change.
          </p>

          <div className="space-y-3 text-left">
            <div className="flex items-start gap-2.5 text-sm" style={{ color: '#3D2E22' }}>
              <span style={{ color: '#4A7C59', fontWeight: 700, flexShrink: 0 }}>+</span>
              <span>Built around your goals and real life, not whatever ads and influencers pushed last week.</span>
            </div>
            <div className="flex items-start gap-2.5 text-sm" style={{ color: '#3D2E22' }}>
              <span style={{ color: '#4A7C59', fontWeight: 700, flexShrink: 0 }}>+</span>
              <span>Clear reasoning for every recommendation, so you understand what you&apos;re taking and why.</span>
            </div>
            <div className="flex items-start gap-2.5 text-sm" style={{ color: '#3D2E22' }}>
              <span style={{ color: '#4A7C59', fontWeight: 700, flexShrink: 0 }}>+</span>
              <span>Stacky stays in your corner as your goals and routine change, so the plan can grow with you.</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 items-stretch sm:flex-row sm:items-center sm:justify-center mt-8">
            <button
              type="button"
              onClick={() => navigate('/landing')}
              style={{ minHeight: 56 }}
              className="bg-forest text-cream font-semibold px-8 py-4 rounded-full text-base sm:text-lg active:scale-[0.98] transition-all duration-150 shadow-[0_8px_28px_rgba(28,58,46,0.22)] hover:bg-forest-light"
            >
              Build my stack, free →
            </button>
            <button
              type="button"
              onClick={() => navigate('/pricing')}
              className="border border-stone bg-white px-7 py-3.5 rounded-xl font-semibold text-warm-mid hover:border-forest hover:text-forest transition-colors"
            >
              Compare plans →
            </button>
          </div>

          <p className="text-warm-light text-xs mt-4">
            No account required. Free to start.{' '}
            <button
              type="button"
              onClick={() => setShowSignIn((v) => !v)}
              className="underline hover:text-forest transition-colors"
            >
              Already have a stack? Sign in →
            </button>
          </p>

          {showSignIn && (
            <div
              className="mt-4 rounded-2xl p-4 text-left"
              style={{ background: '#FFFFFF', border: '1px solid #E8E0D5', maxWidth: 380, margin: '12px auto 0' }}
            >
              {signInStatus !== 'sent' ? (
                <>
                  <div className="font-semibold text-sm mb-1" style={{ color: '#1C3A2E' }}>
                    Sign in to your account
                  </div>
                  <p className="text-xs mb-3" style={{ color: '#9C8E84' }}>
                    Enter your email and we&apos;ll send you a one-click sign-in link. No password needed.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="your@email.com"
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void handleSignIn();
                      }}
                      className="flex-1 rounded-xl border px-3 py-2.5 text-sm"
                      style={{
                        borderColor: '#E8E0D5',
                        background: '#FDFCFA',
                        color: '#3D2E22',
                        fontFamily: 'Figtree, system-ui, sans-serif',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => void handleSignIn()}
                      disabled={signInStatus === 'sending' || !signInEmail.includes('@')}
                      className="rounded-xl font-semibold text-xs px-4 transition-all"
                      style={{
                        background: signInEmail.includes('@') ? '#1C3A2E' : '#E8E0D5',
                        color: signInEmail.includes('@') ? '#F9F6F1' : '#9C8E84',
                        minHeight: 44,
                        opacity: signInStatus === 'sending' ? 0.6 : 1,
                      }}
                    >
                      {signInStatus === 'sending' ? '…' : 'Send →'}
                    </button>
                  </div>
                  {signInStatus === 'error' && (
                    <p className="text-xs mt-2" style={{ color: '#E05050' }}>
                      Something went wrong. Please try again.
                    </p>
                  )}
                </>
              ) : (
                <div>
                  <div className="font-semibold text-sm mb-1" style={{ color: '#1C3A2E' }}>
                    Check your email
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: '#4A7C59' }}>
                    We sent a sign-in link to <strong>{signInEmail}</strong>. Click it to restore your stack. Link expires in
                    15 minutes.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <footer className="border-t border-stone px-6 py-8" style={{ paddingBottom: 'max(32px, env(safe-area-inset-bottom, 32px))' }}>
        <div className="max-w-6xl mx-auto px-4 py-7 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="font-serif font-light tracking-widest text-sm text-forest" style={{ letterSpacing: '0.15em' }}>
            STACKWISE
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:gap-5 text-sm text-warm-mid">
            <div className="flex items-center gap-5">
              <button type="button" onClick={() => navigate('/landing')} className="hover:text-forest transition-colors">
                Build my stack
              </button>
              <button type="button" onClick={() => navigate('/pricing')} className="hover:text-forest transition-colors">
                Pricing
              </button>
              <button type="button" onClick={() => navigate('/privacy')} className="hover:text-forest transition-colors">
                Privacy
              </button>
              <button type="button" onClick={() => navigate('/terms')} className="hover:text-forest transition-colors">
                Terms
              </button>
            </div>
            <div className="mt-2 md:mt-0 text-xs text-warm-mid">
              Questions? Contact us at{' '}
              <a href="mailto:healthpro@stackdsup.com" className="underline hover:text-forest transition-colors">
                healthpro@stackdsup.com
              </a>
            </div>
          </div>
          <div className="text-xs text-warm-light">(c) {new Date().getFullYear()} StackWise</div>
        </div>
        <div className="max-w-3xl mx-auto px-4 pt-2 pb-2 text-center border-t border-stone/60">
          <p className="text-[10px] sm:text-[11px] leading-relaxed text-warm-light/90 mx-auto max-w-[52rem]">
            StackWise helps you compare and choose supplements; it does not replace sleep, movement, balanced eating, or care
            from a qualified professional. Supplements can support a routine but should not be solely relied on for health
            outcomes. Information here is educational only. Consult your healthcare provider before starting or changing
            supplements, especially if you use medications or have a medical condition.
          </p>
        </div>
      </footer>
    </div>
  );
}

