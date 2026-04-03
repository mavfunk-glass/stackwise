import type { PrimaryGoal } from '../types/stackwise';

export type GoalTheme = {
  /** Primary text color for light UI (quiz). */
  text: string;
  /** Pill background on light UI (quiz). */
  pillBg: string;
  /** Pill border on light UI (quiz). */
  pillBorder: string;
  /** Pill background on dark UI (results hero). */
  pillBgDark: string;
  /** Pill border on dark UI (results hero). */
  pillBorderDark: string;
};

// Colors are tuned for readability on the existing StackWise palette.
export const GOAL_THEME: Record<PrimaryGoal, GoalTheme> = {
  '🔥 Fat Loss': {
    text: '#D64545',
    pillBg: 'rgba(214, 69, 69, 0.12)',
    pillBorder: 'rgba(214, 69, 69, 0.35)',
    pillBgDark: 'rgba(214, 69, 69, 0.20)',
    pillBorderDark: 'rgba(214, 69, 69, 0.45)',
  },
  '💪 Muscle & Strength': {
    text: '#C05621',
    pillBg: 'rgba(192, 86, 33, 0.12)',
    pillBorder: 'rgba(192, 86, 33, 0.34)',
    pillBgDark: 'rgba(192, 86, 33, 0.22)',
    pillBorderDark: 'rgba(192, 86, 33, 0.46)',
  },
  '🫧 Debloating & Gut Health': {
    text: '#0F766E',
    pillBg: 'rgba(15, 118, 110, 0.12)',
    pillBorder: 'rgba(15, 118, 110, 0.34)',
    pillBgDark: 'rgba(15, 118, 110, 0.22)',
    pillBorderDark: 'rgba(15, 118, 110, 0.47)',
  },
  '⚡ Energy & Focus': {
    text: '#0EA5E9',
    pillBg: 'rgba(14, 165, 233, 0.12)',
    pillBorder: 'rgba(14, 165, 233, 0.30)',
    pillBgDark: 'rgba(14, 165, 233, 0.22)',
    pillBorderDark: 'rgba(14, 165, 233, 0.45)',
  },
  '🧠 Brain Enhancement': {
    text: '#5B21B6',
    pillBg: 'rgba(91, 33, 182, 0.12)',
    pillBorder: 'rgba(91, 33, 182, 0.34)',
    pillBgDark: 'rgba(91, 33, 182, 0.22)',
    pillBorderDark: 'rgba(91, 33, 182, 0.48)',
  },
  '😴 Sleep & Recovery': {
    text: '#1E3A8A',
    pillBg: 'rgba(30, 58, 138, 0.12)',
    pillBorder: 'rgba(30, 58, 138, 0.34)',
    pillBgDark: 'rgba(30, 58, 138, 0.22)',
    pillBorderDark: 'rgba(30, 58, 138, 0.48)',
  },
  '🌿 Hormone Balance': {
    text: '#2E7D32',
    pillBg: 'rgba(46, 125, 50, 0.12)',
    pillBorder: 'rgba(46, 125, 50, 0.34)',
    pillBgDark: 'rgba(46, 125, 50, 0.22)',
    pillBorderDark: 'rgba(46, 125, 50, 0.47)',
  },
  '🌸 Menopause Support': {
    text: '#BE185D',
    pillBg: 'rgba(190, 24, 93, 0.12)',
    pillBorder: 'rgba(190, 24, 93, 0.34)',
    pillBgDark: 'rgba(190, 24, 93, 0.22)',
    pillBorderDark: 'rgba(190, 24, 93, 0.47)',
  },
  '🛡️ Longevity & Immunity': {
    text: '#A16207',
    pillBg: 'rgba(161, 98, 7, 0.12)',
    pillBorder: 'rgba(161, 98, 7, 0.34)',
    pillBgDark: 'rgba(161, 98, 7, 0.22)',
    pillBorderDark: 'rgba(161, 98, 7, 0.47)',
  },
  '💇 Hair Growth': {
    text: '#8D6E00',
    pillBg: 'rgba(141, 110, 0, 0.12)',
    pillBorder: 'rgba(141, 110, 0, 0.34)',
    pillBgDark: 'rgba(141, 110, 0, 0.22)',
    pillBorderDark: 'rgba(141, 110, 0, 0.47)',
  },
  '✨ Skin Health & Glow': {
    text: '#C2185B',
    pillBg: 'rgba(194, 24, 91, 0.12)',
    pillBorder: 'rgba(194, 24, 91, 0.34)',
    pillBgDark: 'rgba(194, 24, 91, 0.22)',
    pillBorderDark: 'rgba(194, 24, 91, 0.47)',
  },
  '🪞 LooksMaxxing': {
    text: '#7E22CE',
    pillBg: 'rgba(126, 34, 206, 0.12)',
    pillBorder: 'rgba(126, 34, 206, 0.34)',
    pillBgDark: 'rgba(126, 34, 206, 0.22)',
    pillBorderDark: 'rgba(126, 34, 206, 0.48)',
  },
  '💖 Sexual Health & Vitality': {
    text: '#D81B60',
    pillBg: 'rgba(216, 27, 96, 0.12)',
    pillBorder: 'rgba(216, 27, 96, 0.34)',
    pillBgDark: 'rgba(216, 27, 96, 0.22)',
    pillBorderDark: 'rgba(216, 27, 96, 0.47)',
  },
  '🧬 Peptide Optimization': {
    text: '#00838F',
    pillBg: 'rgba(0, 131, 143, 0.12)',
    pillBorder: 'rgba(0, 131, 143, 0.34)',
    pillBgDark: 'rgba(0, 131, 143, 0.22)',
    pillBorderDark: 'rgba(0, 131, 143, 0.47)',
  },
};

