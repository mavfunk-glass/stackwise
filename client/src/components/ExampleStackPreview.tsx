/**
 * Static demo of a StackWise output for landing/home.
 * When to take each item is the Morning / Afternoon / Evening columns. Food and absorption detail only in the notes under each line.
 * Goal pills match quiz `PrimaryGoal` + `GOAL_THEME` (same as results).
 */

import { absorptionBadgesFromTiming } from '../utils/supplementAbsorption';
import { GOAL_THEME, splitPrimaryGoal } from '../utils/goalTheme';
import type { PrimaryGoal } from '../types/stackwise';

const RHYTHM_ICONS = {
  morning: String.fromCodePoint(0x2600, 0xfe0f),
  afternoon: String.fromCodePoint(0x26c5, 0xfe0f),
  evening: String.fromCodePoint(0x1f319),
} as const;

/** Goals shown in the header: real quiz goals this example stack ties to */
const EXAMPLE_QUIZ_GOALS: PrimaryGoal[] = ['🫧 Debloating & Gut Health', '😴 Sleep & Recovery'];

export type ExampleStackPreviewProps = {
  variant?: 'default' | 'compact';
};

/** Same styling pattern as `GoalPill` on ResultsPage, slightly smaller for this card */
function GoalPill({ goal, small }: { goal: PrimaryGoal; small?: boolean }) {
  const t = GOAL_THEME[goal];
  const { emoji, label } = splitPrimaryGoal(goal);
  const textSize = small ? 'text-[9px]' : 'text-[10px]';
  const pad = small ? 'px-1.5 py-0.5' : 'px-2 py-0.5';
  if (!t) {
    return (
      <span
        className={`inline-flex items-center rounded-full border border-stone bg-cream ${pad} font-semibold text-forest ${textSize}`}
      >
        {goal}
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold border ${pad} ${textSize}`}
      style={{ background: t.pillBg, borderColor: t.pillBorder, color: t.text }}
    >
      <span className="mr-0.5" aria-hidden>
        {emoji}
      </span>
      {label}
    </span>
  );
}

const ITEMS: Array<{
  name: string;
  tagline: string;
  goal: PrimaryGoal;
  /** Typical dose format for demo; may be mg, g, CFU, or IU */
  dose: string;
}> = [
  {
    name: 'Multi-strain probiotic',
    tagline: 'Broad-spectrum cultures for gut balance',
    goal: '🫧 Debloating & Gut Health',
    dose: '25 billion CFU',
  },
  {
    name: 'Magnesium glycinate',
    tagline: 'Supports relaxation and deeper sleep quality',
    goal: '😴 Sleep & Recovery',
    dose: '400 mg elemental Mg',
  },
  {
    name: 'Digestive enzymes',
    tagline: 'When meals feel heavy',
    goal: '🫧 Debloating & Gut Health',
    dose: '500 mg blend',
  },
  {
    name: 'Ashwagandha (KSM-66)',
    tagline: 'Adaptogen for stress response and overnight recovery',
    goal: '😴 Sleep & Recovery',
    dose: '600 mg',
  },
  {
    name: 'L-glutamine powder',
    tagline: 'Gut lining support',
    goal: '🫧 Debloating & Gut Health',
    dose: '5 g',
  },
];

const DAILY_SNAPSHOT: Record<
  'morning' | 'afternoon' | 'evening',
  Array<{ line: string; timing: string }>
> = {
  morning: [
    {
      line: 'Multi-strain probiotic · 25 billion CFU',
      timing: 'With food; optional dietary fat per label.',
    },
  ],
  afternoon: [
    {
      line: 'Digestive enzymes · 500 mg blend',
      timing: 'Take with food; enzymes should meet the food, not before you eat.',
    },
  ],
  evening: [
    {
      line: 'Magnesium glycinate · 400 mg elemental Mg',
      timing: 'With food or small snack before bed.',
    },
    { line: 'Ashwagandha (KSM-66) · 600 mg', timing: 'With food.' },
    { line: 'L-glutamine powder · 5 g', timing: 'Water on an empty stomach.' },
  ],
};

export default function ExampleStackPreview({ variant = 'default' }: ExampleStackPreviewProps) {
  const compact = variant === 'compact';
  const pad = compact ? 'p-2.5 sm:p-3' : 'p-3 sm:p-4';
  const titleSize = compact ? 'text-xs' : 'text-sm';

  return (
    <div
      className={`rounded-2xl overflow-hidden text-left ${pad}`}
      style={{
        background: '#FFFFFF',
        border: '1px solid #E8E0D5',
        boxShadow: '0 4px 16px rgba(28, 58, 46, 0.06)',
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
        <div>
          <div className={`font-serif font-light ${titleSize}`} style={{ color: '#1C3A2E', letterSpacing: '-0.02em' }}>
            Example stack
          </div>
          <p className="text-[9px] sm:text-[10px] mt-0.5 leading-tight" style={{ color: '#9C8E84' }}>
            Illustrative · not medical advice
          </p>
        </div>
        <span
          className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0"
          style={{ background: '#F0F5F2', color: '#2D5242', border: '1px solid #D4E8DA' }}
        >
          Sample
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-2">
        {EXAMPLE_QUIZ_GOALS.map((g) => (
          <GoalPill key={g} goal={g} small={compact} />
        ))}
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: '#FDFCFA', color: '#6B5B4E', border: '1px solid #E8E0D5' }}
        >
          ~$50-$70/mo
        </span>
      </div>

      <p className="text-[9px] text-warm-mid mb-2 leading-snug">
        One plan can combine picks for{' '}
        <span className="font-semibold text-forest">several goals</span> you select in the quiz.
      </p>

      <ul className="space-y-1.5 mb-2.5">
        {ITEMS.map((item) => (
          <li key={item.name} className="list-none rounded-xl border border-stone/90 bg-[#FDFCFA] px-2.5 py-2">
            <div className="flex flex-wrap items-center gap-1">
              <div className="font-semibold text-xs text-forest leading-tight flex-1 min-w-0">{item.name}</div>
              <GoalPill goal={item.goal} small />
            </div>
            <div className="text-[10px] font-semibold text-forest mt-0.5">{item.dose}</div>
            <div className="text-[10px] text-warm-mid mt-0.5 line-clamp-2">{item.tagline}</div>
          </li>
        ))}
      </ul>

      <div className="rounded-xl border border-stone bg-white overflow-hidden">
        <div className="px-2.5 py-1.5 border-b border-stone bg-[#FDFCFA]">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-warm-light leading-tight">
            Daily rhythm
          </div>
          <p className="text-[9px] text-warm-mid mt-0.5 leading-snug">
            Meal and absorption notes · example snapshot
          </p>
        </div>
        <div className="grid grid-cols-3 divide-x divide-stone/60">
          {(['morning', 'afternoon', 'evening'] as const).map((period) => {
            const rows = DAILY_SNAPSHOT[period];
            return (
              <div key={period} className="px-1.5 py-2 min-w-0">
                <div className="flex items-center gap-0.5 mb-1">
                  <span className="text-sm leading-none" aria-hidden>
                    {RHYTHM_ICONS[period]}
                  </span>
                  <span className="text-[10px] font-semibold capitalize text-forest leading-none">{period}</span>
                </div>
                <ul className="space-y-1.5">
                  {rows.map((row) => {
                    const lineBadges = absorptionBadgesFromTiming(row.timing);
                    return (
                      <li key={row.line} className="list-none">
                        <p className="text-[9px] text-warm-mid leading-snug">{row.line}</p>
                        {lineBadges.length > 0 && (
                          <div className="flex flex-wrap gap-0.5 mt-0.5">
                            {lineBadges.map((b) => (
                              <span
                                key={b}
                                className="text-[8px] font-medium px-1 py-px rounded-full bg-moss-light/40 text-forest leading-none"
                              >
                                {b}
                              </span>
                            ))}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
