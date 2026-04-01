export type AgeRange = '18-25' | '26-35' | '36-45' | '46-55' | '55+';
export type BiologicalSex = 'Male' | 'Female' | 'Prefer not to say';

export type PrimaryGoal =
  | '🔥 Fat Loss'
  | '💪 Muscle & Strength'
  | '🫧 Debloating & Gut Health'
  | '⚡ Energy & Focus'
  | '🧠 Brain Enhancement'
  | '😴 Sleep & Recovery'
  | '🌿 Hormone Balance'
  | '🌸 Menopause Support'
  | '🛡️ Longevity & Immunity'
  | '💇 Hair Growth'
  | '✨ Skin Health & Glow'
  | '🪞 LooksMaxxing'
  | '💖 Sexual Health & Vitality'
  | '🧬 Peptide Optimization';

export type Mindset =
  | 'Beginner: I am new and want a clear personalized starting point'
  | 'Intermediate: I want to improve my health and consistency'
  | 'Advanced: I am already healthy and want precision optimization';

export type IntakePayload = {
  ageRange: AgeRange;
  biologicalSex: BiologicalSex;
  /** Height in centimeters; used for dosing/body-size context */
  heightCm: number;
  /** Weight in kilograms (often approximate) */
  weightKg: number;
  /** User indicated weight is approximate; default true in UI */
  weightIsApproximate?: boolean;
  mindset: Mindset;
  /** One highly specific outcome the user wants first (optional). */
  specificGoal?: string;
  /** First name from quiz; used in personalized timeline copy (optional). */
  preferredFirstName?: string;
  primaryGoals: PrimaryGoal[];
  currentFeelings: string[];
  healthBackground: string[];
  prescriptionMedication?: string;
  /** Required when prescriptionMedication is the "Other" option */
  prescriptionMedicationOther?: string;
  symptomDuration:
    | 'Less than 1 month'
    | '1-3 months'
    | '3-6 months'
    | '6-12 months'
    | 'Over 1 year'
    | 'As long as I can remember / my whole life';
  /** Selected frustration lines (multi-select) */
  biggestFrustrations: string[];
  /** Optional extra detail */
  frustrationOther?: string;
  dietaryPreferences: string[];
  monthlyBudget: '$30-$60' | 'Under $30' | '$60-$100' | '$100+' | '$150+';
};

export type Supplement = {
  name: string;
  tagline: string;
  /** Which quiz primary goals this supplement supports (from API); may be missing on older saved stacks */
  addressesGoals?: PrimaryGoal[];
  whyYouNeedThis: string;
  keyBenefit: string;
  whatYoullFeel: string;
  dosage: string;
  timing: string;
  estimatedMonthlyCostLow: number;
  estimatedMonthlyCostHigh: number;
  amazonSearchTerm: string;
  iHerbSearchTerm: string;
  /** Full Amazon product URL when provided (highest priority for buy links). */
  amazonUrl?: string;
  /** Amazon ASIN when provided. */
  amazonAsin?: string;
  /** Full iHerb product URL when provided. */
  iherbUrl?: string;
  /** iHerb site path (e.g. `/pr/...`) when provided. */
  iherbPath?: string;
  /** @deprecated Prefer `amazonUrl` / `amazonAsin`. Full Amazon URL or ASIN string. */
  amazonUrlOrAsin?: string;
  /** @deprecated Prefer `iherbUrl` / `iherbPath`. Full iHerb URL or path. */
  iHerbUrlOrPath?: string;
  evidenceStrength: 'Strong' | 'Moderate' | 'Emerging';
  timeToEffect: string;
};

export type DailySchedule = {
  morning: string[];
  afternoon: string[];
  evening: string[];
};

export type GeminiResult = {
  customerName: null | string;
  painPointHeadline: string;
  diagnosis: string;
  currentLifeDescription: string;
  solutionIntro: string;
  supplements: Supplement[];
  /** Optional add-on set driven by Super Focus target, separate from the base budget stack. */
  superFocusSupplements?: Supplement[];
  dailySchedule: DailySchedule;
  the30DayFeeling: string;
  the60DayFeeling: string;
  the90DayFeeling: string;
  totalMonthlyCostLow: number;
  totalMonthlyCostHigh: number;
  disclaimer: string;
};

// Accountability
export type CheckIn = {
  date: string; // ISO date string YYYY-MM-DD
  completed: boolean;
  mood?: 1 | 2 | 3 | 4 | 5; // optional 1-5 mood rating
  note?: string;
};

export type AccountabilityState = {
  checkins: CheckIn[];
  currentStreak: number;
  longestStreak: number;
  totalCheckins: number;
};

// Guidance Library entry (for peptides and cycling)
export type ProtocolEntry = {
  id: string;
  category: 'peptide' | 'cycle' | 'stack';
  name: string;
  tagline: string;
  proOnly: boolean;
};

