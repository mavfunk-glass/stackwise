import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ExampleStackPreview from '../components/ExampleStackPreview';
import StackyCat from '../components/StackyCat';
import ViewMyStackNavButton from '../components/ViewMyStackNavButton';
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
    <div className="rounded-2xl overflow-hidden flex flex-col border border-stone bg-white max-h-[420px]">
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
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-line border ${
                msg.role === 'user'
                  ? 'bg-gradient-to-br from-forest to-forest-light text-on-dark-primary border-transparent rounded-br-sm'
                  : 'bg-cream-dark text-warm border-stone/80 rounded-bl-sm'
              }`}
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
        <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-forest text-on-dark-primary text-sm font-semibold">
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
      n: '1',
      title: 'Tell us about you',
      body: 'Share your goals, routine, preferences, and budget. Add health context if relevant. Takes under 90 seconds.',
    },
    {
      n: '2',
      title: 'Stacky builds your plan',
      body: 'Get a personalized starting stack with clear reasoning: what fits, why it fits, and how it fits your day.',
    },
    {
      n: '3',
      title: 'Buy with one tap',
      body: 'Use direct Amazon and iHerb links. Skip random buying and keep spending aligned with your budget.',
    },
    {
      n: '4',
      title: 'Stacky stays with you',
      body: 'Ask when labels blur or a new ad sounds too good. Adjust your plan as goals change: clearer guidance, not pressure to buy more.',
    },
  ];

  return (
    <div className="min-h-screen font-sans bg-sw-bg text-warm">
      {/* ─── NAV ─────────────────────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-50 px-5 border-b border-stone sw-sticky-nav"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 6px)',
          paddingBottom: 6,
        }}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between min-h-[36px]">
          <span
            className="font-serif font-light tracking-widest text-sm text-ink dark:text-warm dark:[text-shadow:0_0_24px_rgba(0,0,0,0.5)]"
            style={{ letterSpacing: '0.15em' }}
          >
            STACKWISE
          </span>

          <div className="hidden sm:flex items-center gap-6">
            {canSkipToStack && (
              <button
                onClick={goCoachFromLanding}
                className="text-sm font-semibold transition-colors text-ink dark:text-warm dark:hover:text-moss hover:opacity-95 dark:[text-shadow:0_0_20px_rgba(0,0,0,0.45)]"
                type="button"
              >
                Skip quiz · Stacky
              </button>
            )}
            <button
              onClick={() => navigate('/pricing')}
              className="text-sm font-medium transition-colors text-warm-mid hover:text-ink dark:text-warm-mid dark:hover:text-warm"
              type="button"
            >
              Pricing
            </button>
            <ViewMyStackNavButton variant="emphasized" />
            {tier !== 'free' && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#F0F5F2] text-[#1C3A2E] border border-[#D4E8DA] dark:bg-surface-elevated dark:text-warm dark:border-stone/80 dark:shadow-[inset_0_1px_0_rgba(120,200,160,0.12)]">
                {tier.toUpperCase()} Active
              </span>
            )}
            <button
              onClick={() => navigate('/quiz')}
              className="rounded-full font-semibold text-sm px-4 h-9 transition-transform active:scale-95 bg-forest text-on-dark-primary hover:bg-forest-light"
              type="button"
            >
              Build my stack
            </button>
          </div>

          <div className="sm:hidden flex items-center gap-2 flex-wrap justify-end">
            <ViewMyStackNavButton variant="emphasized" className="!px-2.5" />
            {canSkipToStack && (
              <button
                onClick={goCoachFromLanding}
                className="rounded-full font-semibold text-xs px-3 h-8 border border-stone bg-surface-elevated text-ink hover:bg-cream-dark dark:text-warm dark:border-stone/80"
                type="button"
              >
                Stacky
              </button>
            )}
            <button
              onClick={() => navigate('/quiz')}
              className="rounded-full font-semibold text-xs px-3.5 h-8 bg-forest text-on-dark-primary hover:bg-forest-light"
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
          <div className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-left sm:text-center mb-5 px-4 py-2.5 rounded-2xl shadow-sm max-w-full bg-surface-elevated border-2 border-forest text-ink shadow-[0_4px_14px_rgba(28,58,46,0.12)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.35)] dark:border-moss/40">
            <span className="w-2 h-2 rounded-full shrink-0 animate-pulse bg-moss" aria-hidden />
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wide leading-snug tracking-wide">
              <span className="text-ink">StackWise</span>
              <span className="text-warm-mid font-semibold"> · </span>
              <span className="text-forest dark:text-moss">supplement clarity · personalized support</span>
            </span>
          </div>

          <div className="flex flex-col items-center justify-center mb-7">
            <StackyCat mood="wave" size={120} />
            <span className="mt-1 text-[11px] font-bold uppercase tracking-widest text-ink tracking-[0.18em]">
              Stacky
            </span>
          </div>

          <h1 className="font-serif font-light mb-5 text-[clamp(38px,8vw,58px)] text-ink tracking-tight leading-[1.1] italic">
            Stop guessing with supplements.
            <br />
            <em className="text-lime-600 dark:text-moss not-italic font-normal">
              Build a stack that fits your goals, routine, and budget, then get ongoing guidance as it evolves.
            </em>
          </h1>

          <p className="text-base leading-relaxed mb-8 text-warm-mid max-w-xl mx-auto">
            <strong>Don&apos;t waste money</strong> on overhyped supplements that aren&apos;t for you. Stacky builds simple, personalized stacks for your specific goals that evolve as you do.
          </p>

          <div className="max-w-md mx-auto mb-3 text-left">
            <ExampleStackPreview />
          </div>
          <div className="max-w-md mx-auto mb-8 rounded-xl px-3.5 py-3 text-left bg-emerald-50/90 border border-emerald-200/80 dark:bg-emerald-950/25 dark:border-emerald-800/50">
            <p className="text-xs leading-relaxed text-ink">
              StackWise builds a stack around <strong>your unique goals and preferences</strong>. Each recommendation is carefully selected to{' '}
              <strong>fit into your routine</strong>, not general supplement trends.
            </p>
          </div>

          <div className="max-w-md mx-auto mb-8 space-y-3 text-left">
            <div className="flex items-start gap-2.5 text-sm text-warm">
              <span className="text-moss font-bold flex-shrink-0">+</span>
              <span>Built around your goals and real life, not whatever ads and influencers pushed last week.</span>
            </div>
            <div className="flex items-start gap-2.5 text-sm text-warm">
              <span className="text-moss font-bold flex-shrink-0">+</span>
              <span>Clear reasoning for every recommendation, so you understand what you&apos;re taking and why.</span>
            </div>
            <div className="flex items-start gap-2.5 text-sm text-warm">
              <span className="text-moss font-bold flex-shrink-0">+</span>
              <span>Stacky stays in your corner as your goals and routine change, so the plan can grow with you.</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/quiz')}
              className="rounded-full font-semibold text-base transition-all active:scale-[0.98] bg-forest text-on-dark-primary hover:bg-forest-light h-[54px] px-7 shadow-[0_8px_24px_rgba(28,58,46,0.2)] dark:shadow-[0_8px_28px_rgba(0,0,0,0.4)]"
              type="button"
            >
              Build my stack →
            </button>
            {canSkipToStack && (
              <button
                onClick={goCoachFromLanding}
                className="rounded-full font-semibold text-base transition-all h-[54px] px-7 border-[1.5px] border-forest text-ink bg-transparent hover:bg-cream-dark"
                type="button"
              >
                Skip quiz · talk to Stacky
              </button>
            )}
            {canSkipToStack && (
              <button
                onClick={goResults}
                className="rounded-full font-semibold text-base transition-all h-[54px] px-7 border-[1.5px] border-stone text-warm-mid bg-transparent hover:bg-cream-dark"
                type="button"
              >
                View my stack & schedule
              </button>
            )}
          </div>
          <p className="text-xs mt-4 text-stone-dark dark:text-warm-light">
            Takes about 90 seconds · No account required · Free to start
          </p>
        </div>
      </section>

      {/* ─── STATS BAR ───────────────────────────────────────────────── */}
      <div className="border-y border-stone bg-white">
        <div className="max-w-5xl mx-auto px-5 py-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {[
              { n: 'Personal', label: 'Built around your goals' },
              { n: 'Clearer', label: 'Less shelf guesswork' },
              { n: 'Ongoing', label: 'Support as things change' },
            ].map(({ n, label }) => (
              <div key={label} className="text-center">
                <div className="font-serif text-xl text-ink font-light tracking-tight">{n}</div>
                <div className="text-xs mt-0.5 text-warm-light">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── COACH DEMO ─────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-5 py-14">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest mb-4 text-moss tracking-widest">
              Guidance, not hype
            </div>
            <h2 className="font-serif font-light mb-4 text-[clamp(28px,5vw,40px)] text-ink tracking-tight leading-snug">
              Clearer supplement decisions, with support that lasts.
            </h2>
            <p className="text-sm leading-relaxed mb-5 text-warm-mid">
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
                    <div className="font-semibold text-sm text-ink">{title}</div>
                    <div className="text-xs leading-snug mt-0.5 text-warm-light">{sub}</div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate('/quiz')}
              className="rounded-full font-semibold text-sm transition-all active:scale-95 bg-forest text-on-dark-primary hover:bg-forest-light h-12 px-6"
              type="button"
            >
              Build my stack, free →
            </button>
          </div>

          <div>
            <StackyDemo />
            <p className="text-xs text-center mt-3 text-stone dark:text-warm-light">
              Example guidance conversation, simplified for clarity
            </p>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ───────────────────────────────────────────── */}
      <section className="bg-white border-y border-stone">
        <div className="max-w-5xl mx-auto px-5 py-14">
          <div className="text-center mb-10">
            <div className="text-xs font-semibold uppercase tracking-widest mb-3 text-warm-light tracking-widest">
              How it works
            </div>
            <h2 className="font-serif font-light text-[clamp(26px,5vw,36px)] text-ink tracking-tight">
              From first question to your full plan in 90 seconds.
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {HOW_STEPS.map(({ n, title, body }) => (
              <div key={n} className="relative">
                <div className="font-serif font-light mb-3 text-[40px] text-stone/90 dark:text-warm-mid leading-none tracking-tight">
                  {n}
                </div>
                <div className="font-semibold text-sm mb-2 text-ink">{title}</div>
                <p className="text-xs leading-relaxed text-warm-light">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── GOALS GRID ────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-5 py-14">
        <div className="text-center mb-8">
          <h2 className="font-serif font-light text-[clamp(26px,5vw,36px)] text-ink tracking-tight">
            Goals vary. Your plan should fit yours.
          </h2>
          <p className="text-sm mt-2 text-warm-light">
            Pick what you are working toward. StackWise shapes a stack around it.
          </p>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
          {GOALS.map(({ icon, label }) => (
            <button
              key={label}
              onClick={() => navigate('/quiz')}
              className="landing-goal-tile rounded-2xl p-3 text-center transition-all active:scale-95 min-h-[72px]"
              type="button"
            >
              <div className="text-2xl mb-1">{icon}</div>
              <div className="text-xs font-medium leading-tight text-warm-mid">{label}</div>
            </button>
          ))}
        </div>
      </section>

      {/* ─── COMPARISON ───────────────────────────────────────────── */}
      <section className="bg-white border-y border-stone">
        <div className="max-w-5xl mx-auto px-5 py-14">
          <div className="text-center mb-10">
            <div className="text-xs font-semibold uppercase tracking-widest mb-3 text-warm-light tracking-widest">
              The honest comparison
            </div>
            <h2 className="font-serif font-light text-[clamp(26px,5vw,36px)] text-ink tracking-tight">
              Less wasted spend. More clarity.
            </h2>
          </div>

          <div className="rounded-2xl overflow-hidden border border-stone">
            <div className="grid grid-cols-4 bg-cream border-b border-stone">
              <div className="p-4 text-xs font-semibold uppercase tracking-widest text-warm-light" />
              <div className="p-4 text-center text-xs font-semibold text-warm-light border-l border-stone">
                Trial and error
              </div>
              <div className="p-4 text-center text-xs font-semibold text-warm-light border-l border-stone">
                Google / Reddit
              </div>
              <div className="p-4 text-center text-xs font-semibold text-ink border-l border-stone bg-emerald-50/80 dark:bg-emerald-950/30">
                StackWise Pro
              </div>
            </div>

            {COMPARISON.map(({ feature, trialError, generic, stackwise }) => {
              const fmt = (v: boolean | string) => {
                if (v === true) return { text: '✓', cellClass: 'text-moss font-semibold' };
                if (v === false) return { text: '✗', cellClass: 'text-stone dark:text-warm-light/60 font-normal' };
                return { text: v as string, cellClass: 'text-warm-light font-normal' };
              };
              const sw = fmt(stackwise);
              const te = fmt(trialError);
              const gen = fmt(generic);
              return (
                <div key={feature} className="grid grid-cols-4 border-t border-stone/80">
                  <div className="p-3.5 text-xs font-medium text-warm-mid">{feature}</div>
                  <div className={`p-3.5 text-center text-xs border-l border-stone/80 ${te.cellClass}`}>
                    {te.text}
                  </div>
                  <div className={`p-3.5 text-center text-xs border-l border-stone/80 ${gen.cellClass}`}>
                    {gen.text}
                  </div>
                  <div className={`p-3.5 text-center text-xs border-l border-stone/80 bg-emerald-50/40 dark:bg-emerald-950/20 ${sw.cellClass}`}>
                    {sw.text}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-center text-xs mt-6 max-w-xl mx-auto leading-relaxed text-warm-light">
            <strong className="text-warm-mid">Quiz unlocks:</strong> Basic adds LooksMaxxing. Pro adds Peptide Optimization and full peptide education, not included on Basic.
          </p>
        </div>
      </section>

      {/* ─── TESTIMONIALS ───────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-5 py-14">
        <div className="text-center mb-10">
          <div className="text-xs font-semibold uppercase tracking-widest mb-3 text-warm-light tracking-widest">
            What people say
          </div>
          <h2 className="font-serif font-light text-[clamp(26px,5vw,36px)] text-ink tracking-tight">
            People who stopped guessing.
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TESTIMONIALS.map(({ quote, name, goal, result: res }) => (
            <div key={name} className="rounded-2xl p-5 flex flex-col bg-white border border-stone">
              <p className="font-serif font-light text-[15px] leading-relaxed flex-1 mb-4 text-warm italic">
                &ldquo;{quote}&rdquo;
              </p>
              <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 mb-3 self-start bg-emerald-50/90 border border-emerald-200/80 dark:bg-emerald-950/35 dark:border-emerald-800/50">
                <span className="text-moss text-[10px]">✓</span>
                <span className="text-xs font-semibold text-ink">{res}</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm text-ink">{name}</div>
                  <div className="text-xs text-warm-light">Goal: {goal}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-xs mt-6 text-stone dark:text-warm-light leading-relaxed">
          Individual results vary. These experiences reflect personal outcomes and are not guaranteed.<br />
          StackWise provides educational supplement guidance only - not medical advice.
        </p>
      </section>

      {/* ─── PRICING PREVIEW ───────────────────────────────────────── */}
      <section className="bg-forest border-t border-white/10">
        <div className="max-w-5xl mx-auto px-5 py-14">
          <div className="text-center mb-10">
            <div className="text-xs font-semibold uppercase tracking-widest mb-3 text-on-dark-subtle tracking-widest">
              Simple pricing
            </div>
            <h2 className="font-serif font-light mb-3 text-[clamp(28px,5vw,40px)] text-on-dark-primary tracking-tight">
              Personalized stack clarity, then ongoing support.
            </h2>
            <p className="text-sm text-on-dark-muted">
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
                  'Core quiz goals only. LooksMaxxing unlocks on Basic; Peptide Optimization on Pro',
                ],
                cta: 'Start Free',
                action: () => navigate('/quiz'),
                cardClass: 'bg-white/5 border border-white/10',
                ctaClass: 'bg-white/10 text-on-dark-primary border border-white/20 hover:bg-white/15',
                highlight: false,
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
                cardClass: 'bg-white/5 border border-white/10',
                ctaClass: 'bg-white/10 text-on-dark-primary border border-white/20 hover:bg-white/15',
                highlight: false,
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
                cardClass:
                  'bg-[#F9F6F1] border-none shadow-lg dark:bg-surface-elevated dark:border dark:border-stone/80 dark:shadow-[0_12px_40px_rgba(0,0,0,0.35)]',
                ctaClass: 'bg-forest text-on-dark-primary border-none hover:bg-forest-light',
                highlight: true,
              },
            ].map((plan) => (
              <div key={plan.name} className={`rounded-2xl p-5 flex flex-col relative ${plan.cardClass}`}>
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold px-3 py-1 rounded-full bg-[#4A7C59] text-[#F9F6F1] whitespace-nowrap shadow-sm">
                    {plan.badge}
                  </div>
                )}

                <div className="mb-4">
                  <div
                    className={`text-xs font-semibold uppercase tracking-widest mb-1 tracking-wide ${
                      plan.highlight ? 'text-warm-light' : 'text-on-dark-subtle'
                    }`}
                  >
                    {plan.name}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span
                      className={`font-serif font-light text-4xl ${
                        plan.highlight ? 'text-ink' : 'text-on-dark-primary'
                      }`}
                    >
                      {plan.price}
                    </span>
                    <span className={`text-xs ${plan.highlight ? 'text-warm-light' : 'text-on-dark-subtle'}`}>
                      {plan.sub}
                    </span>
                  </div>
                </div>

                <ul className="space-y-1.5 flex-1 mb-4">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs leading-snug">
                      <span
                        className={`flex-shrink-0 mt-px ${plan.highlight ? 'text-moss' : 'text-on-dark-subtle'}`}
                      >
                        ✓
                      </span>
                      <span className={plan.highlight ? 'text-warm-mid' : 'text-on-dark-muted'}>{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={plan.action}
                  className={`w-full rounded-full font-semibold text-sm transition-all active:scale-[0.98] h-11 ${plan.ctaClass}`}
                  type="button"
                >
                  {plan.cta}
                </button>
                <p
                  className={`text-center text-xs mt-2 ${
                    plan.highlight ? 'text-warm-light' : 'text-on-dark-subtle'
                  }`}
                >
                  Cancel anytime
                </p>
              </div>
            ))}
          </div>

          <div className="max-w-md mx-auto mt-8 rounded-2xl px-5 py-4 flex items-start gap-3 bg-white/5 border border-white/10">
            <span className="text-lg flex-shrink-0">🛡</span>
            <div>
              <div className="font-semibold text-sm mb-1 text-on-dark-primary">7-day fit guarantee</div>
              <p className="text-xs leading-relaxed text-on-dark-muted">
                If StackWise isn&apos;t the right fit within your first 7 days, email{' '}
                <a href="mailto:stacky@stack-wise.org" className="text-on-dark-primary underline underline-offset-2">
                  stacky@stack-wise.org
                </a>{' '}
                for a full refund.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOUNDER ───────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-5 py-14 border-t border-stone bg-cream-dark/40">
        <div className="max-w-2xl mx-auto text-center sm:text-left">
          <h2 className="font-serif font-light mb-5 text-[clamp(24px,4vw,32px)] text-ink tracking-tight">
            Why I built StackWise
          </h2>
          <div className="space-y-4 text-sm leading-relaxed text-warm-mid">
            <p>
              For a long time, I was the person people came to when they wanted help building a supplement stack that
              actually made sense for them. I kept seeing the same pattern: people wanted better sleep, more energy,
              a better mood, and a routine they could actually stick to, but instead they got overwhelmed by too many
              options and too much conflicting advice.
            </p>
            <p className="font-medium text-ink">
              Too much noise. Too little clarity.
            </p>
            <p>
              StackWise was built to make that process simpler, to help people make smarter supplement decisions,
              build a stack that fits their life, and feel more confident in what they are taking and why.
            </p>
            <p>
              It is a product I care deeply about getting right, and one I plan to keep improving over time.
            </p>
            <p className="pt-1 font-serif font-light italic text-ink">
              Matthew
            </p>
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-5 py-16 text-center">
        <h2 className="font-serif font-light mb-4 text-[clamp(30px,6vw,46px)] text-ink tracking-tight leading-tight">
          Stop guessing with supplements.
        </h2>
        <p className="text-base mb-8 max-w-lg mx-auto leading-relaxed text-warm-mid">
          Get a stack that fits your goals, routine, and budget, and support that evolves with you. About 90 seconds to start. Free. No account required.
        </p>
        <button
          onClick={() => navigate('/quiz')}
          className="rounded-full font-semibold text-base transition-all active:scale-[0.98] mx-auto block bg-forest text-on-dark-primary hover:bg-forest-light h-14 px-9 shadow-[0_8px_24px_rgba(28,58,46,0.2)] dark:shadow-[0_8px_28px_rgba(0,0,0,0.4)] w-full max-w-[300px]"
          type="button"
        >
          Build my stack, free →
        </button>
        <p className="text-xs mt-4 text-stone dark:text-warm-light">
          Free · No credit card · No account
        </p>
      </section>

      {/* ─── FOOTER ──────────────────────────────────────────────────── */}
      <footer className="border-t border-stone bg-white pb-[max(24px,env(safe-area-inset-bottom,24px))]">
        <div className="max-w-5xl mx-auto px-5 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-serif font-light tracking-widest text-sm text-ink" style={{ letterSpacing: '0.15em' }}>
            STACKWISE
          </span>
          <div className="flex items-center gap-5 text-xs text-warm-light">
            <button onClick={() => navigate('/pricing')} className="hover:text-ink transition-colors" type="button">
              Pricing
            </button>
            <button onClick={() => navigate('/faq')} className="hover:text-ink transition-colors" type="button">
              FAQ
            </button>
            <button onClick={() => navigate('/privacy')} className="hover:text-ink transition-colors" type="button">
              Privacy
            </button>
            <button onClick={() => navigate('/terms')} className="hover:text-ink transition-colors" type="button">
              Terms
            </button>
            <a href="mailto:stacky@stack-wise.org" className="hover:text-ink transition-colors">
              Support
            </a>
          </div>
          <div className="text-xs text-stone dark:text-warm-light">
            © {new Date().getFullYear()} StackWise · For educational purposes only
          </div>
        </div>
        <div className="max-w-3xl mx-auto px-5 pb-8 pt-0 text-center border-t border-stone/60">
          <p className="text-[10px] sm:text-[11px] leading-relaxed mx-auto max-w-[52rem] text-warm-light">
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

