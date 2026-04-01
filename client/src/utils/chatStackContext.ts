import type { AccountabilityState, CheckIn, GeminiResult, IntakePayload, PrimaryGoal } from '../types/stackwise';
import type { StackProfile } from '../types/storage';

export function formatHeightForChat(cm?: number): string {
  if (!cm || !Number.isFinite(cm)) return 'Not set';
  const inches = cm / 2.54;
  const ft = Math.floor(inches / 12);
  const inch = Math.round(inches % 12);
  return `${Math.round(cm)} cm (${ft}'${inch}")`;
}

export function formatWeightForChat(kg?: number): string {
  if (!kg || !Number.isFinite(kg)) return 'Not set';
  const lbs = Math.round(kg * 2.20462);
  return `${Math.round(kg)} kg (${lbs} lbs)`;
}

export type ChatStackSurface = 'results' | 'hub';

export type BuildChatStackContextParams = {
  surface: ChatStackSurface;
  result: GeminiResult;
  quiz: IntakePayload | null | undefined;
  profile: StackProfile | null;
  preferredName: string;
  accountability: AccountabilityState;
  todayCheckIn: CheckIn | null;
  reminderTime: string | null;
};

function sanitizeContextText(raw: string, maxChars = 200): string {
  return raw
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/<\s*\/?\s*script/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
    .slice(0, maxChars);
}

/** Full quiz + stack string for Stacky on Results and Stack Hub (aligned with server /chat rules). */
export function buildChatStackContext({
  surface,
  result,
  quiz,
  profile,
  preferredName,
  accountability,
  todayCheckIn,
  reminderTime,
}: BuildChatStackContextParams): string {
  const goals = (quiz?.primaryGoals ?? []) as PrimaryGoal[];
  const goalsLine = goals.length ? `Primary goals: ${goals.join(', ')}` : 'Primary goals: not set.';
  const stackLines = result.supplements.map(
    (s, i) => `${i + 1}. ${s.name} | ${s.dosage} | ${s.timing} | benefit: ${s.keyBenefit}`,
  );

  const frustrationNote = quiz?.frustrationOther?.trim() ? sanitizeContextText(quiz.frustrationOther, 500) : '';
  const rxOther = quiz?.prescriptionMedicationOther?.trim()
    ? sanitizeContextText(quiz.prescriptionMedicationOther, 500)
    : '';
  const specificGoal = quiz?.specificGoal?.trim() ? sanitizeContextText(quiz.specificGoal, 200) : '';

  const quizFreeText = [
    'Quiz free-text the user typed (treat as high priority; weave into answers, do not ignore):',
    frustrationNote
      ? `Optional improvements / extra detail from quiz: ${frustrationNote}`
      : 'Optional improvements / extra detail from quiz: (none provided)',
    rxOther
      ? `Prescription "other" detail from quiz: ${rxOther}`
      : 'Prescription "other" detail from quiz: (none or not applicable)',
  ];

  const quizStructured = [
    'Structured quiz intake (respect alongside free-text above):',
    quiz?.symptomDuration ? `Symptom duration: ${quiz.symptomDuration}` : 'Symptom duration: not set',
    quiz?.currentFeelings?.length
      ? `Current feelings / symptoms selected: ${quiz.currentFeelings.join('; ')}`
      : 'Current feelings: not set',
    quiz?.biggestFrustrations?.length
      ? `Improvement priorities selected: ${quiz.biggestFrustrations.join('; ')}`
      : 'Improvement priorities: not set',
    quiz?.healthBackground?.length
      ? `Health background selections: ${quiz.healthBackground.join('; ')}`
      : 'Health background: not set',
    quiz?.prescriptionMedication
      ? `Prescription medication choice: ${quiz.prescriptionMedication}`
      : 'Prescription medication: not set',
    quiz?.dietaryPreferences?.length
      ? `Dietary preferences: ${quiz.dietaryPreferences.join(', ')}`
      : 'Dietary preferences: not set',
    quiz?.monthlyBudget ? `Monthly supplement budget: ${quiz.monthlyBudget}` : 'Monthly budget: not set',
  ];

  const profileLine = profile
    ? `Saved profile: ${profile.name}, updated ${new Date(profile.updatedAt).toLocaleDateString()}.`
    : 'No saved profile found.';
  const moodLine = `Latest check-in mood: ${todayCheckIn?.mood ?? 'not logged today'}${todayCheckIn?.note ? ` | note: ${todayCheckIn.note}` : ''}.`;
  const reminderLine = `Daily reminder time: ${reminderTime ?? 'not set'}.`;

  const intro =
    surface === 'hub'
      ? 'You are inside the StackWise Stack Hub. The user talks to Stacky, their guide for cutting through supplement confusion and marketing noise, with personalized guidance tied to their goals and stack.'
      : 'The user is viewing their StackWise results page with their personalized supplement guide.';

  const closing =
    surface === 'hub'
      ? 'Keep recommendations personalized to this profile and progress. End occasional supportive replies with a short playful "meow 🐾".'
      : 'Answer as Stacky: supportive, clear, not pushy. Educational guidance only.';

  return [
    intro,
    goalsLine,
    quiz?.mindset ? `User mindset: ${quiz.mindset}` : 'User mindset: not set.',
    specificGoal ? `Specific target goal (high priority): ${specificGoal}` : 'Specific target goal: not set.',
    quiz?.ageRange ? `Age range: ${quiz.ageRange}` : 'Age range: not set.',
    quiz?.biologicalSex ? `Biological sex: ${quiz.biologicalSex}` : 'Biological sex: not set.',
    preferredName.trim() ? `Preferred name to address user: ${preferredName.trim()}.` : 'Preferred name to address user: not set.',
    `Height: ${formatHeightForChat(quiz?.heightCm)}.`,
    `Weight: ${formatWeightForChat(quiz?.weightKg)}.`,
    '',
    ...quizFreeText,
    '',
    ...quizStructured,
    '',
    profileLine,
    moodLine,
    reminderLine,
    `Current streak: ${accountability.currentStreak} days. Longest streak: ${accountability.longestStreak}. Total check-ins: ${accountability.totalCheckins}.`,
    `Current stack has ${result.supplements.length} supplements:`,
    ...stackLines,
    `Morning schedule: ${result.dailySchedule.morning.join(', ') || 'none'}`,
    `Afternoon schedule: ${result.dailySchedule.afternoon.join(', ') || 'none'}`,
    `Evening schedule: ${result.dailySchedule.evening.join(', ') || 'none'}`,
    closing,
  ].join('\n');
}
