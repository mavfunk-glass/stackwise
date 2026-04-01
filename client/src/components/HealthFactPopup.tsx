import { useCallback, useRef, useState } from 'react';
import StackyCat from './StackyCat';

export const STACKY_FACTS: Array<{
  stat: string;
  fact: string;
  source: string;
  cta: string;
  isCat?: boolean;
}> = [
  {
    stat: 'Clarity',
    fact: 'Most people do not need more supplement options; they need a clearer plan.',
    source: 'StackWise',
    cta: 'That is exactly what your stack is being built to provide.',
  },
  {
    stat: '🐱',
    fact: 'Stacky believes random supplement buying is a terrible personality trait.',
    source: 'Cat opinion',
    cta: 'Good thing you are fixing that now.',
    isCat: true,
  },
  {
    stat: 'Routine',
    fact: 'A supplement plan is much easier to follow when it fits your actual daily routine.',
    source: 'StackWise',
    cta: 'We organize your stack around real-life consistency, not perfection.',
  },
  {
    stat: 'Less waste',
    fact: 'The fastest way to waste money on supplements is to buy first and figure it out later.',
    source: 'StackWise',
    cta: 'Your stack is designed to help you buy with more confidence.',
  },
  {
    stat: 'Support',
    fact: 'A good stack is not just a list. It should still make sense when your goals or routine change.',
    source: 'StackWise',
    cta: 'That is why ongoing support is built in.',
  },
  {
    stat: '🐱',
    fact: 'Stacky cannot take supplements, but Stacky strongly supports informed decision-making.',
    source: 'Cat fact',
    cta: 'Very wise. Very striped.',
    isCat: true,
  },
  {
    stat: 'Simple',
    fact: 'The best supplement routine is usually the one you can actually stick to.',
    source: 'StackWise',
    cta: 'Your recommendations are being shaped around that principle.',
  },
  {
    stat: 'Fit',
    fact: 'What looks good on paper is not always what fits someone’s goals, preferences, or habits.',
    source: 'StackWise',
    cta: 'We are aiming for a stack that fits your life, not just a trend.',
  },
];

type HealthFactPopupProps = {
  open: boolean;
  factIdx: number;
  onClose: () => void;
};

export default function HealthFactPopup({
  open,
  factIdx,
  onClose,
}: HealthFactPopupProps) {
  if (!open) return null;

  const item = STACKY_FACTS[factIdx % STACKY_FACTS.length];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div
        className="w-full max-w-md rounded-3xl border p-5 shadow-xl"
        style={{
          background: '#FFFDF9',
          borderColor: '#E8E0D5',
        }}
      >
        <div className="mb-4 flex items-start gap-4">
          <div className="shrink-0">
            <StackyCat mood={item.isCat ? 'cool' : 'happy'} size={72} />
          </div>

          <div className="min-w-0">
            <div
              className="mb-1 text-sm font-semibold uppercase tracking-wide"
              style={{ color: '#8B6F47' }}
            >
              {item.stat}
            </div>

            <p
              className="mb-2 text-sm leading-6"
              style={{ color: '#3F352D' }}
            >
              {item.fact}
            </p>

            <p
              className="text-sm font-medium"
              style={{ color: '#4A7C59' }}
            >
              {item.cta}
            </p>

            <p
              className="mt-2 text-xs"
              style={{ color: '#9C8E84' }}
            >
              {item.source}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-2xl px-4 py-3 text-sm font-semibold"
          style={{
            background: '#1C3A2E',
            color: '#F9F6F1',
            border: 'none',
          }}
        >
          Got it, keep going
        </button>
      </div>
    </div>
  );
}

const FACT_STEPS = new Set([3, 6, 9, 12, 15]);

export function useFactPopups() {
  const [showFact, setShowFact] = useState(false);
  const [factIdx, setFactIdx] = useState(0);
  const shownStepsRef = useRef(new Set<number>());

  const maybeShowFact = useCallback((step: number) => {
    if (FACT_STEPS.has(step) && !shownStepsRef.current.has(step)) {
      shownStepsRef.current.add(step);
      setFactIdx(Math.floor(Math.random() * STACKY_FACTS.length));
      setShowFact(true);
    }
  }, []);

  const dismissFact = useCallback(() => setShowFact(false), []);

  return { showFact, factIdx, maybeShowFact, dismissFact };
}
