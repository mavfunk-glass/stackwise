import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import StackyCat from '../components/StackyCat';
import {
  ensureCurrentStackFromProfile,
  getSubscriptionTier,
  hasSavedStackAvailable,
} from '../types/storage';

// ─── MOCK STACKY CONVERSATION ───────────────────────────────────────────────
// Shown in the Stacky demo section to illustrate product value
const STACKY_DEMO = [
  {
    role: 'user',
    text: "I keep grabbing new supplements when I'm stressed. How do I know if something fits before I waste more money?",
  },
  {
    role: 'coach',
    text: "That is really common. Before checkout, ask: does it overlap what you already take, match one of your goals, and fit your budget?\n\nIf two of those feel fuzzy, pause. Stacky can help you compare it to your current stack in plain language, so you buy with more confidence and waste less.",
  },
  {
    role: 'user',
    text: 'What do you mean by overlap?',
  },
  {
    role: 'coach',
    text: 'Usually two things, duplicated ingredients across products, or combinations that make your routine harder to stick with.\n\nShare what you are comparing and Stacky can help you decide what fits now, what can wait, and what to skip.',
  },
];

// ─── ANIMATED STACKY DEMO ───────────────────────────────────────────────────
function StackyDemo() {
  const [visibleMessages, setVisibleMessages] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visibleMessages >= STACKY_DEMO.length) return;

    const delay = visibleMessages === 0 ? 800 : 1400;
    const timer = window.setTimeout(() => {
      if (STACKY_DEMO[visibleMessages].role === 'coach') {
        setIsTyping(true);
        window.setTimeout(() => {
          setIsTyping(false);
          setVisibleMessages((v) => v + 1);
          window.setTimeout(() => {
            containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' });
          }, 100);
        }, 1800);
      } else {
        setVisibleMessages((v) => v + 1);
        window.setTimeout(() => {
          containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' });
        }, 100);
      }
    }, delay);

    return () => window.clearTimeout(timer);
  }, [visibleMessages]);

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{ border: '1px solid #E8E0D5', background: '#FFFFFF', maxHeight: 420 }}
    >
      {/* Chat header, matches live ChatWidget (forest gradient + Stacky mascot) */}
      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0 bg-gradient-to-r from-forest to-forest-light border-b border-white/10"
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden bg-cream/15 border border-cream/25"
        >
          <StackyCat mood="wave" size={34} />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold text-on-dark-primary">Stacky</div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-moss animate-pulse shrink-0" />
            <span className="text-[10px] sm:text-xs text-on-dark-muted truncate">
              StackWise · clarity · your goals
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-cream">
        {STACKY_DEMO.slice(0, visibleMessages).map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'coach' && (
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-0.5 overflow-hidden bg-forest border border-moss/80">
                <StackyCat mood="think" size={26} />
              </div>
            )}
            <div
              className="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-line border border-stone/80"
              style={
                msg.role === 'user'
                  ? { background: 'linear-gradient(135deg, #1C3A2E, #2D5242)', color: '#F9F6F1', borderBottomRightRadius: 4, borderColor: 'transparent' }
                  : { background: '#FDFCFA', color: '#3D2E22', borderBottomLeftRadius: 4 }
              }
            >
              {msg.text}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mr-2 overflow-hidden bg-forest border border-moss/80">
              <StackyCat mood="think" size={26} />
            </div>
            <div className="flex items-center gap-1 rounded-2xl px-4 py-3 border border-stone bg-cream/60">
              {[0, 150, 300].map((d) => (
                <span
                  key={d}
                  className="w-1.5 h-1.5 rounded-full animate-bounce"
                  style={{ background: '#4A7C59', animationDelay: `${d}ms` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Locked input, same placeholder tone as live ChatWidget */}
      <div className="px-3 py-2.5 flex items-center gap-2 flex-shrink-0 border-t border-stone bg-white">
        <div className="flex-1 rounded-xl px-3 py-2 text-xs bg-cream/70 text-warm-light border border-cream-dark/60">
          Ask Stacky about your stack… 🐾
        </div>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-forest text-cream text-sm font-semibold">
          →
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ──────────────────────────────────────────────────────────────
export default function LandingPageRebuild() {
  const navigate = useNavigate();
  const tier = getSubscriptionTier();
  const canSkipToStack = hasSavedStackAvailable();

  const goResults = () => {
    if (ensureCurrentStackFromProfile()) navigate('/results');
    else navigate('/quiz');
  };
  const goCoachFromLanding = () => {
    if (ensureCurrentStackFromProfile()) navigate('/coach');
    else navigate('/quiz');
  };

  const GOALS = [
    { icon: '🔥', label: 'Fat Loss' },
    { icon: '💪', label: 'Muscle & Strength' },
    { icon: '🫧', label: 'Gut Health' },
    { icon: '⚡', label: 'Energy & Focus' },
    { icon: '🧠', label: 'Brain' },
    { icon: '😴', label: 'Sleep' },
    { icon: '🌿', label: 'Hormones' },
    { icon: '🌸', label: 'Menopause' },
    { icon: '🛡️', label: 'Longevity' },
    { icon: '💇', label: 'Hair Growth' },
    { icon: '✨', label: 'Skin & Glow' },
    { icon: '🪞', label: 'Confidence' },
  ];

  const TESTIMONIALS = [
    {
      quote:
        'I used to buy supplements based on whatever sounded good that week. StackWise gave me a plan that matched my goals and I finally understood why each thing was there.',
      name: 'Sarah M.',
      goal: 'Daily wellness',
      result: 'Clearer decisions',
    },
    {
      quote:
        'What I liked most was the reasoning. My stack felt less random and easier to stick with.',
      name: 'Marcus T.',
      goal: 'Training & recovery',
      result: 'More confidence',
    },
    {
      quote:
        'The ongoing support sold me. I could ask follow-ups and sanity-check new products before I bought more stuff I did not need.',
      name: 'James K.',
      goal: 'Recovery',
      result: 'Less trial and error',
    },
    {
      quote:
        'I had already spent too much on things that did not fit what I was trying to do. This helped me simplify and avoid impulse adds.',
      name: 'Jessica R.',
      goal: 'Gut health',
      result: 'Less wasted spend',
    },
    {
      quote:
        'It feels like a system I can keep using as life changes, not a one-off list I forget about.',
      name: 'Priya N.',
      goal: 'Stress & sleep',
      result: 'Easier to stay consistent',
    },
  ];

  const COMPARISON = [
    { feature: 'Personalized to your goals and routine', trialError: '✗', generic: '✗', stackwise: '✓' },
    { feature: 'Clear reasoning behind every recommendation', trialError: '✗', generic: '✗', stackwise: '✓' },
    { feature: 'Available whenever you have questions', trialError: '✗', generic: '✗', stackwise: '✓' },
    { feature: 'Updates as your goals change', trialError: '✗', generic: '✗', stackwise: '✓' },
    { feature: 'Helps you evaluate new additions', trialError: '✗', generic: '✗', stackwise: '✓' },
    { feature: 'Monthly cost', trialError: 'Wasted spending', generic: 'Free (but wrong)', stackwise: '$9-19' },
  ];

  const HOW_STEPS = [
    {
      n: '01',
      title: 'Tell us about you',
      body: 'Share your goals, routine, preferences, and budget. Add health context if relevant. Takes under 90 seconds.',
    },
    {
      n: '02',
      title: 'Stacky builds your plan',
      body: 'Get a personalized starting stack with clear reasoning: what fits, why it fits, and how it fits your day.',
    },
    {
      n: '03',
      title: 'Buy with one tap',
      body: 'Use direct Amazon and iHerb links. Skip random buying and keep spending aligned with your budget.',
    },
    {
      n: '04',
      title: 'Stacky stays with you',
      body: 'Ask when labels blur or a new ad sounds too good. Adjust your plan as goals change: clearer guidance, not pressure to buy more.',
    },
  ];

  return (
    <div className="min-h-screen font-sans bg-cream text-warm">
      {/* ─── NAV ─────────────────────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-50 px-5 border-b border-stone"
        style={{
          background: 'rgba(249,246,241,0.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 6px)',
          paddingBottom: 6,
        }}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between min-h-[36px]">
          <span className="font-serif font-light tracking-widest text-sm" style={{ color: '#1C3A2E', letterSpacing: '0.15em' }}>
            STACKWISE
          </span>

          <div className="hidden sm:flex items-center gap-6">
            {canSkipToStack && (
              <button
                onClick={goCoachFromLanding}
                className="text-sm font-semibold transition-colors"
                style={{ color: '#1C3A2E' }}
                type="button"
              >
                Skip quiz · Stacky
              </button>
            )}
            <button onClick={() => navigate('/pricing')} className="text-sm font-medium transition-colors" style={{ color: '#6B5B4E' }} type="button">
              Pricing
            </button>
            {canSkipToStack && (
              <button onClick={goResults} className="text-sm font-medium" style={{ color: '#6B5B4E' }} type="button">
                My Stack
              </button>
            )}
            {tier !== 'free' && (
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: '#F0F5F2', color: '#1C3A2E', border: '1px solid #D4E8DA' }}
              >
                {tier.toUpperCase()} Active
              </span>
            )}
            <button
              onClick={() => navigate('/quiz')}
              className="rounded-full font-semibold text-sm px-4 h-9 transition-transform active:scale-95"
              style={{ background: '#1C3A2E', color: '#F9F6F1' }}
              type="button"
            >
              Build my stack
            </button>
          </div>

          <div className="sm:hidden flex items-center gap-2">
            {canSkipToStack && (
              <button
                onClick={goCoachFromLanding}
                className="rounded-full font-semibold text-xs px-3 h-8 border"
                style={{ borderColor: '#E8E0D5', color: '#1C3A2E', background: '#fff' }}
                type="button"
              >
                Stacky
              </button>
            )}
            <button
              onClick={() => navigate('/quiz')}
              className="rounded-full font-semibold text-xs px-3.5 h-8"
              style={{ background: '#1C3A2E', color: '#F9F6F1' }}
              type="button"
            >
              Start Free
            </button>
          </div>
        </div>
      </nav>

      {/* ─── HERO ───────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-5 pt-12 pb-10">
        <div className="max-w-2xl mx-auto text-center">
          <div
            className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-left sm:text-center mb-5 px-4 py-2.5 rounded-2xl shadow-sm max-w-full"
            style={{
              background: '#FFFFFF',
              border: '2px solid #1C3A2E',
              color: '#1C3A2E',
              boxShadow: '0 4px 14px rgba(28, 58, 46, 0.12)',
            }}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0 animate-pulse"
              style={{ background: '#4A7C59' }}
              aria-hidden
            />
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wide leading-snug" style={{ letterSpacing: '0.08em' }}>
              <span style={{ color: '#1C3A2E' }}>StackWise</span>
              <span style={{ color: '#6B5B4E', fontWeight: 600 }}> · </span>
              <span style={{ color: '#2D5242' }}>supplement clarity · personalized support</span>
            </span>
          </div>

          <div className="flex flex-col items-center justify-center mb-7">
            <StackyCat mood="wave" size={120} />
            <span
              className="mt-1 text-[11px] font-bold uppercase tracking-widest"
              style={{ color: '#1C3A2E', letterSpacing: '0.18em' }}
            >
              Stacky
            </span>
          </div>

          <h1
            className="font-serif font-light mb-5"
            style={{
              fontSize: 'clamp(38px, 8vw, 58px)',
              color: '#1C3A2E',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              fontWeight: 300,
              fontStyle: 'italic',
            }}
          >
            Stop guessing with supplements.
            <br />
            <em style={{ color: '#4A7C59' }}>Build a stack that fits your goals, routine, and budget, then get ongoing guidance as it evolves.</em>
          </h1>

          <p className="text-base leading-relaxed mb-8 text-warm-mid max-w-xl mx-auto">
            StackWise is a supplement clarity platform that helps people build a personalized stack, understand why it fits, and get ongoing support as their routine evolves.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/quiz')}
              className="rounded-full font-semibold text-base transition-all active:scale-[0.98]"
              style={{
                background: '#1C3A2E',
                color: '#F9F6F1',
                height: 54,
                paddingLeft: 28,
                paddingRight: 28,
                boxShadow: '0 8px 24px rgba(28,58,46,0.2)',
              }}
              type="button"
            >
              Build my stack →
            </button>
            {canSkipToStack && (
              <button
                onClick={goCoachFromLanding}
                className="rounded-full font-semibold text-base transition-all"
                style={{ height: 54, paddingLeft: 28, paddingRight: 28, border: '1.5px solid #1C3A2E', color: '#1C3A2E', background: 'transparent' }}
                type="button"
              >
                Skip quiz · talk to Stacky
              </button>
            )}
            {canSkipToStack && (
              <button
                onClick={goResults}
                className="rounded-full font-semibold text-base transition-all"
                style={{ height: 54, paddingLeft: 28, paddingRight: 28, border: '1.5px solid #E8E0D5', color: '#6B5B4E', background: 'transparent' }}
                type="button"
              >
                View my stack & schedule
              </button>
            )}
          </div>
          <p className="text-xs mt-4 text-stone-dark">
            Takes about 90 seconds · No account required · Free to start
          </p>
        </div>
      </section>

      {/* ─── STATS BAR ───────────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid #E8E0D5', borderBottom: '1px solid #E8E0D5', background: '#FFFFFF' }}>
        <div className="max-w-5xl mx-auto px-5 py-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {[
              { n: 'Personal', label: 'Built around your goals' },
              { n: 'Clearer', label: 'Less shelf guesswork' },
              { n: 'Ongoing', label: 'Support as things change' },
            ].map(({ n, label }) => (
              <div key={label} className="text-center">
                <div className="font-serif" style={{ fontSize: 20, color: '#1C3A2E', fontWeight: 300, letterSpacing: '-0.01em' }}>
                  {n}
                </div>
                <div className="text-xs mt-0.5" style={{ color: '#9C8E84' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── COACH DEMO ─────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-5 py-14">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#4A7C59', letterSpacing: '0.1em' }}>
              Guidance, not hype
            </div>
            <h2
              className="font-serif font-light mb-4"
              style={{
                fontSize: 'clamp(28px, 5vw, 40px)',
                color: '#1C3A2E',
                letterSpacing: '-0.01em',
                lineHeight: 1.15,
              }}
            >
              Clearer supplement decisions, with support that lasts.
            </h2>
            <p className="text-sm leading-relaxed mb-5" style={{ color: '#6B5B4E' }}>
              Most people waste money on supplements that do not fit their goals, or overlap what they already take. StackWise helps you build a personalized stack, understand the reasoning, and make clearer decisions over time.
            </p>

            <div className="space-y-3 mb-6">
              {[
                { icon: '💬', title: 'Ongoing guidance', sub: 'Ask follow-ups about your stack, timing, and fit when you need it' },
                { icon: '📋', title: 'Clear reasoning', sub: 'See why each item is there and how it supports your goals' },
                { icon: '🔄', title: 'Adapt over time', sub: 'Rebuild and refine your plan as goals and routine change' },
                { icon: '🔍', title: 'Evaluate new additions', sub: 'Sanity-check products before you buy another bottle you do not need' },
                { icon: '⚕️', title: 'Professional care', sub: 'Stacky nudges you toward a clinician when something is medical or uncertain' },
              ].map(({ icon, title, sub }) => (
                <div key={title} className="flex items-start gap-3">
                  <span className="text-lg flex-shrink-0 mt-0.5">{icon}</span>
                  <div>
                    <div className="font-semibold text-sm" style={{ color: '#1C3A2E' }}>{title}</div>
                    <div className="text-xs leading-snug mt-0.5" style={{ color: '#9C8E84' }}>{sub}</div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate('/quiz')}
              className="rounded-full font-semibold text-sm transition-all active:scale-95"
              style={{ background: '#1C3A2E', color: '#F9F6F1', height: 48, paddingLeft: 24, paddingRight: 24 }}
              type="button"
            >
              Build my stack, free →
            </button>
          </div>

          <div>
            <StackyDemo />
            <p className="text-xs text-center mt-3" style={{ color: '#C4B9AC' }}>
              Example guidance conversation, simplified for clarity
            </p>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ───────────────────────────────────────────── */}
      <section style={{ background: '#FFFFFF', borderTop: '1px solid #E8E0D5', borderBottom: '1px solid #E8E0D5' }}>
        <div className="max-w-5xl mx-auto px-5 py-14">
          <div className="text-center mb-10">
            <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9C8E84', letterSpacing: '0.1em' }}>
              How it works
            </div>
            <h2 className="font-serif font-light" style={{ fontSize: 'clamp(26px, 5vw, 36px)', color: '#1C3A2E', letterSpacing: '-0.01em' }}>
              From first question to your full plan in 90 seconds.
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {HOW_STEPS.map(({ n, title, body }) => (
              <div key={n} className="relative">
                <div className="font-serif font-light mb-3" style={{ fontSize: 40, color: '#E8E0D5', lineHeight: 1, letterSpacing: '-0.02em' }}>
                  {n}
                </div>
                <div className="font-semibold text-sm mb-2" style={{ color: '#1C3A2E' }}>{title}</div>
                <p className="text-xs leading-relaxed" style={{ color: '#9C8E84' }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── GOALS GRID ────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-5 py-14">
        <div className="text-center mb-8">
          <h2 className="font-serif font-light" style={{ fontSize: 'clamp(26px, 5vw, 36px)', color: '#1C3A2E', letterSpacing: '-0.01em' }}>
            Goals vary. Your plan should fit yours.
          </h2>
          <p className="text-sm mt-2" style={{ color: '#9C8E84' }}>
            Pick what you are working toward. StackWise shapes a stack around it.
          </p>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
          {GOALS.map(({ icon, label }) => (
            <button
              key={label}
              onClick={() => navigate('/quiz')}
              className="rounded-2xl p-3 text-center transition-all active:scale-95"
              style={{ background: '#FFFFFF', border: '1px solid #E8E0D5', minHeight: 72 }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#1C3A2E'; e.currentTarget.style.background = '#F0F5F2'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E8E0D5'; e.currentTarget.style.background = '#FFFFFF'; }}
              type="button"
            >
              <div className="text-2xl mb-1">{icon}</div>
              <div className="text-xs font-medium leading-tight" style={{ color: '#6B5B4E' }}>{label}</div>
            </button>
          ))}
        </div>
      </section>

      {/* ─── COMPARISON ───────────────────────────────────────────── */}
      <section style={{ background: '#FFFFFF', borderTop: '1px solid #E8E0D5', borderBottom: '1px solid #E8E0D5' }}>
        <div className="max-w-5xl mx-auto px-5 py-14">
          <div className="text-center mb-10">
            <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9C8E84', letterSpacing: '0.1em' }}>
              The honest comparison
            </div>
            <h2 className="font-serif font-light" style={{ fontSize: 'clamp(26px, 5vw, 36px)', color: '#1C3A2E', letterSpacing: '-0.01em' }}>
              Less wasted spend. More clarity.
            </h2>
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #E8E0D5' }}>
            <div className="grid grid-cols-4" style={{ background: '#F9F6F1', borderBottom: '1px solid #E8E0D5' }}>
              <div className="p-4 text-xs font-semibold uppercase tracking-widest" style={{ color: '#9C8E84' }} />
              <div className="p-4 text-center text-xs font-semibold" style={{ color: '#9C8E84', borderLeft: '1px solid #E8E0D5' }}>
                Trial and error
              </div>
              <div className="p-4 text-center text-xs font-semibold" style={{ color: '#9C8E84', borderLeft: '1px solid #E8E0D5' }}>
                Google / Reddit
              </div>
              <div className="p-4 text-center text-xs font-semibold" style={{ color: '#1C3A2E', borderLeft: '1px solid #E8E0D5', background: '#F0F5F2' }}>
                StackWise Pro
              </div>
            </div>

            {COMPARISON.map(({ feature, trialError, generic, stackwise }) => {
              const fmt = (v: boolean | string) => {
                if (v === true) return { text: '✓', color: '#4A7C59', weight: 600 };
                if (v === false) return { text: '✗', color: '#E8E0D5', weight: 400 };
                return { text: v as string, color: '#9C8E84', weight: 400 };
              };
              const sw = fmt(stackwise);
              const te = fmt(trialError);
              const gen = fmt(generic);
              return (
                <div key={feature} className="grid grid-cols-4" style={{ borderTop: '1px solid #F0EBE3' }}>
                  <div className="p-3.5 text-xs font-medium" style={{ color: '#6B5B4E' }}>{feature}</div>
                  <div className="p-3.5 text-center text-xs" style={{ color: te.color, fontWeight: te.weight, borderLeft: '1px solid #F0EBE3' }}>
                    {te.text}
                  </div>
                  <div className="p-3.5 text-center text-xs" style={{ color: gen.color, fontWeight: gen.weight, borderLeft: '1px solid #F0EBE3' }}>
                    {gen.text}
                  </div>
                  <div className="p-3.5 text-center text-xs" style={{ color: sw.color, fontWeight: sw.weight, borderLeft: '1px solid #F0EBE3', background: '#F9FCF9' }}>
                    {sw.text}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-center text-xs mt-6 max-w-xl mx-auto leading-relaxed" style={{ color: '#9C8E84' }}>
            <strong style={{ color: '#6B5B4E' }}>Quiz unlocks:</strong> Basic adds LooksMaxxing. Pro adds Peptide Optimization and full peptide education — not included on Basic.
          </p>
        </div>
      </section>

      {/* ─── TESTIMONIALS ───────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-5 py-14">
        <div className="text-center mb-10">
          <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9C8E84', letterSpacing: '0.1em' }}>
            What people say
          </div>
          <h2 className="font-serif font-light" style={{ fontSize: 'clamp(26px, 5vw, 36px)', color: '#1C3A2E', letterSpacing: '-0.01em' }}>
            People who stopped guessing.
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TESTIMONIALS.map(({ quote, name, goal, result: res }) => (
            <div key={name} className="rounded-2xl p-5 flex flex-col" style={{ background: '#FFFFFF', border: '1px solid #E8E0D5' }}>
              <p className="font-serif font-light text-base leading-relaxed flex-1 mb-4" style={{ color: '#3D2E22', fontSize: 15, fontStyle: 'italic' }}>
                &ldquo;{quote}&rdquo;
              </p>
              <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 mb-3 self-start" style={{ background: '#F0F5F2', border: '1px solid #D4E8DA' }}>
                <span style={{ color: '#4A7C59', fontSize: 10 }}>✓</span>
                <span className="text-xs font-semibold" style={{ color: '#1C3A2E' }}>{res}</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm" style={{ color: '#1C3A2E' }}>{name}</div>
                  <div className="text-xs" style={{ color: '#9C8E84' }}>Goal: {goal}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-xs mt-6" style={{ color: '#C4B9AC', lineHeight: 1.6 }}>
          Individual results vary. These experiences reflect personal outcomes and are not guaranteed.<br />
          StackWise provides educational supplement guidance only - not medical advice.
        </p>
      </section>

      {/* ─── PRICING PREVIEW ───────────────────────────────────────── */}
      <section style={{ background: '#1C3A2E', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="max-w-5xl mx-auto px-5 py-14">
          <div className="text-center mb-10">
            <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(249,246,241,0.4)', letterSpacing: '0.1em' }}>
              Simple pricing
            </div>
            <h2 className="font-serif font-light mb-3" style={{ fontSize: 'clamp(28px, 5vw, 40px)', color: '#F9F6F1', letterSpacing: '-0.01em' }}>
              Personalized stack clarity, then ongoing support.
            </h2>
            <p className="text-sm" style={{ color: 'rgba(249,246,241,0.5)' }}>
              Build a stack that fits, keep guidance as your routine evolves.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {[
              {
                name: 'Free',
                price: '$0',
                sub: 'forever',
                features: [
                  'Starter clarity and first recommendations',
                  'Full detail on first supplements',
                  'A few free support questions with Stacky',
                  'Core quiz goals only — LooksMaxxing unlocks on Basic; Peptide Optimization on Pro',
                ],
                cta: 'Start Free',
                action: () => navigate('/quiz'),
                style: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' },
                ctaStyle: { background: 'rgba(255,255,255,0.1)', color: '#F9F6F1', border: '1px solid rgba(255,255,255,0.2)' },
              },
              {
                name: 'Basic',
                price: '$9',
                sub: '/month',
                features: [
                  'Unlocks LooksMaxxing in the quiz (Pro adds Peptide Optimization)',
                  'Personalized stack and practical routine',
                  'Unlimited rebuilds as goals change',
                  'Daily check-ins and reminders',
                  'Spend with more intention over time',
                ],
                cta: 'Get Basic',
                action: () => navigate('/pricing'),
                style: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' },
                ctaStyle: { background: 'rgba(255,255,255,0.1)', color: '#F9F6F1', border: '1px solid rgba(255,255,255,0.2)' },
              },
              {
                name: 'Pro',
                price: '$19',
                sub: '/month',
                badge: 'Best value',
                features: [
                  'Everything in Basic',
                  'Unlocks Peptide Optimization in the quiz + peptide guidance when relevant',
                  'Unlimited guidance for ongoing decisions',
                  'Understand why each recommendation fits',
                  'Name and organize stacks in Stack Hub',
                  'Evaluate new additions before you buy',
                  'Adjust your stack as goals change',
                  'Keep your routine clear as life changes',
                ],
                cta: 'Start Pro',
                action: () => navigate('/pricing'),
                style: { background: '#F9F6F1', border: 'none' },
                ctaStyle: { background: '#1C3A2E', color: '#F9F6F1', border: 'none' },
                highlight: true,
              },
            ].map((plan) => (
              <div key={plan.name} className="rounded-2xl p-5 flex flex-col relative" style={plan.style}>
                {plan.badge && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold px-3 py-1 rounded-full"
                    style={{ background: '#4A7C59', color: '#F9F6F1', whiteSpace: 'nowrap' }}
                  >
                    {plan.badge}
                  </div>
                )}

                <div className="mb-4">
                  <div
                    className="text-xs font-semibold uppercase tracking-widest mb-1"
                    style={{ color: plan.highlight ? '#9C8E84' : 'rgba(249,246,241,0.4)', letterSpacing: '0.08em' }}
                  >
                    {plan.name}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-serif font-light" style={{ fontSize: 36, color: plan.highlight ? '#1C3A2E' : '#F9F6F1' }}>
                      {plan.price}
                    </span>
                    <span className="text-xs" style={{ color: plan.highlight ? '#9C8E84' : 'rgba(249,246,241,0.4)' }}>
                      {plan.sub}
                    </span>
                  </div>
                </div>

                <ul className="space-y-1.5 flex-1 mb-4">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs leading-snug">
                      <span style={{ color: plan.highlight ? '#4A7C59' : 'rgba(249,246,241,0.4)', flexShrink: 0, marginTop: 1 }}>
                        ✓
                      </span>
                      <span style={{ color: plan.highlight ? '#6B5B4E' : 'rgba(249,246,241,0.65)' }}>{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={plan.action}
                  className="w-full rounded-full font-semibold text-sm transition-all active:scale-[0.98]"
                  style={{ ...plan.ctaStyle, height: 44 }}
                  type="button"
                >
                  {plan.cta}
                </button>
                <p className="text-center text-xs mt-2" style={{ color: plan.highlight ? '#C4B9AC' : 'rgba(249,246,241,0.25)' }}>
                  Cancel anytime
                </p>
              </div>
            ))}
          </div>

          <div
            className="max-w-md mx-auto mt-8 rounded-2xl px-5 py-4 flex items-start gap-3"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <span style={{ fontSize: 18, flexShrink: 0 }}>🛡</span>
            <div>
              <div className="font-semibold text-sm mb-1" style={{ color: '#F9F6F1' }}>30-day money-back guarantee</div>
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(249,246,241,0.5)' }}>
                If StackWise does not help you feel clearer and more confident in your supplement decisions within 30 days, email <a href="mailto:healthpro@stackdsup.com" style={{ color: 'rgba(249,246,241,0.55)', textDecoration: 'underline' }}>healthpro@stackdsup.com</a> for a full refund. No questions asked.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOUNDER ───────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-5 py-14 border-t border-stone" style={{ background: '#FDFCFA' }}>
        <div className="max-w-2xl mx-auto text-center sm:text-left">
          <h2 className="font-serif font-light mb-5" style={{ fontSize: 'clamp(24px, 4vw, 32px)', color: '#1C3A2E', letterSpacing: '-0.02em' }}>
            Why I built StackWise
          </h2>
          <div className="space-y-4 text-sm leading-relaxed" style={{ color: '#6B5B4E' }}>
            <p>
              For a long time, I was the person people came to when they wanted help building a supplement stack that
              actually made sense for them. I kept seeing the same pattern: people wanted better sleep, more energy,
              a better mood, and a routine they could actually stick to, but instead they got overwhelmed by too many
              options and too much conflicting advice.
            </p>
            <p className="font-medium" style={{ color: '#1C3A2E' }}>
              Too much noise. Too little clarity.
            </p>
            <p>
              StackWise was built to make that process simpler, to help people make smarter supplement decisions,
              build a stack that fits their life, and feel more confident in what they are taking and why.
            </p>
            <p>
              It is a product I care deeply about getting right, and one I plan to keep improving over time.
            </p>
            <p className="pt-1 font-serif font-light italic" style={{ color: '#1C3A2E' }}>
              Matthew
            </p>
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-5 py-16 text-center">
        <h2
          className="font-serif font-light mb-4"
          style={{ fontSize: 'clamp(30px, 6vw, 46px)', color: '#1C3A2E', letterSpacing: '-0.02em', lineHeight: 1.15 }}
        >
          Stop guessing with supplements.
        </h2>
        <p className="text-base mb-8 max-w-lg mx-auto leading-relaxed" style={{ color: '#6B5B4E' }}>
          Get a stack that fits your goals, routine, and budget, and support that evolves with you. About 90 seconds to start. Free. No account required.
        </p>
        <button
          onClick={() => navigate('/quiz')}
          className="rounded-full font-semibold text-base transition-all active:scale-[0.98] mx-auto block"
          style={{
            background: '#1C3A2E',
            color: '#F9F6F1',
            height: 56,
            paddingLeft: 36,
            paddingRight: 36,
            boxShadow: '0 8px 24px rgba(28,58,46,0.2)',
            width: '100%',
            maxWidth: 300,
          }}
          type="button"
        >
          Build my stack, free →
        </button>
        <p className="text-xs mt-4" style={{ color: '#C4B9AC' }}>
          Free · No credit card · No account
        </p>
      </section>

      {/* ─── FOOTER ──────────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: '1px solid #E8E0D5',
          background: '#FFFFFF',
          paddingBottom: 'max(24px, env(safe-area-inset-bottom, 24px))',
        }}
      >
        <div className="max-w-5xl mx-auto px-5 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-serif font-light tracking-widest text-sm" style={{ color: '#1C3A2E', letterSpacing: '0.15em' }}>
            STACKWISE
          </span>
          <div className="flex items-center gap-5 text-xs" style={{ color: '#9C8E84' }}>
            <button onClick={() => navigate('/pricing')} className="hover:text-forest transition-colors" type="button">
              Pricing
            </button>
            <button onClick={() => navigate('/faq')} className="hover:text-forest transition-colors" type="button">
              FAQ
            </button>
            <button onClick={() => navigate('/privacy')} className="hover:text-forest transition-colors" type="button">
              Privacy
            </button>
            <button onClick={() => navigate('/terms')} className="hover:text-forest transition-colors" type="button">
              Terms
            </button>
            <a href="mailto:healthpro@stackdsup.com" className="hover:text-forest transition-colors">
              Support
            </a>
          </div>
          <div className="text-xs" style={{ color: '#C4B9AC' }}>
            © {new Date().getFullYear()} StackWise · For educational purposes only
          </div>
        </div>
        <div className="max-w-3xl mx-auto px-5 pb-8 pt-0 text-center border-t" style={{ borderColor: '#EEF0EB' }}>
          <p className="text-[10px] sm:text-[11px] leading-relaxed mx-auto max-w-[52rem]" style={{ color: '#B8AEA4' }}>
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

