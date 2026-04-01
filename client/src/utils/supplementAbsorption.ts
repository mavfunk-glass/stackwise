/** Derive short absorption labels from model timing text for UI chips. */
export function absorptionBadgesFromTiming(timing: string): string[] {
  const t = timing.toLowerCase();
  const badges: string[] = [];

  if (/\bempty stomach|without food|fasted|on an empty stomach\b/.test(t)) {
    badges.push('Empty stomach');
  } else if (
    /\bwith food|with meals|with a meal|take with meal|after eating|with breakfast|with lunch|with dinner\b/.test(t)
  ) {
    badges.push('With food');
  }

  if (/\bwith fat|dietary fat|healthy fat|pair with fat|eat fat\b/.test(t)) {
    badges.push('With fat');
  }

  if (/\bmeal timing not critical|timing flexible|not critical for meals\b/.test(t)) {
    badges.push('Meal timing flexible');
  }

  if (/\bsublingual\b/.test(t)) badges.push('Sublingual');
  if (/\bbefore bed|at bedtime|evening only for sleep\b/.test(t) && !badges.some((b) => b.includes('stomach'))) {
    badges.push('Often PM / with dinner');
  }

  return badges;
}
