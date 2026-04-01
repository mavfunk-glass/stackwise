import { useEffect, useRef, useState } from 'react';
import StackyCat from './StackyCat';

type Props = { isActive: boolean };

/** Fun facts: slow fade in, hold ≥2s, slow fade out (ms). */
const FACT_FADE_MS = 1000;
const FACT_HOLD_MS = 2200;
const FACT_CYCLE_MS = FACT_FADE_MS + FACT_HOLD_MS + FACT_FADE_MS;

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

function factCardOpacity(elapsedMs: number): number {
  const t = elapsedMs % FACT_CYCLE_MS;
  if (t < FACT_FADE_MS) {
    return easeInOut(t / FACT_FADE_MS);
  }
  if (t < FACT_FADE_MS + FACT_HOLD_MS) {
    return 1;
  }
  return easeInOut(1 - (t - FACT_FADE_MS - FACT_HOLD_MS) / FACT_FADE_MS);
}

const MESSAGES = [
  'Reviewing your goals and routine…',
  'Organizing your stack around what fits your life…',
  'Checking for overlap and obvious conflicts…',
  'Building your personalized starting plan…',
  'Simplifying your next supplement decisions…',
  'Almost there…',
];

/** Premium process framing: no fake deficiency stats or outcome guarantees. */
const FACTS = [
  { stat: 'Less waste', fact: 'Most people buy supplements without a clear picture of fit or overlap.' },
  { stat: 'Your goals', fact: 'A stack works better when it matches what you actually want to improve.' },
  { stat: 'Routine', fact: 'Timing and fit matter as much as the name on the bottle.' },
  { stat: 'Clarity', fact: 'A simple plan beats a crowded cabinet you second-guess every week.' },
  { stat: 'Support', fact: 'Questions come up after week one. Guidance helps you stay consistent.' },
  { stat: 'Next steps', fact: 'StackWise focuses on clearer decisions, not diagnosing or treating conditions.' },
];

export default function LoadingOverlay({ isActive }: Props) {
  const startedAtRef = useRef(0);
  const [now, setNow] = useState(() => (isActive ? Date.now() : 0));

  useEffect(() => {
    if (!isActive) return;
    startedAtRef.current = Date.now();
    setNow(Date.now());
    let raf = 0;
    const tick = () => {
      setNow(Date.now());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isActive]);

  if (!isActive) return null;

  const elapsed = Math.max(0, now - startedAtRef.current);
  const idx = Math.floor(elapsed / 2600) % MESSAGES.length;
  /** Monotonic progress (never resets) so the top bar does not jump backward every few seconds. */
  const nStages = MESSAGES.length;
  const stageMs = 3200;
  const stage = Math.min(nStages - 1, Math.floor(elapsed / stageMs));
  const stageStart = stage * stageMs;
  const withinStage = Math.min(1, Math.max(0, (elapsed - stageStart) / stageMs));
  const segPct = Math.min(94, ((stage + withinStage) / nStages) * 94);
  const factIdx = Math.floor(elapsed / FACT_CYCLE_MS) % FACTS.length;
  const fact = FACTS[factIdx];
  const factOpacity = factCardOpacity(elapsed);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{
        background: '#F9F6F1',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      {/* Top strip */}
      <div className="h-0.5 w-full" style={{ background: '#E8E0D5' }}>
        <div
          className="h-full transition-[width] duration-300 ease-out"
          style={{ width: `${segPct}%`, background: '#1C3A2E' }}
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">

        {/* Wordmark */}
        <div
          className="font-serif text-2xl font-light tracking-wide mb-10"
          style={{ color: '#1C3A2E', letterSpacing: '0.15em' }}
        >
          STACKWISE
        </div>

        <div style={{ marginBottom: 16, position: 'relative' }}>
          <StackyCat mood="think" size={100} speaking />
        </div>

        {/* Serif headline */}
        <h2
          className="font-serif font-light mb-3"
          style={{ fontSize: 28, color: '#1C3A2E', letterSpacing: '-0.01em' }}
        >
          Building your stack
        </h2>

        {/* Cycling message */}
        <p
          className="text-sm font-light mb-10"
          style={{ color: '#9C8E84', letterSpacing: '0.01em' }}
        >
          {MESSAGES[idx]}
        </p>

        <div
          style={{
            width: '100%',
            maxWidth: 420,
            borderRadius: 16,
            background: '#FFFFFF',
            border: '1.5px solid #E8E0D5',
            padding: '12px 14px',
            textAlign: 'left',
            marginBottom: 10,
            opacity: factOpacity,
            transition: 'none',
            willChange: 'opacity',
          }}
          aria-live="polite"
        >
          <div
            style={{
              fontFamily: 'Cormorant Garamond, Georgia, serif',
              fontSize: 28,
              lineHeight: 1,
              color: '#1C3A2E',
              marginBottom: 6,
            }}
          >
            {fact.stat}
          </div>
          <div style={{ fontSize: 12, color: '#6B5B4E', lineHeight: 1.5 }}>
            {fact.fact}
          </div>
        </div>

        {/* Simple reassurance instead of numeric bar */}
        <p
          className="text-center text-xs mt-2"
          style={{ color: '#C4B9AC', letterSpacing: '0.06em' }}
        >
          Stacky is organizing your personalized plan. This usually takes only a few moments.
        </p>
      </div>

      {/* Bottom disclaimer */}
      <div
        className="pb-8 px-8 text-center text-xs font-light"
        style={{
          color: '#C4B9AC',
          paddingBottom: 'max(32px, env(safe-area-inset-bottom, 32px))',
          letterSpacing: '0.02em',
        }}
      >
        Educational guidance · Not medical advice · Personalized to you
      </div>
    </div>
  );
}