export function splitPrimaryGoal(goal: PrimaryGoal): { emoji: string; label: string } {
  // Unicode-aware: supplementary-plane emoji + optional VS (e.g. 🛡️) are not split on UTF-16 surrogates.
  const m = goal.match(/^((?:\p{Extended_Pictographic}(?:\uFE0F)?)+)\s+(.+)$/u);
  if (!m) return { emoji: '', label: goal };
  return { emoji: m[1], label: m[2] };
}

const ALL_PRIMARY_GOALS = Object.keys(GOAL_THEME) as PrimaryGoal[];

/** Map API/model strings (with typos or missing emoji) onto canonical PrimaryGoal keys so GOAL_THEME colors apply. */
export function canonicalizePrimaryGoalString(raw: string): PrimaryGoal | null {
  const t = raw.normalize('NFC').trim();
  if (!t) return null;
  if (GOAL_THEME[t as PrimaryGoal]) return t as PrimaryGoal;
  const lower = t.toLowerCase();
  for (const key of ALL_PRIMARY_GOALS) {
    if (key.normalize('NFC').toLowerCase() === lower) return key;
    const { label } = splitPrimaryGoal(key);
    if (label.toLowerCase() === lower) return key;
  }
  return null;
}

/**
 * Resolves stored/model goal strings to quiz-aligned PrimaryGoal keys for pills and callouts.
 * Falls back to the first quiz goal when nothing matches (legacy stacks).
 */
export function resolvePrimaryGoalStrings(raw: unknown, quizGoals: PrimaryGoal[]): PrimaryGoal[] {
  const quizSet = new Set(quizGoals.map((g) => g.normalize('NFC')));
  const out: PrimaryGoal[] = [];
  const seen = new Set<string>();

  const push = (g: PrimaryGoal | null) => {
    if (!g) return;
    const key = g.normalize('NFC');
    if (!GOAL_THEME[g]) return;
    if (quizSet.size > 0 && !quizSet.has(key)) return;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(g);
  };

  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item !== 'string') continue;
      push(canonicalizePrimaryGoalString(item));
    }
  }

  if (out.length === 0 && quizGoals.length > 0) {
    push(canonicalizePrimaryGoalString(quizGoals[0]) ?? quizGoals[0]);
  }

  return out;
}

