import type { Supplement } from '../types/stackwise';

/** Longest supplement name match in a schedule line (used for badges and gating). */
export function findSupplementForScheduleLine(line: string, supplements: Supplement[]): Supplement | undefined {
  const lower = line.toLowerCase();
  let best: Supplement | undefined;
  let bestLen = 0;
  for (const s of supplements) {
    const n = s.name.toLowerCase();
    if (n.length > bestLen && lower.includes(n)) {
      best = s;
      bestLen = n.length;
    }
  }
  return best;
}

/** Free tier: supplements at index 2+ are gated; blur rhythm lines that mention those so users cannot read them elsewhere on the page. */
export function isRhythmLineLockedForFreeTier(line: string, supplements: Supplement[]): boolean {
  if (supplements.length <= 2) return false;
  const matched = findSupplementForScheduleLine(line, supplements);
  if (matched) {
    const idx = supplements.indexOf(matched);
    if (idx >= 2) return true;
  }
  const lower = line.toLowerCase();
  for (let i = 2; i < supplements.length; i++) {
    const n = supplements[i].name.toLowerCase();
    if (n.length >= 2 && lower.includes(n)) return true;
  }
  return false;
}
