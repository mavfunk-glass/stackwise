import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ProgressBar from '../components/ProgressBar';
import LoadingOverlay from '../components/LoadingOverlay';
import HealthFactPopup, { useFactPopups } from '../components/HealthFactPopup';
import StackyCat, { type StackyMood, type StackyOutfit } from '../components/StackyCat';
import type {
  AgeRange,
  BiologicalSex,
  GeminiResult,
  IntakePayload,
  Mindset,
  PrimaryGoal,
} from '../types/stackwise';
import {
  getSubscriptionTier,
  isBasicOrPro,
  loadStoredState,
  pushStackArchiveEntry,
  saveQuiz,
  saveResult,
  getUserName,
  setUserName,
  mustUpgradeToRebuildStack,
} from '../types/storage';

import { apiUrl } from '../api/apiUrl';
import { apiAuthHeaders, ensureApiSession } from '../api/session';
import { REBUILD_GATE_BODY, REBUILD_SUBMIT_ERROR } from '../copy/rebuildStackUpsell';
import { GOAL_THEME, splitPrimaryGoal } from '../utils/goalTheme';

/** Free tier only: max primary goals in the quiz. Basic and Pro can select unlimited. */
const FREE_MAX_PRIMARY_GOALS = 4;
/** Free users cannot select these; Basic and Pro can. */
const PAID_ONLY_PRIMARY_GOALS: PrimaryGoal[] = ['🪞 LooksMaxxing'];
/** Only Pro may select these (Basic and free are locked). */
const PRO_ONLY_PRIMARY_GOALS: PrimaryGoal[] = ['🧬 Peptide Optimization'];

/** Step 4 (Improvements): max frustration / “what matters most” picks */
const MAX_STEP4_IMPROVEMENT_PICKS = 5;

/** Free-text on step 4 health background (e.g. prescription “other”) */
const MAX_STEP4_TEXT_CHARS = 500;

/** Step 4 Improvements: optional `frustrationOther` payload cap (no in-quiz editor) */
const MAX_STEP4_IMPROVEMENT_OPTIONAL_DETAIL_CHARS = 50;

/** Super Focus: free-text beyond normal goal picks */
const MAX_SUPER_FOCUS_CHARS = 200;

/** When goal/biology changes invalidate prior picks, avoid stranding users on the budget step with an empty payload. */
const DEFAULT_CURRENT_FEELINGS_FALLBACK: string[] = ['General wellness and symptom support'];

function sanitizeSuperFocusText(raw: string): string {
  return raw
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/<\s*\/?\s*script/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trimStart()
    .slice(0, MAX_SUPER_FOCUS_CHARS);
}

/** Stored "Skip" is a sentinel for skipping the name step; never show it in the name input. */
function introNameDraftFromStorage(): string {
  const raw = getUserName()?.trim() ?? '';
  return /^skip$/i.test(raw) ? '' : raw;
}

type Budget = '$30-$60' | 'Under $30' | '$60-$100' | '$100+' | '$150+';
type QuizDraft = Partial<IntakePayload>;

function toggleInArray<T>(arr: T[], item: T) {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

function ftInToCm(ft: number, inches: number): number {
  return Math.round((ft * 12 + inches) * 2.54 * 10) / 10;
}

function cmToFtIn(cm: number): { ft: number; inches: number } {
  const totalIn = cm / 2.54;
  const ft = Math.floor(totalIn / 12);
  let inches = Math.round(totalIn - ft * 12);
  if (inches === 12) return { ft: ft + 1, inches: 0 };
  return { ft, inches };
}

function lbsToKg(lbs: number): number {
  if (!Number.isFinite(lbs) || lbs <= 0) return NaN;
  return Math.round(lbs * 0.45359237 * 100) / 100;
}

function kgToLbs(kg: number): number {
  if (!Number.isFinite(kg) || kg <= 0) return NaN;
  return Math.round((kg / 0.45359237) * 10) / 10;
}

function isValidBodyMetrics(heightCm: number | undefined, weightKg: number | undefined): boolean {
  if (heightCm == null || weightKg == null) return false;
  if (!Number.isFinite(heightCm) || !Number.isFinite(weightKg)) return false;
  return heightCm >= 100 && heightCm <= 250 && weightKg >= 30 && weightKg <= 300;
}

/** Restore full draft from a saved quiz (used when skipping step 1 for returning users). */
function intakePayloadToDraft(q: IntakePayload): QuizDraft {
  return {
    ageRange: q.ageRange,
    biologicalSex: q.biologicalSex,
    heightCm: q.heightCm,
    weightKg: q.weightKg,
    weightIsApproximate: q.weightIsApproximate !== false,
    mindset: q.mindset,
    specificGoal: q.specificGoal ?? '',
    primaryGoals: q.primaryGoals ?? [],
    currentFeelings: q.currentFeelings ?? [],
    healthBackground: q.healthBackground ?? [],
    biggestFrustrations: q.biggestFrustrations ?? [],
    prescriptionMedication: q.prescriptionMedication,
    prescriptionMedicationOther: q.prescriptionMedicationOther,
    symptomDuration: q.symptomDuration,
    frustrationOther: q.frustrationOther,
    dietaryPreferences: q.dietaryPreferences ?? [],
    monthlyBudget: q.monthlyBudget,
  };
}

/** One focused screen at a time; progress bar shows momentum without numbered steps. */
const TOTAL_STEPS = 15;

const QUIZ_SLIDE_META = [
  {
    headline: "Let's start with you",
    sub: 'Stacky cuts through supplement noise and marketing pressure to build a plan around your goals and what you actually need. A few minutes here becomes your personalized guide with clear reasoning for what fits. Stacky stays with you after the quiz too, with refreshed guidance when your goals shift.',
    trust: 'Private · On-device only',
  },
  {
    headline: 'How do you identify?',
    sub: 'So your recommendations match your biology, not a generic template.',
    trust: '',
  },
  {
    headline: 'Height & weight',
    sub: 'Approximate is fine for weight. We use this to personalize dosing context and goals like body composition, not to judge you.',
    trust: '',
  },
  {
    headline: 'What are you optimizing for?',
    sub: 'Tell Stacky what your personalized plan should prioritize. You can pick several areas.',
    trust: '',
  },
  {
    headline: 'What feels off lately?',
    sub: 'Tailored to your goals on the next screen.',
    trust: '',
  },
  {
    headline: 'How long has this been going on?',
    sub: 'Rough estimate is fine. Context helps us meet you where you are.',
    trust: '',
  },
  {
    headline: 'Your health story',
    sub: 'Each section below has its own “None of these apply to me.” Pick specific items, or that option when a group is not relevant.',
    trust: '',
  },
  {
    headline: 'A little more context',
    sub: 'Same for each section: choose what applies, or None of these apply to me for that section only.',
    trust: '',
  },
  {
    headline: 'Finishing your health picture',
    sub: 'Complete every section: either select conditions or None of these apply to me for that section.',
    trust: '',
  },
  {
    headline: 'Prescription details',
    sub: 'Only if you take prescription meds, so your guide stays safe alongside what you already use.',
    trust: '',
  },
  {
    headline: "What's getting in your way?",
    sub: 'Energy, mind, body: we want the real blockers so your guide can address them.',
    trust: '',
  },
  {
    headline: 'How is this showing up day to day?',
    sub: 'Mood, drive, and life impact: the more honest you are, the more tailored your guide.',
    trust: '',
  },
  {
    headline: 'Anything else we should know?',
    sub: 'Optional but helpful. Any extra context helps Stacky shape your guide so it fits you better.',
    trust: '',
  },
  {
    headline: 'How do you eat?',
    sub: 'So we only suggest forms and ingredients that fit how you actually live.',
    trust: '',
  },
  {
    headline: 'What feels right for your budget?',
    sub: "We'll build the strongest one-on-one stack we can within what works for you.",
    trust: '',
  },
];

/** Goal-specific “what feels off” prompts; labels are sent with the intake payload */
const FEELINGS_BY_GOAL: Record<PrimaryGoal, { emoji: string; label: string }[]> = {
  '🔥 Fat Loss': [
    { emoji: '⚖️', label: 'Weight will not budge despite effort' },
    { emoji: '🍫', label: 'Cravings or stress eating derail me' },
    { emoji: '🫧', label: 'Bloating makes me look heavier than I am' },
    { emoji: '📉', label: 'Energy crashes after meals' },
    { emoji: '🐢', label: 'Easy weight gain or “slow metabolism” feel' },
  ],
  '💪 Muscle & Strength': [
    { emoji: '📊', label: 'Strength has plateaued' },
    { emoji: '🚀', label: 'I want to enhance my performance in the gym' },
    { emoji: '⏳', label: 'Recovery takes much longer than it used to' },
    { emoji: '🧩', label: 'I want to enhance my recovery between sessions' },
    { emoji: '♻️', label: 'Soreness lingers for days' },
    { emoji: '📉', label: 'Losing muscle while trying to cut' },
    { emoji: '🏋️', label: 'Workouts feel flat: low pump or endurance' },
  ],
  '🫧 Debloating & Gut Health': [
    { emoji: '🫧', label: 'Constant bloating or distension' },
    { emoji: '🚻', label: 'Irregular bowel habits' },
    { emoji: '🥗', label: 'Reactions or discomfort after certain foods' },
    { emoji: '🤢', label: 'Nausea or discomfort after eating' },
    { emoji: '✨', label: 'Gut feels “off” even on clean days' },
  ],
  '⚡ Energy & Focus': [
    { emoji: '📉', label: 'Hard afternoon crashes' },
    { emoji: '🌫️', label: 'Brain fog or slow thinking' },
    { emoji: '☕', label: 'Depend on caffeine to function' },
    { emoji: '⚡', label: 'Wired but exhausted at the same time' },
    { emoji: '🎯', label: 'Hard to focus for long stretches' },
  ],
  '🧠 Brain Enhancement': [
    { emoji: '🧩', label: 'Memory slips or forgetfulness' },
    { emoji: '🪫', label: 'Mental fatigue by midday' },
    { emoji: '🐢', label: 'Learning or processing feels slower' },
    { emoji: '🌫️', label: 'Cloudy thinking or brain fog' },
  ],
  '😴 Sleep & Recovery': [
    { emoji: '🌙', label: 'Takes forever to fall asleep' },
    { emoji: '😮‍💨', label: 'Wake up tired even after enough hours' },
    { emoji: '🔋', label: 'I want to enhance my recovery quality overnight' },
    { emoji: '🕛', label: 'Waking up during the night' },
    { emoji: '💤', label: 'Light, restless sleep' },
  ],
  '🌿 Hormone Balance': [
    { emoji: '🎢', label: 'Mood swings or irritability' },
    { emoji: '📅', label: 'Irregular cycles or strong cycle-related symptoms' },
    { emoji: '💥', label: 'Strong PMS or monthly crashes' },
    { emoji: '💔', label: 'Libido or drive changes' },
    { emoji: '⚖️', label: 'Unexplained weight or skin changes' },
  ],
  '🌸 Menopause Support': [
    { emoji: '🔥', label: 'Hot flashes or sudden warmth' },
    { emoji: '💧', label: 'Night sweats disrupting sleep' },
    { emoji: '😴', label: 'Sleep is harder than it used to be' },
    { emoji: '🌫️', label: 'Brain fog or mood swings' },
    { emoji: '📐', label: 'Weight shifting around the midsection' },
  ],
  '🛡️ Longevity & Immunity': [
    { emoji: '🤧', label: 'Frequent colds or slow recovery from illness' },
    { emoji: '🪫', label: 'General low energy or fatigue' },
    { emoji: '🔥', label: 'Inflammation, aches, or feeling puffy' },
    { emoji: '📆', label: 'Feeling older than my age' },
  ],
  '💇 Hair Growth': [
    { emoji: '📉', label: 'Noticeable thinning or shedding' },
    { emoji: '🐢', label: 'Hair grows slower than it used to' },
    { emoji: '💔', label: 'Brittle or weak strands' },
    { emoji: '📍', label: 'Thinning at the hairline or crown' },
  ],
  '✨ Skin Health & Glow': [
    { emoji: '🌫️', label: 'Dull or tired-looking skin' },
    { emoji: '🔴', label: 'Breakouts or reactive skin' },
    { emoji: '🎨', label: 'Uneven tone, rough texture, or visible pores' },
    { emoji: '〰️', label: 'Fine lines or loss of elasticity' },
    { emoji: '💧', label: 'Dry, tight, or easily irritated skin' },
  ],
  '🪞 LooksMaxxing': [
    { emoji: '🫧', label: 'Face looks puffy or bloated, especially in the morning or photos' },
    { emoji: '✨', label: 'I want a healthy radiance people notice, not just a clear routine' },
    { emoji: '📸', label: 'My face reads softer or puffier in photos than I want' },
    { emoji: '💇', label: 'Hair density or quality not matching the look I want' },
  ],
  '💖 Sexual Health & Vitality': [
    { emoji: '💕', label: 'Lower libido or desire than I want' },
    { emoji: '🔁', label: 'Drive or arousal feels inconsistent' },
    { emoji: '🔋', label: 'Energy or stamina not there when it matters' },
    { emoji: '😔', label: 'Stress, mood, or confidence affecting intimacy' },
    { emoji: '🩸', label: 'Want better blood flow and circulation support' },
  ],
  '🧬 Peptide Optimization': [
    { emoji: '🧪', label: 'Want recovery or injury support beyond basic supplements' },
    { emoji: '📈', label: 'Interested in GH-related or metabolic peptides' },
    { emoji: '🧘', label: 'Exploring cognitive or mood peptides (Selank, Semax, etc.)' },
    { emoji: '🔁', label: 'Need help with cycling, timing, or stacking with my stack' },
    { emoji: '🛡️', label: 'Want safety-first education before trying anything advanced' },
  ],
};

const COMMON_FEELINGS: { emoji: string; label: string }[] = [
  { emoji: '😟', label: 'Low mood or anxiety' },
  { emoji: '🦴', label: 'Joint pain or inflammation' },
  { emoji: '🛡️', label: 'Frequent illness or low immunity' },
  { emoji: '😰', label: 'High stress or burnout' },
];

const ALL_PRIMARY_GOALS = Object.keys(FEELINGS_BY_GOAL) as PrimaryGoal[];

const FRUSTRATIONS_BY_GOAL: Record<PrimaryGoal, string[]> = {
  '🔥 Fat Loss': [
    "My weight won't move no matter what I do",
    'I feel bloated or uncomfortable after eating',
    "I hit a wall every afternoon and can't push through",
    "I'm running on caffeine just to feel normal",
    'My body feels inflamed, stiff, or puffy',
    'I want appetite and cravings easier to manage while I work on body composition',
  ],
  '💪 Muscle & Strength': [
    'I feel weaker than I should, like my strength is gone',
    "I've stopped working out or can't recover the way I used to",
    "I wake up exhausted no matter how much I sleep",
    'I want training recovery and muscle repair support from my stack',
    'I want strength and power output supported alongside my nutrition',
  ],
  '🫧 Debloating & Gut Health': [
    'I feel bloated or uncomfortable after eating',
    'My body feels inflamed, stiff, or puffy',
    "I wake up exhausted no matter how much I sleep",
    'I want gut comfort and regular digestion supported by supplements day to day',
    "My weight won't move no matter what I do",
  ],
  '⚡ Energy & Focus': [
    "I hit a wall every afternoon and can't push through",
    "My mind feels slow, like I'm thinking through fog",
    "I'm running on caffeine just to feel normal",
    'I feel wired but exhausted at the same time',
    "I can't focus or stay on task the way I used to",
    "I'm not performing the way I want to at work",
  ],
  '🧠 Brain Enhancement': [
    "My mind feels slow, like I'm thinking through fog",
    "I can't focus or stay on task the way I used to",
    "I'm not performing the way I want to at work",
    'My drive and motivation feel completely gone',
    'I feel wired but exhausted at the same time',
    "I hit a wall every afternoon and can't push through",
  ],
  '😴 Sleep & Recovery': [
    "I wake up exhausted no matter how much I sleep",
    'I feel wired but exhausted at the same time',
    "I've stopped working out or can't recover the way I used to",
    'I have trouble falling or staying asleep and want supplement support for sleep quality',
    'I want training recovery and muscle repair support from my stack',
  ],
  '🌿 Hormone Balance': [
    'My hormones feel out of control: mood swings, PMS, crashes',
    "I'm irritable or short-tempered and I hate it",
    'I feel low, flat, or disconnected from life',
    'I feel anxious or like my thoughts won\'t slow down',
    'I want cycle-related mood and energy smoother with supplement support',
  ],
  '🌸 Menopause Support': [
    'My hormones feel out of control: mood swings, PMS, crashes',
    "I wake up exhausted no matter how much I sleep",
    "My mind feels slow, like I'm thinking through fog",
    'I feel older than I am, like something shifted',
    'I want menopause symptoms (sleep, mood, temperature) better supported with a supplement strategy',
  ],
  '🛡️ Longevity & Immunity': [
    "I keep getting sick or can't shake illness",
    'My body feels inflamed, stiff, or puffy',
    'I feel older than I am, like something shifted',
    "I wake up exhausted no matter how much I sleep",
    'I want daily immune resilience supported by my stack',
    'I want longevity-focused cellular and metabolic support from my stack',
  ],
  '💇 Hair Growth': [
    'My hair is thinning or not growing like it used to',
    'I want my hairline and overall hair density to look stronger',
    'I want scalp and follicle support from inside-out with supplements',
  ],
  '✨ Skin Health & Glow': [
    'My skin looks dull, tired, or broken out',
    'I want clearer skin texture and a more even tone',
    'I want my under-eye area to look fresher and less tired',
    'I want collagen, barrier, and UV-exposure support from my stack',
  ],
  '🪞 LooksMaxxing': [
    'I want my face to look tighter and less puffy in photos',
    'I want clearer skin texture and a more even tone',
    'I want my hairline and overall hair density to look stronger',
    'I want a sharper side profile and better facial structure',
  ],
  '💖 Sexual Health & Vitality': [
    'My sexual performance feels weaker than I want',
    'I want blood flow, energy, and stamina support for intimacy',
    'My drive and motivation feel completely gone',
    'My hormones feel out of control: mood swings, PMS, crashes',
    'I want libido and confidence supported alongside my health stack',
  ],
  '🧬 Peptide Optimization': [
    'Recovery between hard sessions still lags — I want advanced options that fit my stack',
    'I am exploring metabolic, GH-axis, or body-recomp peptides alongside supplements',
    'I want cognitive- or stress-related peptides considered next to my daily stack',
    'I need peptide timing, cycling, and interaction guidance with pills and powders I already take',
    'Injury or tissue repair — I want peptide-level education beyond basic supplements',
    "I've stopped working out or can't recover the way I used to",
    'My body feels inflamed, stiff, or puffy',
  ],
};

function getFeelingSectionsForGoals(
  primaryGoals: PrimaryGoal[],
  goalLabelByValue: Map<PrimaryGoal, string>,
): { sectionKey: string; goalLabel: string; items: { emoji: string; label: string }[] }[] {
  const seen = new Set<string>();
  const sections: { sectionKey: string; goalLabel: string; items: { emoji: string; label: string }[] }[] = [];

  const pushSection = (sectionKey: string, goalLabel: string, raw: { emoji: string; label: string }[]) => {
    const items = raw.filter((it) => {
      if (seen.has(it.label)) return false;
      seen.add(it.label);
      return true;
    });
    if (items.length) sections.push({ sectionKey, goalLabel, items });
  };

  if (primaryGoals.length === 0) {
    for (const g of ALL_PRIMARY_GOALS) {
      pushSection(g, goalLabelByValue.get(g) ?? g, FEELINGS_BY_GOAL[g] ?? []);
    }
    return sections;
  }

  for (const g of primaryGoals) {
    pushSection(g, goalLabelByValue.get(g) ?? g, FEELINGS_BY_GOAL[g] ?? []);
  }
  return sections;
}

const REPRODUCTIVE_LIFE_STAGE_CATEGORY = 'Reproductive & Life Stage';

/** Split category list across steps 6-8 as evenly as possible */
function splitIntoThreeChunks<T>(items: T[]): [T[], T[], T[]] {
  const n = items.length;
  if (n === 0) return [[], [], []];
  const a = Math.ceil(n / 3);
  const b = Math.ceil((n - a) / 2);
  return [items.slice(0, a), items.slice(a, a + b), items.slice(a + b)];
}

const MEDICATIONS_CATEGORY = 'Medications & Treatments';

/** Selecting this requires `prescriptionMedicationOther` (free text). */
const PRESCRIPTION_OTHER_OPTION = 'Other (describe below)';

/** Stored in healthBackground so the model sees per-section answers */
function noneCategoryToken(categoryName: string): string {
  return `None of these apply (${categoryName})`;
}

function isCategoryAnswered(hb: string[], cat: { category: string; options: string[] }): boolean {
  if (hb.includes(noneCategoryToken(cat.category))) return true;
  return cat.options.some((opt) => hb.includes(opt));
}

/** Stacky bubble on step 3 after “how long” — tailored by duration. */
function stackyFollowUpForSymptomDuration(sd: string | undefined): string {
  switch (sd) {
    case 'Less than 1 month':
      return 'Since this is newer, I will keep your guide practical and easy to adjust as you see what helps. 🐾';
    case '1-3 months':
      return 'A few months in, we can balance quick wins with habits that are realistic to keep. 🐾';
    case '3-6 months':
      return 'That is enough time for patterns to show, so I will emphasize steady support and clear next steps. 🐾';
    case '6-12 months':
      return 'Longer timelines deserve patience. I will lean toward sustainable pacing in your guide. 🐾';
    case 'Over 1 year':
      return 'You have carried this for a while. I will prioritize gentle, sustainable angles and realistic timelines. 🐾';
    case 'As long as I can remember / my whole life':
      return 'If this has been part of your story for ages, I will focus on foundational support and manageable changes. 🐾';
    default:
      return 'No wrong answers. I will fold what you picked into a plan that fits what you want. 🐾';
  }
}

export default function QuizPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const quickRebuildAppliedRef = useRef(false);
  const subscriptionTier = getSubscriptionTier();
  const isProUser = subscriptionTier === 'pro';
  const isFreeTier = subscriptionTier === 'free';

  type StepStackyConfig = { mood: StackyMood; outfit: StackyOutfit };
  const STEP_STACKY_CONFIG: Record<number, StepStackyConfig> = {
    1: { mood: 'wave', outfit: 'default' },
    2: { mood: 'excited', outfit: 'workout' },
    3: { mood: 'happy', outfit: 'default' },
    4: { mood: 'nervous', outfit: 'labCoat' },
    5: { mood: 'happy', outfit: 'chef' },
    6: { mood: 'excited', outfit: 'crown' },
  };
  function getStepStacky(s: number): StepStackyConfig {
    const config = STEP_STACKY_CONFIG[s] ?? { mood: 'wave', outfit: 'default' };
    const outfit = isProUser && config.outfit !== 'labCoat' ? ('cowboy' as const) : config.outfit;
    return { mood: config.mood, outfit };
  }
  const [step, setStep] = useState(1);
  const prevStepRef = useRef(step);
  const [draft, setDraft] = useState<QuizDraft>({
    primaryGoals: [],
    specificGoal: '',
    currentFeelings: [],
    healthBackground: [],
    biggestFrustrations: [],
    dietaryPreferences: [],
    weightIsApproximate: true,
  });
  const [bodyUnit, setBodyUnit] = useState<'metric' | 'imperial'>('imperial');
  /** Imperial lb field must not round-trip through kg on each keystroke; that breaks typing. */
  const [weightLbsInput, setWeightLbsInput] = useState('');
  /** Metric kg field: same idea as lbs — keep raw string while typing. */
  const [weightKgInput, setWeightKgInput] = useState('');
  const [openHealthCategory, setOpenHealthCategory] = useState<string | null>(null);
  /** Step 3: personalize goal detail vs optional Super Focus (same UX pattern as step 4). */
  const [step3SubSlide, setStep3SubSlide] = useState<'personalize' | 'superFocus'>('personalize');
  const [step4SubSlide, setStep4SubSlide] = useState<'background' | 'frustrations'>('background');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserNameLocal] = useState('');
  const [nameDraft, setNameDraft] = useState(() => introNameDraftFromStorage());
  const [hasCompletedNamePrompt, setHasCompletedNamePrompt] = useState(false);
  const { showFact, factIdx, maybeShowFact, dismissFact } = useFactPopups();

  /** Step 2: show upgrade explainer before sending users to pricing (avoid instant redirect). */
  const [step2UpgradeGate, setStep2UpgradeGate] = useState<
    null | { reason: 'max_goals' } | { reason: 'paid_goal'; label: string } | { reason: 'pro_goal'; label: string }
  >(null);

  useEffect(() => {
    if (step !== 2) setStep2UpgradeGate(null);
  }, [step]);

  useEffect(() => {
    const prev = prevStepRef.current;
    prevStepRef.current = step;
    if (step === 4 && prev === 3) {
      setOpenHealthCategory(MEDICATIONS_CATEGORY);
    }
  }, [step]);

  useEffect(() => {
    if (!step2UpgradeGate) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setStep2UpgradeGate(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step2UpgradeGate]);

  useEffect(() => {
    if (step !== 1 || bodyUnit !== 'imperial') return;
    if (draft.weightKg != null && Number.isFinite(draft.weightKg)) {
      setWeightLbsInput(String(Math.round(kgToLbs(draft.weightKg))));
    } else {
      setWeightLbsInput('');
    }
  }, [step, bodyUnit]);

  useEffect(() => {
    if (step !== 1 || bodyUnit !== 'metric') return;
    if (draft.weightKg != null && Number.isFinite(draft.weightKg)) {
      setWeightKgInput(String(draft.weightKg));
    } else {
      setWeightKgInput('');
    }
  }, [step, bodyUnit]);

  useEffect(() => {
    if (step !== 4) setStep4SubSlide('background');
  }, [step]);

  useEffect(() => {
    if (step !== 3) setStep3SubSlide('personalize');
  }, [step]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [step]);

  /** Returning users: skip Meet Stacky + step 1, hydrate from last quiz, start at goals (step 2). */
  useEffect(() => {
    if (quickRebuildAppliedRef.current) return;
    const st = location.state as { quickRebuild?: boolean } | null;
    if (!st?.quickRebuild) return;

    const { quiz: saved } = loadStoredState();
    if (!saved?.ageRange || !saved.biologicalSex || !saved.mindset) return;

    quickRebuildAppliedRef.current = true;
    setDraft((prev) => ({ ...prev, ...intakePayloadToDraft(saved) }));
    setHasCompletedNamePrompt(true);
    const nm = getUserName() ?? '';
    setNameDraft(introNameDraftFromStorage());
    setUserNameLocal(nm);
    if (saved.weightKg != null && Number.isFinite(saved.weightKg)) {
      setWeightLbsInput(String(Math.round(kgToLbs(saved.weightKg))));
      setWeightKgInput(String(saved.weightKg));
    }
    setStep(2);
    navigate('.', { replace: true, state: {} });
  }, [location.state, navigate]);

  const ageRanges: AgeRange[] = useMemo(() => ['18-25', '26-35', '36-45', '46-55', '55+'], []);
  const mindsetOptions: { value: Mindset; label: string; sub: string }[] = useMemo(
    () => [
      {
        value: 'Beginner: I am new and want a clear personalized starting point',
        label: 'Beginner',
        sub: 'I am new and want a clear personalized starting point.',
      },
      {
        value: 'Intermediate: I want to improve my health and consistency',
        label: 'Intermediate',
        sub: 'I want to improve my health and become more consistent.',
      },
      {
        value: 'Advanced: I am already healthy and want precision optimization',
        label: 'Advanced / Optimizing',
        sub: 'I am already healthy and want precision optimization.',
      },
    ],
    [],
  );

  const goals: { value: PrimaryGoal; icon: string; label: string; description: string }[] = useMemo(
    () => [
      { value: '🔥 Fat Loss', icon: '🔥', label: 'Fat Loss', description: "Burn the stubborn fat that diet and exercise alone won't shift." },
      { value: '💪 Muscle & Strength', icon: '💪', label: 'Muscle & Strength', description: 'Build real strength, recover faster, and see results that stick.' },
      { value: '🫧 Debloating & Gut Health', icon: '🫧', label: 'Gut Health', description: 'Support digestion, reduce bloating, and feel more comfortable day to day.' },
      { value: '⚡ Energy & Focus', icon: '⚡', label: 'Energy & Focus', description: 'Replace the crashes and fog with clean, all-day energy.' },
      { value: '🧠 Brain Enhancement', icon: '🧠', label: 'Brain Enhancement', description: 'Sharper memory, faster thinking, and long-term cognitive protection.' },
      { value: '😴 Sleep & Recovery', icon: '😴', label: 'Sleep & Recovery', description: 'Actually wake up rested. Deep sleep changes everything.' },
      { value: '🌿 Hormone Balance', icon: '🌿', label: 'Hormone Balance', description: 'Stabilize the swings that are quietly running your life.' },
      { value: '🌸 Menopause Support', icon: '🌸', label: 'Menopause Support', description: 'Navigate this transition with your energy, mood, and body intact.' },
      { value: '🛡️ Longevity & Immunity', icon: '🛡️', label: 'Longevity & Immunity', description: 'Build the foundation for a longer, stronger, healthier life.' },
      { value: '💇 Hair Growth', icon: '💇', label: 'Hair Growth', description: "Feed your follicles what they're missing and stop the shedding." },
      {
        value: '✨ Skin Health & Glow',
        icon: '✨',
        label: 'Skin & Glow',
        description:
          'Clearer, smoother, stronger skin: nutrients for texture, breakouts, and elasticity alongside your skincare.',
      },
      {
        value: '🪞 LooksMaxxing',
        icon: '🪞',
        label: 'LooksMaxxing',
        description:
          'Debloat your face, build a real skin glow, and optimize the health markers that let you reach your maximum biological attractiveness.',
      },
      {
        value: '💖 Sexual Health & Vitality',
        icon: '💖',
        label: 'Sexual Health',
        description: 'Libido, blood flow, and confidence, with options tailored to your biology.',
      },
      {
        value: '🧬 Peptide Optimization',
        icon: '🧬',
        label: 'Peptide Optimization',
        description: 'Stack peptides like BPC-157, Ipamorelin, and Selank alongside your supplements for advanced results.',
      },
    ],
    [],
  );

  const goalLabelByValue = useMemo(() => new Map(goals.map((g) => [g.value, g.label])), [goals]);

  const visibleGoals = useMemo(() => {
    const sex = draft.biologicalSex;
    if (!sex) return goals;
    if (sex === 'Male') {
      return goals.filter((g) => g.value !== '🌸 Menopause Support');
    }
    if (sex === 'Female') {
      return goals.filter((g) => g.value !== '💖 Sexual Health & Vitality');
    }
    return goals.filter(
      (g) => g.value !== '🌸 Menopause Support' && g.value !== '💖 Sexual Health & Vitality',
    );
  }, [goals, draft.biologicalSex]);

  // Step 2 goal categories (UI organization only; values saved stay the same).
  const goalGroups = useMemo(() => {
    const groupKeyByGoal = (goalValue: PrimaryGoal): string => {
      switch (goalValue) {
        case '🔥 Fat Loss':
        case '💪 Muscle & Strength':
        case '🪞 LooksMaxxing':
        case '✨ Skin Health & Glow':
        case '💇 Hair Growth':
          return 'Physical Transformation';
        case '🫧 Debloating & Gut Health':
          return 'Gut & Comfort';
        case '⚡ Energy & Focus':
        case '🧠 Brain Enhancement':
          return 'Mind & Energy';
        case '😴 Sleep & Recovery':
          return 'Sleep & Recovery';
        case '🌿 Hormone Balance':
        case '💖 Sexual Health & Vitality':
        case '🌸 Menopause Support':
          return 'Hormones & Vitality';
        case '🛡️ Longevity & Immunity':
          return 'Longevity & Immunity';
        case '🧬 Peptide Optimization':
          return 'Pro Optimization';
        default:
          return 'Other';
      }
    };

    const order = [
      'Physical Transformation',
      'Gut & Comfort',
      'Mind & Energy',
      'Sleep & Recovery',
      'Hormones & Vitality',
      'Longevity & Immunity',
      'Pro Optimization',
    ];

    const map = new Map<string, typeof goals>();
    for (const g of visibleGoals) {
      const k = groupKeyByGoal(g.value);
      const arr = map.get(k) ?? [];
      map.set(k, [...arr, g]);
    }

    return order
      .filter((k) => (map.get(k) ?? []).length > 0)
      .map((k) => ({ key: k, goals: map.get(k) ?? [] }));
  }, [visibleGoals]);

  useEffect(() => {
    const sex = draft.biologicalSex;
    if (!sex) return;
    setDraft((d) => {
      const cur = d.primaryGoals ?? [];
      let next = cur;
      if (sex === 'Male') {
        next = cur.filter((g) => g !== '🌸 Menopause Support');
      } else if (sex === 'Female') {
        next = cur.filter((g) => g !== '💖 Sexual Health & Vitality');
      } else {
        next = cur.filter(
          (g) => g !== '🌸 Menopause Support' && g !== '💖 Sexual Health & Vitality',
        );
      }
      if (next.length === cur.length) return d;
      return { ...d, primaryGoals: next };
    });
  }, [draft.biologicalSex]);

  useEffect(() => {
    if (isProUser) return;
    setDraft((d) => {
      const cur = d.primaryGoals ?? [];
      const next = cur.filter((g) => !PRO_ONLY_PRIMARY_GOALS.includes(g));
      if (next.length === cur.length) return d;
      return { ...d, primaryGoals: next };
    });
  }, [isProUser]);

  const feelingSections = useMemo(
    () => getFeelingSectionsForGoals(draft.primaryGoals ?? [], goalLabelByValue),
    [draft.primaryGoals, goalLabelByValue],
  );

  const availableFeelingLabels = useMemo(() => {
    const set = new Set<string>();
    for (const s of feelingSections) {
      for (const it of s.items) set.add(it.label);
    }
    return set;
  }, [feelingSections]);

  useEffect(() => {
    if (step !== 5) return;
    setDraft((d) => {
      const prev = d.currentFeelings ?? [];
      const next = prev.filter((x) => availableFeelingLabels.has(x));
      if (next.length === prev.length) return d;
      if (next.length > 0) return { ...d, currentFeelings: next };
      const fallbackLabel =
        availableFeelingLabels.size > 0 ? Array.from(availableFeelingLabels)[0] : undefined;
      return {
        ...d,
        currentFeelings: fallbackLabel ? [fallbackLabel] : [...DEFAULT_CURRENT_FEELINGS_FALLBACK],
      };
    });
  }, [step, draft.primaryGoals, availableFeelingLabels]);

  const feelingsStepMeta = useMemo(() => {
    if (step !== 5) return null;
    const pg = draft.primaryGoals ?? [];
    const n = pg.length;
    const labels = pg.map((g) => goalLabelByValue.get(g) ?? g);
    const nameStr =
      n === 0 ? '' : n <= 2 ? labels.join(' & ') : `${labels.slice(0, 2).join(', ')} +${n - 2} more`;
    return {
      headline: "What's feeling off for you?",
      sub:
        n === 0
          ? "Select what matches how you've felt lately."
          : `Below are tailored prompts for your goals${nameStr ? ` (${nameStr})` : ''}. Pick anything that feels true recently.`,
      trust: '',
    };
  }, [step, draft.primaryGoals, goalLabelByValue]);

  const prescriptionStepMeta = useMemo(() => {
    if (step !== 10) return null;
    const hb = draft.healthBackground ?? [];
    const needRxDetail =
      !hb.includes(noneCategoryToken(MEDICATIONS_CATEGORY)) &&
      hb.includes('Taking prescription medication (any)');
    if (needRxDetail) {
      return {
        headline: 'Which type of prescription?',
        sub: 'Choose the closest match. We use this to avoid supplement and drug interactions.',
        trust: '' as const,
      };
    }
    return {
      headline: 'Prescription check',
      sub: 'You did not flag prescription medication in your health story, so there is nothing to add here.',
      trust: '' as const,
    };
  }, [step, draft.healthBackground]);

  useEffect(() => {
    const hb = draft.healthBackground ?? [];
    const needRxDetail =
      !hb.includes(noneCategoryToken(MEDICATIONS_CATEGORY)) &&
      hb.includes('Taking prescription medication (any)');
    if (needRxDetail) return;
    setDraft((d) =>
      d.prescriptionMedication || d.prescriptionMedicationOther
        ? { ...d, prescriptionMedication: undefined, prescriptionMedicationOther: undefined }
        : d,
    );
  }, [draft.healthBackground]);

  useEffect(() => {
    if (draft.prescriptionMedication === PRESCRIPTION_OTHER_OPTION) return;
    if (!draft.prescriptionMedicationOther) return;
    setDraft((d) => ({ ...d, prescriptionMedicationOther: undefined }));
  }, [draft.prescriptionMedication, draft.prescriptionMedicationOther]);

  const backgroundCategories = useMemo<{ category: string; icon: string; options: string[] }[]>(
    () => [
      {
        category: 'Hormonal & Metabolic',
        icon: '🌿',
        options: [
          'Thyroid issues (hypo or hyperthyroid)',
          'PCOS (polycystic ovary syndrome)',
          'Menopause or perimenopause',
          'Diabetes or blood sugar issues',
        ],
      },
      {
        category: 'Heart & Blood',
        icon: '❤️',
        options: [
          'High blood pressure',
          'High cholesterol',
          'Taking blood thinners (e.g. warfarin, aspirin)',
          'Anemia or low iron',
          'History of heart conditions',
        ],
      },
      {
        category: 'Digestive & Gut',
        icon: '🫧',
        options: [
          'IBS or irritable bowel syndrome',
          'Acid reflux or GERD',
          "Crohn's disease or ulcerative colitis",
          'Celiac disease or gluten sensitivity',
          'Frequent bloating or gas',
        ],
      },
      {
        category: 'Mental Health & Nervous System',
        icon: '🧠',
        options: [
          'Anxiety or panic disorder',
          'Depression',
          'ADHD or focus difficulties',
          'Chronic insomnia or sleep disorder',
        ],
      },
      {
        category: 'Immune & Inflammatory',
        icon: '🛡️',
        options: [
          'Autoimmune condition (lupus, MS, rheumatoid arthritis, etc.)',
          'Frequent illness or low immunity',
          'Chronic inflammation or joint pain',
          'Allergies (seasonal or food)',
        ],
      },
      {
        category: 'Kidney, Liver & Organs',
        icon: '⚕️',
        options: [
          'Kidney issues or reduced kidney function',
          'Liver issues or elevated liver enzymes',
          'Gallbladder issues or removed gallbladder',
        ],
      },
      {
        category: 'Bones, Joints & Muscles',
        icon: '🦴',
        options: [
          'Osteoporosis or low bone density',
          'Arthritis or chronic joint pain',
          'Fibromyalgia or chronic muscle pain',
        ],
      },
      {
        category: 'Medications & Treatments',
        icon: '💊',
        options: [
          'Taking prescription medication (any)',
          'Taking birth control or hormonal contraceptives',
          'Currently undergoing cancer treatment',
          'Post-surgery or recovery',
        ],
      },
      {
        category: 'Reproductive & Life Stage',
        icon: '🌸',
        options: [
          'Currently pregnant',
          'Currently breastfeeding',
          'Trying to conceive',
          'Postpartum (within 12 months of birth)',
        ],
      },
    ],
    [],
  );

  const healthBackgroundCategories = useMemo(() => {
    if (draft.biologicalSex === 'Male') {
      return backgroundCategories.filter((c) => c.category !== REPRODUCTIVE_LIFE_STAGE_CATEGORY);
    }
    return backgroundCategories;
  }, [backgroundCategories, draft.biologicalSex]);

  /** Medications first so prescriptions are addressed before other conditions. */
  const orderedHealthBackgroundCategories = useMemo(() => {
    const cats = healthBackgroundCategories;
    const med = cats.find((c) => c.category === MEDICATIONS_CATEGORY);
    const rest = cats.filter((c) => c.category !== MEDICATIONS_CATEGORY);
    return med ? [med, ...rest] : cats;
  }, [healthBackgroundCategories]);

  useEffect(() => {
    const valid = new Set<string>(['None of the above']);
    for (const c of backgroundCategories) {
      valid.add(noneCategoryToken(c.category));
      for (const o of c.options) valid.add(o);
    }
    setDraft((d) => {
      const hb = d.healthBackground ?? [];
      const next = hb.filter((x) => valid.has(x));
      if (next.length === hb.length) return d;
      return { ...d, healthBackground: next };
    });
  }, [backgroundCategories]);

  const healthChunks = useMemo(
    () => splitIntoThreeChunks(healthBackgroundCategories),
    [healthBackgroundCategories],
  );

  useEffect(() => {
    if (draft.biologicalSex !== 'Male') return;
    const rep = backgroundCategories.find((c) => c.category === REPRODUCTIVE_LIFE_STAGE_CATEGORY);
    if (!rep) return;
    setDraft((d) => {
      const hb = d.healthBackground ?? [];
      const toRemove = new Set([
        noneCategoryToken(rep.category),
        ...rep.options,
      ]);
      const next = hb.filter((x) => !toRemove.has(x));
      if (next.length === hb.length) return d;
      return { ...d, healthBackground: next };
    });
  }, [draft.biologicalSex, backgroundCategories]);

  const dietaryOptions = useMemo(
    () => [
      { emoji: '🌱', label: 'Vegan', sub: 'No animal products at all' },
      { emoji: '🥗', label: 'Vegetarian', sub: 'No meat, dairy/eggs ok' },
      { emoji: '🥑', label: 'Keto', sub: 'High fat, very low carb' },
      { emoji: '🌾', label: 'Gluten-free', sub: 'Sensitivity or celiac' },
      { emoji: '✅', label: 'No restrictions', sub: 'I eat everything' },
    ],
    [],
  );

  const symptomDurationOptions = useMemo(
    () =>
      [
        'Less than 1 month',
        '1-3 months',
        '3-6 months',
        '6-12 months',
        'Over 1 year',
        'As long as I can remember / my whole life',
      ] as const,
    [],
  );

  const prescriptionMedicationOptions = useMemo(
    () => [
      'Antidepressant / SSRI',
      'Blood pressure medication',
      'Blood thinner',
      'Thyroid medication',
      'Diabetes medication',
      'ADHD stimulant or non-stimulant',
      'Hormonal birth control',
      'HRT (hormone replacement therapy)',
      'Acid reflux medication',
      PRESCRIPTION_OTHER_OPTION,
    ],
    [],
  );

  const frustrationGroups = useMemo<
    { area: string; emoji: string; subtext: string; options: string[] }[]
  >(
    () => {
      /** Every string here must appear in FRUSTRATIONS_BY_GOAL for at least one primary goal, or it never surfaces. */
      const allGroups = [
        {
          area: 'Energy & mental performance',
          emoji: '⚡',
          subtext: 'Focus, fatigue, and cognitive stamina (stack-addressable)',
          options: [
            "I wake up exhausted no matter how much I sleep",
            "I hit a wall every afternoon and can't push through",
            "My mind feels slow, like I'm thinking through fog",
            "I'm running on caffeine just to feel normal",
            'I feel wired but exhausted at the same time',
            "I can't focus or stay on task the way I used to",
            "I'm not performing the way I want to at work",
          ],
        },
        {
          area: 'Body composition, gut & inflammation',
          emoji: '🫁',
          subtext: 'Weight, digestion, bloating, systemic inflammation',
          options: [
            "My weight won't move no matter what I do",
            'I feel bloated or uncomfortable after eating',
            'My body feels inflamed, stiff, or puffy',
            'I want appetite and cravings easier to manage while I work on body composition',
            'I want gut comfort and regular digestion supported by supplements day to day',
          ],
        },
        {
          area: 'Training, muscle & recovery',
          emoji: '💪',
          subtext: 'Strength, training frequency, repair between sessions',
          options: [
            'I feel weaker than I should, like my strength is gone',
            "I've stopped working out or can't recover the way I used to",
            'I want training recovery and muscle repair support from my stack',
            'I want strength and power output supported alongside my nutrition',
          ],
        },
        {
          area: 'Hair, skin & appearance',
          emoji: '✨',
          subtext: 'What you see in the mirror (nutrition- and stack-supported)',
          options: [
            'My hair is thinning or not growing like it used to',
            'My skin looks dull, tired, or broken out',
            'I want clearer skin texture and a more even tone',
            'I want my hairline and overall hair density to look stronger',
            'I want my face to look tighter and less puffy in photos',
            'I want a sharper side profile and better facial structure',
            'I want my under-eye area to look fresher and less tired',
            'I want collagen, barrier, and UV-exposure support from my stack',
            'I want scalp and follicle support from inside-out with supplements',
          ],
        },
        {
          area: 'Mood, hormones, sleep & longevity',
          emoji: '🧠',
          subtext: 'Stress, hormones, immunity, aging, sleep quality',
          options: [
            "I'm irritable or short-tempered and I hate it",
            "I feel anxious or like my thoughts won't slow down",
            'I feel low, flat, or disconnected from life',
            'My hormones feel out of control: mood swings, PMS, crashes',
            'I feel older than I am, like something shifted',
            'I feel disconnected from who I used to be',
            "I keep getting sick or can't shake illness",
            'I want daily immune resilience supported by my stack',
            'I want longevity-focused cellular and metabolic support from my stack',
            'I want menopause symptoms (sleep, mood, temperature) better supported with a supplement strategy',
            'I want cycle-related mood and energy smoother with supplement support',
            'I have trouble falling or staying asleep and want supplement support for sleep quality',
          ],
        },
        {
          area: 'Drive, intimacy & confidence',
          emoji: '🎯',
          subtext: 'Libido, performance, motivation, how you feel in your body',
          options: [
            'My drive and motivation feel completely gone',
            'My sexual performance feels weaker than I want',
            'I want blood flow, energy, and stamina support for intimacy',
            'Low confidence in how I look or feel is affecting my day to day',
            'I want libido and confidence supported alongside my health stack',
          ],
        },
        {
          area: 'Peptide & advanced stack',
          emoji: '🧬',
          subtext: 'When you are going beyond standard oral supplements',
          options: [
            'Recovery between hard sessions still lags — I want advanced options that fit my stack',
            'I am exploring metabolic, GH-axis, or body-recomp peptides alongside supplements',
            'I want cognitive- or stress-related peptides considered next to my daily stack',
            'I need peptide timing, cycling, and interaction guidance with pills and powders I already take',
            'Injury or tissue repair — I want peptide-level education beyond basic supplements',
          ],
        },
      ] as const;

      const selectedGoals = draft.primaryGoals ?? [];
      if (!selectedGoals.length) return [];

      const relevant = new Set<string>(
        selectedGoals.flatMap((g) => FRUSTRATIONS_BY_GOAL[g] ?? []),
      );

      return allGroups
        .map((group) => ({
          ...group,
          options: group.options.filter((opt) => relevant.has(opt)),
        }))
        .filter((group) => group.options.length > 0);
    },
    [draft.primaryGoals],
  );

  const IMPROVEMENT_LABELS: Record<string, string> = {
    "I wake up exhausted no matter how much I sleep": 'I want to wake up energized and clear.',
    "I hit a wall every afternoon and can't push through": 'I want steady all-day energy.',
    "My mind feels slow, like I'm thinking through fog": 'I want a sharper, faster mind.',
    "I'm running on caffeine just to feel normal": 'I want natural energy without depending on caffeine.',
    'I feel wired but exhausted at the same time': 'I want calm energy and better balance.',
    "I can't focus or stay on task the way I used to": 'I want stronger focus and follow-through.',
    "I'm not performing the way I want to at work": 'I want to perform at my best at work.',
    "My weight won't move no matter what I do": 'I want fat loss that finally moves.',
    'I feel bloated or uncomfortable after eating': 'I want meals to feel light and easy.',
    'My body feels inflamed, stiff, or puffy': 'I want to feel less inflamed and more mobile.',
    'I want appetite and cravings easier to manage while I work on body composition':
      'I want appetite and cravings easier to manage while I cut.',
    'I want gut comfort and regular digestion supported by supplements day to day':
      'I want comfortable, predictable digestion supported by my stack.',
    'I feel weaker than I should, like my strength is gone': 'I want my strength and performance back.',
    "I've stopped working out or can't recover the way I used to": 'I want to recover better and train stronger.',
    'I want training recovery and muscle repair support from my stack':
      'I want training recovery and repair supported by what I take.',
    'I want strength and power output supported alongside my nutrition':
      'I want strength and power output supported by my stack.',
    'My hair is thinning or not growing like it used to': 'I want fuller, healthier hair growth.',
    'My skin looks dull, tired, or broken out': 'I want clearer, brighter skin.',
    'I want clearer skin texture and a more even tone': 'I want clearer skin texture and a more even tone.',
    'I want my hairline and overall hair density to look stronger':
      'I want my hairline and overall hair density to look stronger.',
    'I want my face to look tighter and less puffy in photos': 'I want my face to look tighter and less puffy in photos.',
    'I want a sharper side profile and better facial structure':
      'I want a sharper side profile and better facial structure.',
    'I want my under-eye area to look fresher and less tired':
      'I want my under-eye area to look fresher and less tired.',
    'I want collagen, barrier, and UV-exposure support from my stack':
      'I want collagen, barrier, and sun-exposure support from my stack.',
    'I want scalp and follicle support from inside-out with supplements':
      'I want scalp and follicle support from the inside out.',
    "I keep getting sick or can't shake illness": 'I want stronger immunity and resilience.',
    'I want daily immune resilience supported by my stack': 'I want daily immune resilience from my stack.',
    'I want longevity-focused cellular and metabolic support from my stack':
      'I want longevity-focused metabolic and cellular support from my stack.',
    "I'm irritable or short-tempered and I hate it": 'I want a calmer, steadier mood.',
    "I feel anxious or like my thoughts won't slow down": 'I want to feel calm and in control.',
    'I feel low, flat, or disconnected from life': 'I want to feel motivated and connected again.',
    'My hormones feel out of control: mood swings, PMS, crashes': 'I want stable hormones and smoother days.',
    'I feel older than I am, like something shifted': 'I want to feel younger, stronger, and more like myself.',
    'I feel disconnected from who I used to be': 'I want to feel like myself again.',
    'I want menopause symptoms (sleep, mood, temperature) better supported with a supplement strategy':
      'I want menopause symptoms better supported with a clear supplement strategy.',
    'I want cycle-related mood and energy smoother with supplement support':
      'I want cycle-related mood and energy smoother with stack support.',
    'I have trouble falling or staying asleep and want supplement support for sleep quality':
      'I want sleep quality supported by the right supplements.',
    'My drive and motivation feel completely gone': 'I want my drive and motivation back.',
    'My sexual performance feels weaker than I want': 'I want my sexual performance at its best.',
    'I want blood flow, energy, and stamina support for intimacy':
      'I want blood flow, energy, and stamina support for intimacy.',
    'Low confidence in how I look or feel is affecting my day to day':
      'I want to feel confident in how I look and feel day to day.',
    'I want libido and confidence supported alongside my health stack':
      'I want libido and confidence supported alongside my health stack.',
    'Recovery between hard sessions still lags — I want advanced options that fit my stack':
      'I want advanced recovery options that fit my stack.',
    'I am exploring metabolic, GH-axis, or body-recomp peptides alongside supplements':
      'I want metabolic, GH-axis, or recomp peptide angles aligned with my supplements.',
    'I want cognitive- or stress-related peptides considered next to my daily stack':
      'I want cognitive- or stress-related peptide paths considered next to my stack.',
    'I need peptide timing, cycling, and interaction guidance with pills and powders I already take':
      'I want peptide timing, cycling, and interaction guidance with what I already take.',
    'Injury or tissue repair — I want peptide-level education beyond basic supplements':
      'I want injury and tissue-repair education beyond basic supplements.',
  };

  const toImprovementLabel = (option: string) => IMPROVEMENT_LABELS[option] ?? option;

  const availableFrustrationLabels = useMemo(() => {
    const set = new Set<string>();
    for (const group of frustrationGroups) {
      for (const opt of group.options) set.add(opt);
    }
    return set;
  }, [frustrationGroups]);

  useEffect(() => {
    setDraft((d) => {
      const raw = d.biggestFrustrations ?? [];
      const filtered = raw.filter((x) => availableFrustrationLabels.has(x));
      const next = filtered.slice(0, MAX_STEP4_IMPROVEMENT_PICKS);
      if (next.length === raw.length && next.every((v, i) => v === raw[i])) return d;
      return { ...d, biggestFrustrations: next };
    });
  }, [availableFrustrationLabels]);

  /** One collapsible section per step-2 goal; each option appears under the first matching goal only. */
  const frustrationSectionsByGoal = useMemo(() => {
    const selectedGoals = draft.primaryGoals ?? [];
    if (!selectedGoals.length) return [];
    const rendered = new Set<string>();
    const out: { goal: PrimaryGoal; options: string[] }[] = [];
    for (const goal of selectedGoals) {
      const opts = (FRUSTRATIONS_BY_GOAL[goal] ?? []).filter(
        (o) => availableFrustrationLabels.has(o) && !rendered.has(o),
      );
      for (const o of opts) rendered.add(o);
      if (opts.length) out.push({ goal, options: opts });
    }
    return out;
  }, [draft.primaryGoals, availableFrustrationLabels]);

  const budgetOptions: { value: Budget; label: string; sub: string; what: string; proOnly?: boolean }[] = useMemo(
    () => [
      {
        value: 'Under $30',
        label: 'Under $30',
        sub: 'per month',
        what: '2 to 3 highest-impact supplements. Targeted and affordable.',
      },
      {
        value: '$30-$60',
        label: '$30 to $60',
        sub: 'per month',
        what: '4 to 5 supplements covering your core needs.',
      },
      {
        value: '$60-$100',
        label: '$60 to $100',
        sub: 'per month',
        what: '5 to 6 supplements. Deeper support across all your goals.',
      },
      {
        value: '$100+',
        label: '$100+',
        sub: 'per month',
        what: 'Comprehensive stack. The most thorough starting point we can build.',
      },
      {
        value: '$150+',
        label: '$150+ Super Stack',
        sub: 'per month · Pro only',
        what: 'Advanced starting point: in-depth supplement education, peptide guidance, timing and cycling approaches, and full goal-by-goal breakdown.',
        proOnly: true,
      },
    ],
    [],
  );

  function healthBackgroundComplete() {
    const hb = draft.healthBackground ?? [];
    return healthBackgroundCategories.every((cat) => isCategoryAnswered(hb, cat));
  }

  function needsPrescriptionDetail() {
    const hb = draft.healthBackground ?? [];
    if (hb.includes(noneCategoryToken(MEDICATIONS_CATEGORY))) return false;
    return hb.includes('Taking prescription medication (any)');
  }

  function stepValidity(stepToValidate = step) {
    switch (stepToValidate) {
      case 1:
        return (
          !!draft.ageRange &&
          !!draft.biologicalSex &&
          !!draft.mindset &&
          isValidBodyMetrics(draft.heightCm, draft.weightKg)
        );
      case 2:
        return !!draft.primaryGoals?.length;
      case 3:
        return !!draft.currentFeelings?.length && !!draft.symptomDuration;
      case 4:
        if (step4SubSlide === 'background') {
          if (!healthBackgroundComplete()) return false;
          if ((draft.healthBackground ?? []).includes('Taking prescription medication (any)')) {
            if (!draft.prescriptionMedication) return false;
            if (draft.prescriptionMedication === PRESCRIPTION_OTHER_OPTION) {
              return !!draft.prescriptionMedicationOther?.trim();
            }
          }
          return true;
        }
        return (draft.biggestFrustrations ?? []).length > 0;
      case 5:
        return true;
      case 6:
        return !!draft.monthlyBudget;
      default:
        return false;
    }
  }

  async function submitAnalyze(payload: IntakePayload) {
    const prior = loadStoredState();
    if (prior.result?.supplements?.length && !isBasicOrPro()) {
      setError(REBUILD_SUBMIT_ERROR);
      return;
    }
    setIsAnalyzing(true);
    setError(null);
    // Persist immediately so a failed or interrupted build never forces users to re-enter the quiz.
    saveQuiz(payload);
    try {
      await ensureApiSession();
      const res = await fetch(apiUrl('/api/analyze'), {
        method: 'POST',
        headers: await apiAuthHeaders(),
        body: JSON.stringify({
          ...payload,
          subscriptionTier: getSubscriptionTier(),
          replacingExistingStack: !!(prior.result?.supplements?.length),
        }),
      });
      const raw = await res.text();
      let data: { error?: string; message?: string } & Partial<GeminiResult>;
      try {
        data = JSON.parse(raw) as { error?: string; message?: string } & Partial<GeminiResult>;
      } catch {
        throw new Error('Server returned an invalid response. Check that the API is running.');
      }
      const headline =
        typeof data.painPointHeadline === 'string' ? data.painPointHeadline.trim() : '';
      const supplements = Array.isArray(data.supplements) ? data.supplements : [];
      if (!res.ok || !headline || supplements.length === 0) {
        const msg = data.message ?? data.error ?? (raw.slice(0, 200) || 'Unknown error.');
        throw new Error(typeof msg === 'string' ? msg : 'Unknown error.');
      }
      if (prior.result?.supplements?.length) {
        const d = new Date();
        pushStackArchiveEntry({
          savedAt: d.toISOString(),
          label: `Previous stack · ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`,
          quiz: prior.quiz,
          result: prior.result,
        });
      }
      saveResult(data as GeminiResult);
      navigate('/results', { replace: true });
    } catch (err) {
      const detail = err instanceof Error ? err.message : '';
      setError(
        detail
          ? `Could not build your stack: ${detail}`
          : 'Something went wrong while building your stack. Please try again.',
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  function buildPayload(): IntakePayload | null {
    const payload = draft as IntakePayload;
    if (
      !payload.ageRange ||
      !payload.biologicalSex ||
      !payload.mindset ||
      !payload.primaryGoals?.length ||
      !payload.symptomDuration ||
      !payload.monthlyBudget
    )
      return null;
    const healthBackground = payload.healthBackground?.length ? payload.healthBackground : ['None of the above'];
    const pm = payload.prescriptionMedication;
    const prescriptionMedicationOther =
      pm === PRESCRIPTION_OTHER_OPTION
        ? payload.prescriptionMedicationOther?.trim().slice(0, MAX_STEP4_TEXT_CHARS) || undefined
        : undefined;
    const frustrationOther =
      payload.frustrationOther?.trim().slice(0, MAX_STEP4_IMPROVEMENT_OPTIONAL_DETAIL_CHARS) || undefined;
    if (!isValidBodyMetrics(payload.heightCm, payload.weightKg)) return null;
    const dietaryPreferences =
      payload.dietaryPreferences?.length
        ? payload.dietaryPreferences
        : ['No restrictions'];
    const biggestFrustrations =
      payload.biggestFrustrations?.length
        ? payload.biggestFrustrations
        : ['General wellness and symptom support'];
    const currentFeelings =
      payload.currentFeelings?.length > 0
        ? payload.currentFeelings
        : DEFAULT_CURRENT_FEELINGS_FALLBACK;
    const nameRaw = getUserName()?.trim();
    const preferredFirstName =
      nameRaw && !/^skip$/i.test(nameRaw) ? nameRaw.split(/\s+/)[0] : undefined;

    return {
      ...payload,
      currentFeelings,
      specificGoal: sanitizeSuperFocusText(payload.specificGoal ?? '').trim() || undefined,
      frustrationOther,
      preferredFirstName,
      healthBackground,
      biggestFrustrations,
      prescriptionMedication: pm,
      prescriptionMedicationOther,
      dietaryPreferences,
      heightCm: payload.heightCm,
      weightKg: payload.weightKg,
      weightIsApproximate: payload.weightIsApproximate !== false,
    };
  }

  const payload = buildPayload();
  const feelingOptions = feelingSections.flatMap((s) => s.items);

  // Step meta: serif headline + sub copy for each step
  const STEP_META = [
    {
      label: 'Your profile',
      headline: 'Let\'s start with the basics.',
      sub: 'Your age and biology are the foundation of every recommendation we make.',
    },
    {
      label: 'Your guide',
      headline: 'What are your Goals?',
      sub: 'Let\'s start building! Select the building blocks you want your stack to focus on',
    },
    {
      label: 'Personalize',
      headline: 'Fine-tune your guide',
      sub: 'Add detail so your recommendations match your goals and how you live. Guidance only, not medical advice.',
    },
    {
      label: 'Conditions and prescriptions',
      headline: 'Conditions and prescriptions for your stack',
      sub: 'Any health concerns? Your health and goals are our number one priority. Stacky accommodates and personalizes your stack around possible health concerns because Stacky wants you to feel your best!',
    },
    {
      label: 'Your diet',
      headline: 'How do you eat?',
      sub: 'We\'ll make sure every recommendation works with your diet.',
    },
    {
      label: 'Your budget',
      headline: 'What can you invest?',
      sub: 'We build the most effective stack possible within your budget.',
    },
  ];

  const meta = STEP_META[step - 1];
  const storedFirst = getUserName()?.split(' ')[0] ?? null;
  const firstName =
    hasCompletedNamePrompt && storedFirst && storedFirst !== 'Skip' ? storedFirst : null;
  const personalizedMeta = {
    ...meta,
    headline:
      firstName && step === 2
        ? `What are your Goals, ${firstName}?`
        : firstName && step === 3
        ? `${firstName}, what should we factor into your guide?`
        : firstName && step === 4
        ? `${firstName}, what else should we know?`
        : firstName && step === 5
        ? `${firstName}, any diet restrictions or last things we should know?`
        : meta.headline,
  };

  return (
    <div className="min-h-screen bg-sw-bg text-warm">

      {/* ─── TOP BAR ─── */}
      <div
        className="sticky top-0 z-40 px-5 border-b border-stone sw-sticky-nav"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 6px)',
          paddingBottom: 6,
        }}
      >
        <div className="max-w-lg mx-auto flex items-center justify-between gap-2 min-h-[36px]">
          <button
            type="button"
            onClick={() => navigate('/landing')}
            className="font-serif font-light tracking-widest text-sm text-ink hover:opacity-80 transition-opacity shrink-0"
            style={{ letterSpacing: '0.15em' }}
            aria-label="Back to home screen"
          >
            STACKWISE
          </button>
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 text-xs">
            <span className="font-medium tabular-nums shrink-0 text-warm-light" style={{ letterSpacing: '0.05em' }}>
              {step} / 6
            </span>
            <button
              type="button"
              onClick={() => navigate('/landing')}
              className="font-semibold hover:opacity-80 transition-opacity truncate"
              style={{ color: '#4A7C59' }}
            >
              ← Back
            </button>
          </div>
        </div>
        <div className="max-w-lg mx-auto mt-2 pb-1">
          <ProgressBar step={step} totalSteps={6} />
        </div>
        {mustUpgradeToRebuildStack() && (
          <div className="max-w-lg mx-auto px-5 pb-2">
            <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-2.5 text-xs text-amber-950 leading-snug">
              {REBUILD_GATE_BODY}
              <button
                type="button"
                className="block mt-2 font-bold text-ink underline underline-offset-2"
                onClick={() => navigate('/pricing', { state: { intent: 'rebuild' } })}
              >
                View Basic &amp; Pro, save vs. buying blind
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── SCROLLABLE CONTENT ─── */}
      <div className="max-w-lg mx-auto px-5 pb-nav">

        {/* Step headline */}
        <div
          className={
            step === 3 ? 'pt-6 pb-4' : step === 2 ? 'pt-8 pb-3 text-center' : 'pt-8 pb-6'
          }
        >
          {step === 3 ? (
            <>
              <div className="flex justify-center mb-3">
                <StackyCat
                  mood={getStepStacky(3).mood}
                  size={96}
                  outfit={getStepStacky(step).outfit}
                  bubble={
                    firstName && firstName !== 'Skip'
                      ? `Perfect ${firstName}! Let's get into the nitty gritty of your goals now`
                      : `Perfect! Let's get into the nitty gritty of your goals now`
                  }
                  bubblePosition="top"
                  topBubbleReservePx={88}
                />
              </div>
              <h1 className="quiz-headline mb-2 text-center max-w-xl mx-auto">{personalizedMeta.headline}</h1>
            </>
          ) : (
            <>
              {step !== 2 && <div className="quiz-label mb-3">{personalizedMeta.label}</div>}
              <h1
                className={[
                  step >= 7 && step <= 10 ? 'quiz-headline-plain' : 'quiz-headline',
                  'mb-2',
                  step === 2 ? 'max-w-xl mx-auto' : '',
                ].join(' ')}
              >
                {personalizedMeta.headline}
              </h1>
              {step === 2 && (
                <div className="mb-3 flex justify-center">
                  <div className="stackwise-focus-underline" />
                </div>
              )}
              <p className={['quiz-sub', step === 2 ? 'max-w-xl mx-auto' : ''].filter(Boolean).join(' ')}>
                {personalizedMeta.sub}
              </p>
            </>
          )}
        </div>

        {step === 1 && !hasCompletedNamePrompt && (
          <div
            className="quiz-intro-overlay"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 80,
              background: 'rgb(var(--tw-cream) / 0.97)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px 24px',
              paddingBottom: 'max(40px, env(safe-area-inset-bottom, 40px))',
            }}
          >
            <div style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>
              <p
                className="quiz-intro-rise quiz-intro-d1"
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: '#4A7C59',
                  marginBottom: 10,
                  lineHeight: 1.45,
                }}
              >
                Meet Stacky, your guide through the supplement maze
              </p>
              <p
                className="quiz-intro-rise quiz-intro-d2"
                style={{
                  fontSize: 14,
                  color: '#3D2E22',
                  lineHeight: 1.5,
                  marginBottom: 16,
                  fontWeight: 500,
                }}
              >
                <strong>Don&apos;t waste money</strong> on overhyped supplements that aren&apos;t for you. Stacky builds simple, personalized stacks for your specific goals that evolve as you do.
              </p>
              <div className="quiz-intro-rise quiz-intro-d3 flex justify-center" style={{ marginBottom: 8 }}>
                <StackyCat
                  mood={getStepStacky(1).mood}
                  size={130}
                  outfit={getStepStacky(step).outfit}
                  bubble="I'm tired of people pressuring you to waste your money on vague supplements. Let's build something that's actually for you together! What should I call you?"
                  bubblePosition="top"
                  topBubbleReservePx={180}
                />
              </div>

              <div className="quiz-intro-rise quiz-intro-d4" style={{ marginTop: 24, marginBottom: 4 }}>
                <div
                  style={{
                    fontFamily: 'Cormorant Garamond, Georgia, serif',
                    fontSize: 30,
                    fontWeight: 300,
                    color: '#1C3A2E',
                    letterSpacing: '-0.01em',
                    lineHeight: 1.2,
                    marginBottom: 0,
                  }}
                >
                  What's your name?
                </div>
              </div>

              <input
                className="quiz-intro-rise quiz-intro-d5"
                type="text"
                autoFocus
                autoComplete="given-name"
                placeholder="Hi Stacky! My name is..."
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && nameDraft.trim()) {
                    setUserName(nameDraft.trim());
                    setUserNameLocal(nameDraft.trim());
                    setNameDraft(nameDraft.trim());
                    setHasCompletedNamePrompt(true);
                  }
                }}
                style={{
                  width: '100%',
                  height: 56,
                  borderRadius: 16,
                  border: '1.5px solid #E8E0D5',
                  background: '#FFFFFF',
                  fontSize: 18,
                  fontFamily: 'Figtree, system-ui, sans-serif',
                  color: '#3D2E22',
                  textAlign: 'center',
                  outline: 'none',
                  marginTop: 16,
                  marginBottom: 16,
                  padding: '0 16px',
                  transition: 'border-color 0.15s ease',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#1C3A2E';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#E8E0D5';
                }}
              />

              <button
                className="quiz-intro-rise quiz-intro-d6"
                type="button"
                disabled={!nameDraft.trim()}
                onClick={() => {
                  if (!nameDraft.trim()) return;
                  setUserName(nameDraft.trim());
                  setUserNameLocal(nameDraft.trim());
                  setNameDraft(nameDraft.trim());
                  setHasCompletedNamePrompt(true);
                }}
                style={{
                  width: '100%',
                  height: 54,
                  borderRadius: 99,
                  background: nameDraft.trim() ? '#1C3A2E' : '#E8E0D5',
                  color: nameDraft.trim() ? '#F9F6F1' : '#9C8E84',
                  fontSize: 15,
                  fontWeight: 600,
                  border: 'none',
                  cursor: nameDraft.trim() ? 'pointer' : 'not-allowed',
                  fontFamily: 'Figtree, system-ui, sans-serif',
                  transition: 'all 0.15s ease',
                }}
              >
                {nameDraft.trim() ? `Let's go, ${nameDraft.trim().split(' ')[0]}! →` : 'Enter your name to continue'}
              </button>

              <button
                className="quiz-intro-rise quiz-intro-d7"
                type="button"
                onClick={() => {
                  setUserName('Skip');
                  setUserNameLocal('Skip');
                  setNameDraft('');
                  setHasCompletedNamePrompt(true);
                }}
                style={{
                  marginTop: 10,
                  background: 'transparent',
                  border: 'none',
                  color: '#C4B9AC',
                  fontSize: 12,
                  cursor: 'pointer',
                  fontFamily: 'Figtree, system-ui, sans-serif',
                  minHeight: 'auto',
                  padding: '4px 8px',
                }}
              >
                Skip for now
              </button>

              <p
                className="quiz-intro-rise quiz-intro-d7"
                style={{ marginTop: 16, fontSize: 11, color: '#C4B9AC', lineHeight: 1.5, textAlign: 'center' }}
              >
                By continuing you agree to our{' '}
                <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: '#9C8E84', textDecoration: 'underline' }}>
                  Terms of Service
                </a>
                {' '}and{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#9C8E84', textDecoration: 'underline' }}>
                  Privacy Policy
                </a>
                . StackWise is not medical advice.
              </p>
            </div>
          </div>
        )}

        {/* STEP 1: About You */}
        {step === 1 && (
          <div className="space-y-6 stackwise-result-block-reveal">

            {/* Age */}
            <div>
              <div className="quiz-label mb-3">Your age</div>
              <div className="grid grid-cols-5 gap-2">
                {ageRanges.map((r, ageIdx) => {
                  const sel = draft.ageRange === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, ageRange: r }))}
                      className={[
                        'text-sm font-medium transition-all duration-150 border active:scale-95 stackwise-reveal-option',
                        sel
                          ? 'border-[#4A7C59] bg-[#F0F5F2] text-[#1C3A2E]'
                          : 'border-stone bg-white text-warm-mid hover:border-stone-dark',
                      ].join(' ')}
                      style={{ minHeight: 52, borderRadius: 12, animationDelay: `${ageIdx * 40}ms` }}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sex */}
            <div>
              <div className="quiz-label mb-3">Biological sex</div>
              <div className="space-y-2.5">
                {[
                  { value: 'Male' as BiologicalSex, label: 'Male', sub: 'Testosterone-forward recommendations' },
                  { value: 'Female' as BiologicalSex, label: 'Female', sub: 'Hormone-aware recommendations' },
                  { value: 'Prefer not to say' as BiologicalSex, label: 'Prefer not to say', sub: 'General evidence-based recommendations' },
                ].map((s, idx) => {
                  const sel = draft.biologicalSex === s.value;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, biologicalSex: s.value }))}
                      className={['quiz-option', sel ? 'selected' : '', 'stackwise-reveal-option'].join(' ')}
                      style={{ animationDelay: `${120 + idx * 45}ms` }}
                    >
                      <div className={['quiz-check', sel ? 'checked' : ''].join(' ')}>
                        {sel && (
                          <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                            <path d="M1 4L4.5 7.5L11 1" stroke="#F9F6F1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm" style={{ color: sel ? '#1C3A2E' : '#3D2E22' }}>
                          {s.label}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: '#9C8E84' }}>{s.sub}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mindset */}
            <div>
              <div className="quiz-label mb-1">Your mindset right now</div>
              <div className="text-xs mb-3" style={{ color: '#9C8E84' }}>
                So Stacky can meet you where you are: same clarity and honest guidance, whether you are new to this or fine-tuning.
              </div>
              <div className="space-y-2.5">
                {mindsetOptions.map((m, idx) => {
                  const sel = draft.mindset === m.value;
                  return (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, mindset: m.value }))}
                      className={['quiz-option', sel ? 'selected' : '', 'stackwise-reveal-option'].join(' ')}
                      style={{ animationDelay: `${220 + idx * 45}ms` }}
                    >
                      <div className={['quiz-check', sel ? 'checked' : ''].join(' ')}>
                        {sel && (
                          <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                            <path d="M1 4L4.5 7.5L11 1" stroke="#F9F6F1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm" style={{ color: sel ? '#1C3A2E' : '#3D2E22' }}>
                          {m.label}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: '#9C8E84' }}>{m.sub}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Height & weight */}
            <div className="space-y-3">
              <div className="quiz-label mb-1">Height & weight</div>
              <p className="text-xs leading-relaxed" style={{ color: '#9C8E84' }}>
                Approximate is fine. This helps Stacky calibrate dosing and body-composition goals.
              </p>

              {/* Unit toggle */}
              <div className="inline-flex rounded-full border border-[#E8E0D5] bg-[#FDFCFA] p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setBodyUnit('imperial')}
                  className="px-3 py-1.5 rounded-full"
                  style={{
                    background: bodyUnit === 'imperial' ? '#1C3A2E' : 'transparent',
                    color: bodyUnit === 'imperial' ? '#F9F6F1' : '#6B5B4E',
                  }}
                >
                  ft / lbs
                </button>
                <button
                  type="button"
                  onClick={() => setBodyUnit('metric')}
                  className="px-3 py-1.5 rounded-full"
                  style={{
                    background: bodyUnit === 'metric' ? '#1C3A2E' : 'transparent',
                    color: bodyUnit === 'metric' ? '#F9F6F1' : '#6B5B4E',
                  }}
                >
                  cm / kg
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Height */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold" style={{ color: '#3D2E22' }}>
                    Height
                  </div>
                  {bodyUnit === 'imperial' ? (
                    <div className="flex gap-2">
                      {(() => {
                        const h = draft.heightCm;
                        const { ft, inches } =
                          typeof h === 'number' && Number.isFinite(h) ? cmToFtIn(h) : { ft: 0, inches: 0 };
                        return (
                          <>
                            <div className="flex-1">
                              <select
                                value={typeof h === 'number' && Number.isFinite(h) ? String(ft) : ''}
                                onChange={(e) => {
                                  if (!e.target.value) return;
                                  const nextFt = parseInt(e.target.value, 10);
                                  const next = ftInToCm(nextFt, inches);
                                  setDraft((d) => ({ ...d, heightCm: next }));
                                }}
                                className="w-full rounded-2xl px-3 py-2 text-sm"
                                style={{
                                  background: '#FDFCFA',
                                  border: '1.5px solid #E8E0D5',
                                  color: '#3D2E22',
                                }}
                              >
                                <option value="" disabled>Select</option>
                                {Array.from({ length: 5 }, (_, i) => i + 3).map((v) => (
                                  <option key={v} value={v}>{v}</option>
                                ))}
                              </select>
                              <div className="text-[11px] mt-1" style={{ color: '#9C8E84' }}>
                                feet
                              </div>
                            </div>
                            <div className="flex-1">
                              <select
                                value={typeof h === 'number' && Number.isFinite(h) ? String(inches) : ''}
                                onChange={(e) => {
                                  if (!e.target.value) return;
                                  const nextIn = parseInt(e.target.value, 10);
                                  const next = ftInToCm(ft, nextIn);
                                  setDraft((d) => ({ ...d, heightCm: next }));
                                }}
                                className="w-full rounded-2xl px-3 py-2 text-sm"
                                style={{
                                  background: '#FDFCFA',
                                  border: '1.5px solid #E8E0D5',
                                  color: '#3D2E22',
                                }}
                              >
                                <option value="" disabled>Select</option>
                                {Array.from({ length: 12 }, (_, i) => i).map((v) => (
                                  <option key={v} value={v}>{v}</option>
                                ))}
                              </select>
                              <div className="text-[11px] mt-1" style={{ color: '#9C8E84' }}>
                                inches
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <select
                          value={typeof draft.heightCm === 'number' && Number.isFinite(draft.heightCm) ? String(draft.heightCm) : ''}
                          onChange={(e) => {
                            if (!e.target.value) {
                              setDraft((d) => ({ ...d, heightCm: undefined }));
                              return;
                            }
                            const v = parseFloat(e.target.value);
                            setDraft((d) => ({ ...d, heightCm: Number.isFinite(v) ? v : undefined }));
                          }}
                          className="w-full rounded-2xl px-3 py-2 text-sm"
                          style={{
                            background: '#FDFCFA',
                            border: '1.5px solid #E8E0D5',
                            color: '#3D2E22',
                          }}
                        >
                          <option value="" disabled>Select height</option>
                          {Array.from({ length: 91 }, (_, i) => i + 130).map((v) => (
                            <option key={v} value={v}>{v}</option>
                          ))}
                        </select>
                      </div>
                      <span className="text-xs mb-2" style={{ color: '#9C8E84' }}>
                        cm
                      </span>
                    </div>
                  )}
                </div>

                {/* Weight */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold" style={{ color: '#3D2E22' }}>
                    Weight
                  </div>
                  {bodyUnit === 'imperial' ? (
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <input
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          placeholder="e.g. 165"
                          value={weightLbsInput}
                          onChange={(e) => {
                            const raw = e.target.value;
                            setWeightLbsInput(raw);
                            const t = raw.trim();
                            if (t === '' || t === '.') {
                              setDraft((d) => ({ ...d, weightKg: undefined }));
                              return;
                            }
                            const lbs = parseFloat(t);
                            if (!Number.isFinite(lbs) || lbs <= 0) return;
                            const kg = lbsToKg(lbs);
                            if (Number.isFinite(kg) && kg > 0) {
                              setDraft((d) => ({ ...d, weightKg: kg }));
                            }
                          }}
                          className="w-full rounded-2xl px-3 py-2 text-sm"
                          style={{
                            background: '#FDFCFA',
                            border: '1.5px solid #E8E0D5',
                            color: '#3D2E22',
                          }}
                        />
                      </div>
                      <span className="text-xs mb-2" style={{ color: '#9C8E84' }}>
                        lbs
                      </span>
                    </div>
                  ) : (
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <input
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          placeholder="e.g. 75"
                          value={weightKgInput}
                          onChange={(e) => {
                            const raw = e.target.value;
                            setWeightKgInput(raw);
                            const t = raw.trim();
                            if (t === '' || t === '.') {
                              setDraft((d) => ({ ...d, weightKg: undefined }));
                              return;
                            }
                            const v = parseFloat(t);
                            if (!Number.isFinite(v) || v <= 0) return;
                            setDraft((d) => ({ ...d, weightKg: v }));
                          }}
                          className="w-full rounded-2xl px-3 py-2 text-sm"
                          style={{
                            background: '#FDFCFA',
                            border: '1.5px solid #E8E0D5',
                            color: '#3D2E22',
                          }}
                        />
                      </div>
                      <span className="text-xs mb-2" style={{ color: '#9C8E84' }}>
                        kg
                      </span>
                    </div>
                  )}

                  <label className="flex items-center gap-2 mt-1 text-[11px]" style={{ color: '#9C8E84' }}>
                    <input
                      type="checkbox"
                      checked={draft.weightIsApproximate ?? true}
                      onChange={(e) => setDraft((d) => ({ ...d, weightIsApproximate: e.target.checked }))}
                    />
                    <span>Weight is approximate (totally fine)</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Privacy note */}
            <div
              className="rounded-2xl px-4 py-3 flex items-start gap-3"
              style={{ background: '#F0F5F2', border: '1px solid #D4E8DA' }}
            >
              <span style={{ color: '#4A7C59', fontSize: 16, flexShrink: 0 }}>🔒</span>
              <p className="text-xs leading-relaxed" style={{ color: '#4A7C59' }}>
                <strong>Your privacy is protected.</strong> Your answers are used only to generate your supplement guidance. No data is sold. If you save your stack to an account, your inputs are stored securely on our servers - see our{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#4A7C59', textDecoration: 'underline' }}>Privacy Policy</a>.
              </p>
            </div>

            {hasCompletedNamePrompt && (
              <div className="mt-6 pt-6 border-t border-[#E8E0D5]">
                <div
                  className="relative mx-auto flex w-full max-w-md items-end justify-center"
                  style={{ minHeight: 200 }}
                >
                  <StackyCat
                    mood="happy"
                    size={88}
                    outfit={getStepStacky(step).outfit}
                    bubble={`Nice to meet you${
                      userName && userName !== 'Skip' ? `, ${userName.split(' ')[0]}` : ''
                    }! Basics first. I'll use what you share to guide you toward the right supplements for you, so you spend wisely instead of buying blind. Glad you're here. 🐾`}
                    bubblePosition="top"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Goals — primary goal picks only */}
        {step === 2 && (
          <div className="space-y-3 stackwise-result-block-reveal">
            <div className="flex justify-center pt-1">
              <StackyCat
                mood="think"
                size={88}
                outfit={getStepStacky(step).outfit}
                topBubbleReservePx={102}
                bubble={
                  firstName ? (
                    <>
                      What type of Stack are we building today,{' '}
                      <span style={{ textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                        {firstName}
                      </span>
                      ? Let&apos;s build the best stack you&apos;ve ever seen for your goals.
                    </>
                  ) : (
                    'What type of Stack are we building today? Let\'s build the best stack you\'ve ever seen for your goals.'
                  )
                }
                bubblePosition="top"
              />
            </div>

            {isFreeTier && (
                  <div
                    className="rounded-2xl px-4 py-3 flex items-start gap-2.5"
                    style={{ background: '#F0F5F2', border: '1px solid #D4E8DA' }}
                  >
                    <span style={{ color: '#4A7C59', fontSize: 14, flexShrink: 0, marginTop: 1 }}>🎯</span>
                    <p className="text-xs leading-relaxed" style={{ color: '#4A7C59' }}>
                      Pick up to <strong>{FREE_MAX_PRIMARY_GOALS} goals</strong> on the free plan.{' '}
                      <button
                        type="button"
                        onClick={() => navigate('/pricing')}
                        className="font-semibold underline underline-offset-2 decoration-[#4A7C59]/50 hover:decoration-[#4A7C59]"
                        style={{ color: '#1C3A2E' }}
                      >
                        Basic or Pro
                      </button>{' '}
                      unlocks unlimited goals so you can build a fuller stack for every area you care about. LooksMaxxing is
                      available on Basic or Pro; Peptide Optimization is Pro only.
                    </p>
                  </div>
                )}

                {(draft.primaryGoals ?? []).length > 0 && (
                  <div className="trust-badge">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6L5 9L10 3" stroke="#4A7C59" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {draft.primaryGoals?.length} goal{(draft.primaryGoals?.length ?? 0) > 1 ? 's' : ''} selected
                    {isFreeTier && (
                      <span className="text-[10px] text-[#9C8E84] ml-1">
                        (max {FREE_MAX_PRIMARY_GOALS})
                      </span>
                    )}
                  </div>
                )}
                <div className="space-y-5">
                  {goalGroups.map((group) => (
                    <div key={group.key} className="space-y-2">
                      <div className="quiz-label" style={{ color: '#9C8E84' }}>
                        {group.key}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {group.goals.map((g, goalIdx) => {
                          const sel = (draft.primaryGoals ?? []).includes(g.value);
                          const theme = GOAL_THEME[g.value];
                          const atLimit =
                            isFreeTier && (draft.primaryGoals ?? []).length >= FREE_MAX_PRIMARY_GOALS;
                          const paidOnlyGoal = PAID_ONLY_PRIMARY_GOALS.includes(g.value);
                          const proOnlyGoal = PRO_ONLY_PRIMARY_GOALS.includes(g.value);
                          const paidOnlyLocked = isFreeTier && paidOnlyGoal && !sel;
                          const proOnlyLocked = !isProUser && proOnlyGoal && !sel;
                          const addLocked = (atLimit && !sel) || paidOnlyLocked || proOnlyLocked;
                          return (
                            <button
                              key={g.value}
                              type="button"
                              onClick={() => {
                                if (addLocked) {
                                  if (proOnlyLocked) {
                                    setStep2UpgradeGate({ reason: 'pro_goal', label: g.label });
                                  } else if (paidOnlyLocked) {
                                    setStep2UpgradeGate({ reason: 'paid_goal', label: g.label });
                                  } else {
                                    setStep2UpgradeGate({ reason: 'max_goals' });
                                  }
                                  return;
                                }
                                setDraft((d) => {
                                  const arr = d.primaryGoals ?? [];
                                  if (arr.includes(g.value)) {
                                    return { ...d, primaryGoals: arr.filter((x) => x !== g.value) };
                                  }
                                  if (isFreeTier && arr.length >= FREE_MAX_PRIMARY_GOALS) return d;
                                  return { ...d, primaryGoals: [...arr, g.value] };
                                });
                              }}
                              className={['quiz-option', sel ? 'selected' : '', 'stackwise-reveal-option'].join(' ')}
                              style={{
                                borderColor: sel ? theme.pillBorder : undefined,
                                background: sel ? theme.pillBg : undefined,
                                animationDelay: `${goalIdx * 45}ms`,
                                opacity: addLocked ? 0.55 : 1,
                                cursor: addLocked ? 'pointer' : undefined,
                              }}
                              aria-disabled={addLocked}
                            >
                              <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1 }}>{g.icon}</span>
                              <div className="flex-1">
                                <div className="font-semibold text-sm flex items-center gap-1.5 flex-wrap" style={{ color: theme.text }}>
                                  {g.label}
                                  {addLocked && (
                                    <span
                                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded stackwise-pro-dramatic-reveal"
                                      style={{
                                        background: 'linear-gradient(135deg, #E7C47E 0%, #C99639 60%, #A46F1C 100%)',
                                        color: '#2D1D0C',
                                        animationDelay: '180ms',
                                      }}
                                    >
                                      {proOnlyGoal ? 'Pro' : paidOnlyGoal ? 'Basic/Pro' : 'Limit'}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs mt-0.5 leading-snug" style={{ color: '#9C8E84' }}>{g.description}</div>
                              </div>
                              <div
                                className={['quiz-check flex-shrink-0', sel ? 'checked' : ''].join(' ')}
                                style={{
                                  background: sel ? theme.text : undefined,
                                  borderColor: sel ? theme.text : undefined,
                                }}
                              >
                                {sel && (
                                  <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                                    <path d="M1 4L4.5 7.5L11 1" stroke="#F9F6F1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
            </div>

            <div className="mt-6 pt-6 border-t border-[#E8E0D5]">
              <div
                className="relative mx-auto flex w-full max-w-md items-end justify-center"
                style={{ minHeight: 200 }}
              >
                <StackyCat
                  mood="happy"
                  size={88}
                  outfit={getStepStacky(step).outfit}
                  bubble={"Take your time. Your guide updates when you do. 🐾"}
                  bubblePosition="top"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Personalize guide (goal-level detail) */}
        {step === 3 && (
          <div className="space-y-5 stackwise-result-block-reveal">
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                type="button"
                onClick={() => setStep3SubSlide('personalize')}
                className={[
                  'px-4 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 border',
                  step3SubSlide === 'personalize'
                    ? 'bg-[#1C3A2E] text-[#F9F6F1] border-[#1C3A2E]'
                    : 'bg-white text-[#3D2E22] border-[#E8E0D5] hover:border-[#C4B9AC]',
                ].join(' ')}
              >
                Personalize
              </button>
              <button
                type="button"
                onClick={() => setStep3SubSlide('superFocus')}
                className={[
                  'px-4 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 border inline-flex items-center gap-2 stackwise-pro-dramatic-reveal',
                  step3SubSlide === 'superFocus'
                    ? 'bg-[#1C3A2E] text-[#F9F6F1] border-[#C4A574]'
                    : 'bg-white text-[#3D2E22] border-[#C4A574] hover:border-[#A57C2D]',
                ].join(' ')}
                style={{
                  animationDelay: '120ms',
                  boxShadow:
                    step3SubSlide === 'superFocus'
                      ? '0 0 0 1px rgba(196,165,116,0.55), 0 8px 22px rgba(139,105,20,0.25)'
                      : '0 0 0 1px rgba(196,165,116,0.3), inset 0 0 0 1px rgba(255,246,222,0.45)',
                  backgroundImage:
                    step3SubSlide === 'superFocus'
                      ? 'linear-gradient(135deg, #1C3A2E 0%, #2D5242 55%, #3E6A59 100%)'
                      : 'linear-gradient(135deg, #FFFDF8 0%, #FFF7E8 100%)',
                }}
              >
                <span>Super Focus</span>
              </button>
            </div>

            {step3SubSlide === 'personalize' ? (
              <>
            <div
              className="rounded-2xl p-3 sm:p-4"
              style={{
                background: 'linear-gradient(165deg, #FDFCFA 0%, #F5F0E8 100%)',
                border: '1px solid #E8E0D5',
                boxShadow: '0 6px 24px rgba(28, 58, 46, 0.06)',
              }}
            >
              <div className="quiz-label mb-2" style={{ color: '#1C3A2E' }}>
                Under each goal
              </div>
              <p className="text-xs mb-4 leading-relaxed" style={{ color: '#6B5B4E' }}>
                Expand a goal and tap what resonates. You can mix picks across goals, this shapes your guide.
              </p>

              <div className="space-y-3">
                {feelingSections.length > 0 ? (
                  feelingSections.map((section) => {
                    const theme = GOAL_THEME[section.sectionKey as PrimaryGoal];
                    const { emoji: goalEmoji } = splitPrimaryGoal(section.sectionKey as PrimaryGoal);
                    const pickedHere = section.items.filter((it) =>
                      (draft.currentFeelings ?? []).includes(it.label),
                    ).length;
                    return (
                      <details
                        key={section.sectionKey}
                        className="group rounded-2xl overflow-hidden border open:shadow-sm"
                        style={{ borderColor: theme.pillBorder, background: '#FFFFFF' }}
                      >
                        <summary
                          className="flex w-full items-center justify-between gap-2 px-3 py-3 list-none cursor-pointer select-none [&::-webkit-details-marker]:hidden"
                          style={{
                            background: theme.pillBg,
                            borderLeft: `4px solid ${theme.text}`,
                          }}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span
                              className="font-bold text-xs w-4 shrink-0 text-center"
                              style={{ color: theme.text }}
                              aria-hidden
                            >
                              <span className="group-open:hidden">▶</span>
                              <span className="hidden group-open:inline">▼</span>
                            </span>
                            <span className="text-lg leading-none shrink-0" aria-hidden>
                              {goalEmoji}
                            </span>
                            <span className="min-w-0">
                              <span
                                className="font-semibold text-sm block leading-tight"
                                style={{ color: theme.text }}
                              >
                                {section.goalLabel}
                              </span>
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className="text-[10px] font-semibold whitespace-nowrap group-open:hidden"
                              style={{ color: theme.text, opacity: 0.82 }}
                            >
                              Tap to expand
                            </span>
                            <span
                              className="text-[10px] font-semibold whitespace-nowrap hidden group-open:inline"
                              style={{ color: theme.text, opacity: 0.82 }}
                            >
                              Tap to close
                            </span>
                            <span
                              className="text-[11px] font-semibold tabular-nums px-1.5 py-0.5 rounded-md"
                              style={{ background: 'rgba(255,255,255,0.65)', color: theme.text }}
                            >
                              {pickedHere}/{section.items.length}
                            </span>
                          </div>
                        </summary>
                        <div
                          className="p-2 pt-1 space-y-1.5 border-t"
                          style={{ borderColor: theme.pillBorder, background: '#FDFCFA' }}
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {section.items.map((item, itemIdx) => {
                              const checked = (draft.currentFeelings ?? []).includes(item.label);
                              return (
                                <button
                                  key={item.label}
                                  type="button"
                                  onClick={() =>
                                    setDraft((d) => ({
                                      ...d,
                                      currentFeelings: toggleInArray(d.currentFeelings ?? [], item.label),
                                    }))
                                  }
                                  className={['quiz-option', checked ? 'selected' : '', 'stackwise-reveal-option'].join(
                                    ' ',
                                  )}
                                  style={{
                                    animationDelay: `${itemIdx * 45}ms`,
                                    borderColor: checked ? theme?.pillBorder : undefined,
                                    background: checked ? theme?.pillBg : undefined,
                                  }}
                                >
                                  <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1 }}>{item.emoji}</span>
                                  <span
                                    className="flex-1 text-sm font-medium"
                                    style={{ color: checked ? theme?.text ?? '#1C3A2E' : '#3D2E22' }}
                                  >
                                    {item.label}
                                  </span>
                                  <div
                                    className={['quiz-check flex-shrink-0', checked ? 'checked' : ''].join(' ')}
                                    style={
                                      checked
                                        ? {
                                            background: theme?.text ?? '#1C3A2E',
                                            borderColor: theme?.text ?? '#1C3A2E',
                                          }
                                        : undefined
                                    }
                                  >
                                    {checked && (
                                      <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                                        <path
                                          d="M1 4L4.5 7.5L11 1"
                                          stroke="#F9F6F1"
                                          strokeWidth="1.8"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        />
                                      </svg>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </details>
                    );
                  })
                ) : (
                  <div className="space-y-2">
                    {feelingOptions.map((opt) => {
                      const label = typeof opt === 'string' ? opt : opt.label;
                      const emoji = typeof opt === 'string' ? null : opt.emoji;
                      const checked = (draft.currentFeelings ?? []).includes(label);
                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() =>
                            setDraft((d) => ({
                              ...d,
                              currentFeelings: toggleInArray(d.currentFeelings ?? [], label),
                            }))
                          }
                          className={['quiz-option', checked ? 'selected' : ''].join(' ')}
                        >
                          {emoji && <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1 }}>{emoji}</span>}
                          <span className="flex-1 text-sm font-medium" style={{ color: checked ? '#1C3A2E' : '#3D2E22' }}>
                            {label}
                          </span>
                          <div className={['quiz-check flex-shrink-0', checked ? 'checked' : ''].join(' ')}>
                            {checked && (
                              <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                                <path d="M1 4L4.5 7.5L11 1" stroke="#F9F6F1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Duration */}
            <div
              className="rounded-2xl p-4"
              style={{
                background: '#FFFFFF',
                border: '1px solid #E8E0D5',
                boxShadow: '0 4px 16px rgba(28, 58, 46, 0.05)',
              }}
            >
              <div className="quiz-label mb-1" style={{ color: '#1C3A2E' }}>
                How long has this been a focus?
              </div>
              <p className="text-xs mb-3 leading-relaxed" style={{ color: '#9C8E84' }}>
                Ballpark is fine. It helps set expectations in your guide, not a clinical timeline.
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {symptomDurationOptions.map((opt, durationIdx) => {
                  const sel = draft.symptomDuration === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, symptomDuration: opt }))}
                      style={{
                        minHeight: 48,
                        borderRadius: 12,
                        animationDelay: `${durationIdx * 40}ms`,
                        background: sel ? '#1C3A2E' : '#FFFFFF',
                        borderColor: sel ? '#1C3A2E' : '#E8E0D5',
                        color: sel ? '#F9F6F1' : '#6B5B4E',
                        boxShadow: sel ? '0 6px 16px rgba(28, 58, 46, 0.18)' : 'none',
                      }}
                      className={[
                        'text-sm font-medium transition-all duration-150 border px-3 active:scale-95 stackwise-reveal-option',
                        sel ? '' : 'hover:border-stone-dark',
                      ].join(' ')}
                      aria-pressed={sel}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-stone">
              <div className="relative mx-auto flex w-full max-w-md justify-center">
                <StackyCat
                  mood={getStepStacky(3).mood}
                  size={88}
                  outfit={getStepStacky(step).outfit}
                  topBubbleReservePx={132}
                  bubble={
                    (() => {
                      const lead =
                        firstName && firstName !== 'Skip'
                          ? `Let's flesh out these goals of yours, ${firstName}! Your improvements are my command.`
                          : `Let's flesh out these goals of yours! Your improvements are my command.`;
                      const follow = stackyFollowUpForSymptomDuration(draft.symptomDuration);
                      return `${lead}\n\n${follow}`;
                    })()
                  }
                  bubblePosition="top"
                />
              </div>
            </div>
              </>
            ) : (
              <>
                <div className="flex justify-center pb-1">
                  <StackyCat
                    mood={getStepStacky(3).mood}
                    size={92}
                    outfit={getStepStacky(step).outfit}
                    topBubbleReservePx={isProUser ? 120 : 108}
                    bubble={
                      "They don't call me Stacky for nothin'. If the main boxes aren't enough and you need to stack every card in your favor to achieve a goal, tell me down below."
                    }
                    bubblePosition="top"
                  />
                </div>

                <div
                  className="rounded-2xl p-1 overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, #C4A574 0%, #1C3A2E 45%, #2D5242 100%)',
                    boxShadow: '0 12px 40px rgba(28, 58, 46, 0.25)',
                  }}
                >
                  <div className="rounded-[14px] p-4 sm:p-5" style={{ background: '#FDFCFA' }}>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="quiz-label mb-0">Super Focus</span>
                      {!isProUser && (
                        <span
                          className="text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full"
                          style={{ background: '#1C3A2E', color: '#E8D5A3', border: '1px solid #2D5242' }}
                        >
                          Premium
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold leading-snug mb-2" style={{ color: '#1C3A2E' }}>
                      Use the box when the quiz tiles aren&apos;t enough.
                    </p>
                    <p className="text-xs mb-3 leading-relaxed" style={{ color: '#6B5E54' }}>
                      Stack names, situations, or a razor-sharp outcome. This stays separate from your main budget stack
                      so your core picks and pricing remain stable.
                    </p>
                    <textarea
                      value={draft.specificGoal ?? ''}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          specificGoal: sanitizeSuperFocusText(e.target.value),
                        }))
                      }
                      maxLength={MAX_SUPER_FOCUS_CHARS}
                      placeholder="Example: Stacky, give me the most comprehensive stack you can for sleep, recovery, blood flow, so I may destroy my enemies"
                      rows={4}
                      className="w-full rounded-xl px-3 py-2.5 text-sm leading-relaxed resize-none"
                      style={{
                        background: '#FFFFFF',
                        border: '1.5px solid #E8E0D5',
                        color: '#3D2E22',
                        fontFamily: 'Figtree, system-ui, sans-serif',
                        outline: 'none',
                        minHeight: 100,
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#1C3A2E';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#E8E0D5';
                      }}
                    />
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-[11px] leading-relaxed" style={{ color: '#9C8E84' }}>
                        Your base stack stays budget-friendly. Super Focus appears as a separate premium section in results.
                      </p>
                      <p className="text-[11px] tabular-nums font-medium" style={{ color: '#9C8E84' }}>
                        {(draft.specificGoal ?? '').length}/{MAX_SUPER_FOCUS_CHARS}
                      </p>
                    </div>
                    {!isProUser && (
                      <p className="text-[11px] mt-2 leading-relaxed" style={{ color: '#6B5E54' }}>
                        Free users can still add Super Focus. Pro unlocks deeper ongoing refinement in Stack Hub.
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* STEP 4: Health Background + Frustrations */}
        {step === 4 && (
          <div className="space-y-5 stackwise-result-block-reveal">
            <div
              className="rounded-2xl px-4 py-4"
              style={{
                background: 'linear-gradient(145deg, #F0F5F2 0%, #E8F2EC 100%)',
                border: '2px solid #4A7C59',
                boxShadow: '0 8px 24px rgba(28, 58, 46, 0.08)',
              }}
              role="region"
              aria-label="Privacy on this step"
            >
              <div className="flex items-start gap-3">
                <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1 }} aria-hidden>
                  🔒
                </span>
                <div className="min-w-0">
                  <div className="font-display font-bold text-sm sm:text-base" style={{ color: '#1C3A2E', letterSpacing: '-0.02em' }}>
                    Stays on this device
                  </div>
                  <p className="text-xs sm:text-sm leading-relaxed mt-2" style={{ color: '#2D4A3E' }}>
                    Not sold, not for ads. We use it only to personalize your guide and keep guidance safer.
                  </p>
                </div>
              </div>
            </div>

            {/* Internal slide switch (UI only) */}
            <div className="rounded-2xl px-4 py-3" style={{ background: '#FDFCFA', border: '1px solid #E8E0D5' }}>
              <div className="flex flex-wrap gap-2 justify-center" role="tablist" aria-label="This step’s sections">
                <button
                  type="button"
                  role="tab"
                  aria-selected={step4SubSlide === 'background'}
                  onClick={() => setStep4SubSlide('background')}
                  className={[
                    'px-4 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 border',
                    step4SubSlide === 'background'
                      ? 'bg-[#1C3A2E] text-[#F9F6F1] border-[#1C3A2E]'
                      : 'bg-white text-[#3D2E22] border-[#E8E0D5] hover:border-[#C4B9AC]',
                  ].join(' ')}
                >
                  Conditions and prescriptions
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={step4SubSlide === 'frustrations'}
                  onClick={() => setStep4SubSlide('frustrations')}
                  className={[
                    'px-4 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 border',
                    step4SubSlide === 'frustrations'
                      ? 'bg-[#1C3A2E] text-[#F9F6F1] border-[#1C3A2E]'
                      : 'bg-white text-[#3D2E22] border-[#E8E0D5] hover:border-[#C4B9AC]',
                  ].join(' ')}
                >
                  Improvements
                </button>
              </div>
            </div>

            {step4SubSlide === 'background' ? (
              <>
                {/* Health background categories (medications first; respects sex-specific list) */}
                <div className="space-y-3">
                  <div
                    className="rounded-xl px-4 py-3.5"
                    style={{ background: '#F0F5F2', border: '2px solid #D4E8DA' }}
                  >
                    <p className="text-sm leading-snug" style={{ color: '#4A5C4E' }}>
                      Tap to expand the topics that apply to you. If nothing fits, choose{' '}
                      <span className="font-semibold" style={{ color: '#1C3A2E' }}>
                        None of these apply to me
                      </span>
                      .
                    </p>
                  </div>

                  {orderedHealthBackgroundCategories.map((cat, catIdx) => {
                    const selCount = cat.options.filter((o) => (draft.healthBackground ?? []).includes(o)).length;
                    const isOpen = openHealthCategory === cat.category;
                    const panelId = `health-bg-panel-${catIdx}`;
                    const showRxBlock =
                      cat.category === MEDICATIONS_CATEGORY &&
                      (draft.healthBackground ?? []).includes('Taking prescription medication (any)');
                    return (
                      <div key={cat.category} className="space-y-2">
                        <div
                          className="rounded-2xl overflow-hidden"
                          style={{ border: '1px solid #E8E0D5', background: '#FFFFFF' }}
                        >
                          <button
                            type="button"
                            onClick={() => setOpenHealthCategory((prev) => (prev === cat.category ? null : cat.category))}
                            className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
                            style={{ borderBottom: isOpen ? '1px solid #F0EBE3' : 'none', background: '#FDFCFA' }}
                            aria-expanded={isOpen}
                            aria-controls={panelId}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="text-moss font-bold text-xs w-4 shrink-0" aria-hidden>
                                {isOpen ? '▼' : '▶'}
                              </span>
                              <span style={{ fontSize: 16 }} aria-hidden>
                                {cat.icon}
                              </span>
                              <span className="min-w-0 font-semibold text-sm leading-tight" style={{ color: '#1C3A2E' }}>
                                {cat.category}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] font-semibold whitespace-nowrap" style={{ color: '#4A7C59' }}>
                                {isOpen ? 'Tap to close' : 'Tap to expand'}
                              </span>
                              {selCount > 0 && (
                                <span
                                  className="text-xs font-bold rounded-full min-w-[1.5rem] h-6 px-1.5 flex items-center justify-center"
                                  style={{ background: '#1C3A2E', color: '#F9F6F1' }}
                                  aria-label={`${selCount} selected`}
                                >
                                  {selCount}
                                </span>
                              )}
                            </div>
                          </button>
                          {isOpen && (
                            <div className="p-3 space-y-2" id={panelId} role="region" aria-label={`${cat.category} options`}>
                              {cat.options.map((opt) => {
                                const checked = (draft.healthBackground ?? []).includes(opt);
                                return (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() =>
                                      setDraft((d) => ({ ...d, healthBackground: toggleInArray(d.healthBackground ?? [], opt) }))
                                    }
                                    className={['quiz-option', checked ? 'selected' : ''].join(' ')}
                                    style={{ minHeight: 44, padding: '10px 12px' }}
                                  >
                                    <div
                                      className={['quiz-check flex-shrink-0', checked ? 'checked' : ''].join(' ')}
                                      style={{ width: 18, height: 18 }}
                                    >
                                      {checked && (
                                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                          <path
                                            d="M1 3.5L3.8 6.5L9 1"
                                            stroke="#F9F6F1"
                                            strokeWidth="1.6"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                          />
                                        </svg>
                                      )}
                                    </div>
                                    <span className="text-xs leading-snug flex-1" style={{ color: checked ? '#1C3A2E' : '#6B5B4E' }}>
                                      {opt}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {showRxBlock && (
                          <div
                            className="rounded-2xl p-4"
                            style={{ background: '#FDF6EE', border: '1px solid #F0D9BE' }}
                          >
                            <div className="quiz-label mb-2" style={{ color: '#8A5C2E' }}>
                              Which prescription medication?
                            </div>
                            <p className="text-[11px] mb-2.5" style={{ color: '#A06B3B' }}>
                              This pairs with &ldquo;Taking prescription medication (any)&rdquo; above. We use it to reduce
                              risky combinations in your generated stack.
                            </p>
                            <select
                              value={draft.prescriptionMedication ?? ''}
                              onChange={(e) =>
                                setDraft((d) => ({
                                  ...d,
                                  prescriptionMedication: e.target.value || undefined,
                                }))
                              }
                              className="w-full rounded-xl px-3 py-2 text-sm"
                              style={{
                                background: '#FFFFFF',
                                border: '1.5px solid #F0D9BE',
                                color: '#78350F',
                                fontFamily: 'Figtree, system-ui, sans-serif',
                                outline: 'none',
                                minHeight: 44,
                              }}
                              onFocus={(e) => {
                                e.target.style.borderColor = '#D97706';
                              }}
                              onBlur={(e) => {
                                e.target.style.borderColor = '#F0D9BE';
                              }}
                            >
                              <option value="" disabled>
                                Select medication type
                              </option>
                              {prescriptionMedicationOptions.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                            {draft.prescriptionMedication === PRESCRIPTION_OTHER_OPTION && (
                              <div className="mt-3">
                                <div className="quiz-label mb-2" style={{ color: '#8A5C2E' }}>
                                  Describe below
                                </div>
                                <textarea
                                  className="w-full rounded-xl px-3 py-2 text-sm leading-relaxed resize-none"
                                  style={{
                                    minHeight: 78,
                                    background: '#FFFFFF',
                                    border: '1.5px solid #F0D9BE',
                                    color: '#78350F',
                                    fontFamily: 'Figtree, system-ui, sans-serif',
                                    fontSize: 13,
                                    outline: 'none',
                                  }}
                                  value={draft.prescriptionMedicationOther ?? ''}
                                  maxLength={MAX_STEP4_TEXT_CHARS}
                                  onChange={(e) =>
                                    setDraft((d) => ({
                                      ...d,
                                      prescriptionMedicationOther: e.target.value.slice(0, MAX_STEP4_TEXT_CHARS),
                                    }))
                                  }
                                  placeholder="Example: Levothyroxine 75mcg, Metformin 500mg, etc."
                                  onFocus={(e) => {
                                    e.target.style.borderColor = '#D97706';
                                  }}
                                  onBlur={(e) => {
                                    e.target.style.borderColor = '#F0D9BE';
                                  }}
                                />
                                <div className="flex justify-between items-center gap-2 mt-1">
                                  <p className="text-[11px] flex-1" style={{ color: '#8A5C2E' }}>
                                    Name and dose (if known) help flag interactions.
                                  </p>
                                  <p className="text-[11px] tabular-nums shrink-0 font-medium" style={{ color: '#B8956A' }}>
                                    {(draft.prescriptionMedicationOther ?? '').length}/{MAX_STEP4_TEXT_CHARS}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* None */}
                  <button
                    type="button"
                    onClick={() => setDraft((d) => ({
                      ...d,
                      healthBackground: (d.healthBackground ?? []).includes('None of the above') ? [] : ['None of the above'],
                    }))}
                    className={['quiz-option', (draft.healthBackground ?? []).includes('None of the above') ? 'selected' : ''].join(' ')}
                  >
                    <div
                      className={[
                        'quiz-check flex-shrink-0',
                        (draft.healthBackground ?? []).includes('None of the above') ? 'checked' : '',
                      ].join(' ')}
                    >
                      {(draft.healthBackground ?? []).includes('None of the above') && (
                        <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                          <path d="M1 4L4.5 7.5L11 1" stroke="#F9F6F1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className="font-medium text-sm" style={{ color: '#3D2E22' }}>None of these apply to me</span>
                  </button>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setStep4SubSlide('frustrations')}
                    className="rounded-full font-semibold text-sm transition-all active:scale-95"
                    style={{
                      background: '#1C3A2E',
                      color: '#F9F6F1',
                      padding: '12px 18px',
                    }}
                  >
                    Next: Improvements →
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Frustrations (compact): improvement focus from goal-matched options */}
                <div>
                  <div className="quiz-label mb-1">
                    Choose up to <span className="font-bold text-ink">5 goals</span> that matter most
                  </div>
                  <div
                    className="rounded-xl px-4 py-3.5 mb-4"
                    style={{ background: '#F0F5F2', border: '2px solid #D4E8DA' }}
                  >
                    <p className="text-sm font-bold leading-snug" style={{ color: '#1C3A2E' }}>
                      Tap each goal below to open it
                    </p>
                    <p className="text-xs leading-relaxed mt-1.5" style={{ color: '#4A5C4E' }}>
                      Each goal starts closed. Tap the colored bar to expand and choose what you want to improve (up to
                      five picks in total across all goals). Tap the bar again to collapse.
                    </p>
                  </div>

                  {frustrationSectionsByGoal.length > 0 ? (
                    <div className="space-y-3">
                      {frustrationSectionsByGoal.map(({ goal, options }) => {
                        const theme = GOAL_THEME[goal];
                        const { emoji, label } = splitPrimaryGoal(goal);
                        const pickedInSection = options.filter((o) =>
                          (draft.biggestFrustrations ?? []).includes(o),
                        ).length;
                        return (
                          <details
                            key={goal}
                            className="group rounded-2xl overflow-hidden border open:shadow-sm"
                            style={{ borderColor: theme.pillBorder, background: '#FFFFFF' }}
                          >
                            <summary
                              className="flex w-full items-center justify-between gap-2 px-2.5 py-2 list-none cursor-pointer select-none [&::-webkit-details-marker]:hidden"
                              style={{
                                background: theme.pillBg,
                                borderLeft: `3px solid ${theme.text}`,
                              }}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span
                                  className="font-bold text-[10px] w-3.5 shrink-0 text-center"
                                  style={{ color: theme.text }}
                                  aria-hidden
                                >
                                  <span className="group-open:hidden">▶</span>
                                  <span className="hidden group-open:inline">▼</span>
                                </span>
                                <span className="text-base leading-none shrink-0" aria-hidden>
                                  {emoji}
                                </span>
                                <span
                                  className="text-sm font-bold tracking-tight leading-tight min-w-0 text-left"
                                  style={{ color: theme.text }}
                                >
                                  {label}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span
                                  className="text-[10px] font-semibold whitespace-nowrap group-open:hidden"
                                  style={{ color: theme.text, opacity: 0.82 }}
                                >
                                  Tap to expand
                                </span>
                                <span
                                  className="text-[10px] font-semibold whitespace-nowrap hidden group-open:inline"
                                  style={{ color: theme.text, opacity: 0.82 }}
                                >
                                  Tap to close
                                </span>
                                <span
                                  className="text-[11px] font-semibold tabular-nums px-1.5 py-0.5 rounded-md"
                                  style={{ background: 'rgba(255,255,255,0.65)', color: theme.text }}
                                >
                                  {pickedInSection}/{options.length}
                                </span>
                              </div>
                            </summary>
                            <div
                              className="p-2 pt-1 space-y-1.5 border-t"
                              style={{ borderColor: theme.pillBorder, background: '#FDFCFA' }}
                            >
                              {options.map((opt: string) => {
                                const selected = draft.biggestFrustrations ?? [];
                                const checked = selected.includes(opt);
                                const atMax = selected.length >= MAX_STEP4_IMPROVEMENT_PICKS;
                                const choiceDisabled = atMax && !checked;
                                return (
                                  <button
                                    key={opt}
                                    type="button"
                                    aria-disabled={choiceDisabled}
                                    onClick={() => {
                                      if (choiceDisabled) return;
                                      setDraft((d) => {
                                        const cur = d.biggestFrustrations ?? [];
                                        if (cur.includes(opt)) {
                                          return { ...d, biggestFrustrations: cur.filter((x) => x !== opt) };
                                        }
                                        if (cur.length >= MAX_STEP4_IMPROVEMENT_PICKS) return d;
                                        return { ...d, biggestFrustrations: [...cur, opt] };
                                      });
                                    }}
                                    className={['quiz-option w-full', checked ? 'selected' : ''].join(' ')}
                                    style={{
                                      minHeight: 44,
                                      padding: '10px 12px',
                                      borderColor: checked ? theme.pillBorder : undefined,
                                      background: checked ? theme.pillBg : undefined,
                                      opacity: choiceDisabled ? 0.5 : 1,
                                      cursor: choiceDisabled ? 'not-allowed' : undefined,
                                      borderLeft: `3px solid ${theme.text}`,
                                    }}
                                  >
                                    <div
                                      className={['quiz-check flex-shrink-0', checked ? 'checked' : ''].join(' ')}
                                      style={{
                                        width: 18,
                                        height: 18,
                                        ...(checked
                                          ? {
                                              background: theme.text,
                                              borderColor: theme.text,
                                            }
                                          : {}),
                                      }}
                                    >
                                      {checked && (
                                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                          <path
                                            d="M1 3.5L3.8 6.5L9 1"
                                            stroke="#F9F6F1"
                                            strokeWidth="1.6"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                          />
                                        </svg>
                                      )}
                                    </div>
                                    <span
                                      className="text-xs leading-snug flex-1 text-left"
                                      style={{ color: checked ? theme.text : '#4A3F36' }}
                                    >
                                      {toImprovementLabel(opt)}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </details>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs leading-relaxed" style={{ color: '#9C8E84' }}>
                      Choose goals in step 2 first.
                    </p>
                  )}

                  {frustrationSectionsByGoal.length > 0 && (
                    <div className="trust-badge mt-3">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6L5 9L10 3" stroke="#4A7C59" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {(draft.biggestFrustrations ?? []).length} of {MAX_STEP4_IMPROVEMENT_PICKS} chosen
                      {(draft.biggestFrustrations ?? []).length >= MAX_STEP4_IMPROVEMENT_PICKS && (
                        <span style={{ color: '#9C8E84', fontWeight: 400 }}> · max reached</span>
                      )}
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-3">
                    <button
                      type="button"
                      onClick={() => setStep4SubSlide('background')}
                      className="rounded-full font-semibold text-sm transition-all active:scale-95"
                      style={{
                        background: 'transparent',
                        color: '#3D2E22',
                        border: '1.5px solid #E8E0D5',
                        padding: '12px 18px',
                      }}
                    >
                      ← Back
                    </button>
                    <div className="text-xs" style={{ color: '#9C8E84' }}>
                      Edit anytime before you continue.
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="mt-0 pt-2 border-t border-[#E8E0D5]">
              <div className="relative mx-auto flex w-full max-w-md items-end justify-center">
                <StackyCat
                  mood="think"
                  size={88}
                  outfit={getStepStacky(step).outfit}
                  bubble={
                    step4SubSlide === 'background'
                      ? 'Take your time. This keeps your guide safe. 🐾'
                      : 'Tell me about yourself! I love hearing about your goals, the better I understand you, the better I can make your goals become a reality 🐾'
                  }
                  bubblePosition="top"
                />
              </div>
              {step4SubSlide === 'background' ? (
                <div
                  className="mt-5 max-w-md mx-auto rounded-2xl px-4 py-3 flex items-start gap-3"
                  style={{ background: '#F0F5F2', border: '1px solid #D4E8DA' }}
                >
                  <span style={{ color: '#4A7C59', fontSize: 16, flexShrink: 0 }}>🧭</span>
                  <div className="text-xs leading-relaxed min-w-0" style={{ color: '#4A7C59' }}>
                    <p className="font-semibold mb-1" style={{ color: '#1C3A2E' }}>
                      What this section is for
                    </p>
                    <p>
                      This is not a full health history. It only captures factors that change how Stacky{' '}
                      <strong style={{ color: '#1C3A2E' }}>builds your supplement stack</strong>
                      : drug interactions, organ load, hormones, and conditions where dosing or ingredient choice matters.
                      Your symptoms and timing from earlier steps are already included.
                    </p>
                    {draft.primaryGoals && draft.primaryGoals.length > 0 ? (
                      <p className="mt-2">
                        Goals we are stacking around:{' '}
                        {(() => {
                          const labels = (draft.primaryGoals ?? []).map((g) => goalLabelByValue.get(g as PrimaryGoal) ?? g);
                          const n = labels.length;
                          if (n === 0) return 'your goals';
                          if (n === 1) return labels[0];
                          if (n === 2) return `${labels[0]} & ${labels[1]}`;
                          return `${labels.slice(0, 2).join(', ')} +${n - 2} more`;
                        })()}
                        .
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* STEP 5: Dietary */}
        {step === 5 && (
          <div className="space-y-3 stackwise-result-block-reveal">
            {(dietaryOptions as { emoji: string; label: string; sub: string }[]).map((opt) => {
              const checked = (draft.dietaryPreferences ?? []).includes(opt.label);
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, dietaryPreferences: toggleInArray(d.dietaryPreferences ?? [], opt.label) }))}
                  className={['quiz-option', checked ? 'selected' : ''].join(' ')}
                >
                  <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1 }}>{opt.emoji}</span>
                  <div className="flex-1">
                    <div className="font-semibold text-sm" style={{ color: checked ? '#1C3A2E' : '#3D2E22' }}>{opt.label}</div>
                    <div className="text-xs mt-0.5" style={{ color: '#9C8E84' }}>{opt.sub}</div>
                  </div>
                  <div className={['quiz-check flex-shrink-0', checked ? 'checked' : ''].join(' ')}>
                    {checked && (
                      <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                        <path d="M1 4L4.5 7.5L11 1" stroke="#F9F6F1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}

            <div className="mt-6 pt-6 border-t border-[#E8E0D5]">
              <div
                className="relative mx-auto flex w-full max-w-md items-end justify-center"
                style={{ minHeight: 200 }}
              >
                <StackyCat
                  mood={getStepStacky(5).mood}
                  size={88}
                  outfit={getStepStacky(step).outfit}
                  bubble="Diet helps us match forms and ingredients. Tap No restrictions if you eat everything. 🐾"
                  bubblePosition="top"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: Budget */}
        {step === 6 && (
          <div className="space-y-4 stackwise-result-block-reveal">

            {/* Ready callout */}
            <div
              className="rounded-2xl px-4 py-4 flex items-start gap-3"
              style={{ background: '#1C3A2E' }}
            >
              <span style={{ fontSize: 18, flexShrink: 0 }}>⚡</span>
              <div>
                <div className="font-serif font-light text-base" style={{ color: '#F9F6F1', fontSize: 17 }}>
                  Your stack is ready to generate.
                </div>
                <div className="text-xs mt-1 leading-relaxed" style={{ color: 'rgba(249,246,241,0.82)' }}>
                  Last step. Tell us your budget and we'll build the best personalized starting point we can within it.
                </div>
              </div>
            </div>

            {/* Budget options */}
            <div className="space-y-2.5">
              {(budgetOptions as { value: Budget; label: string; sub: string; what: string; proOnly?: boolean }[]).map((opt) => {
                const sel = draft.monthlyBudget === opt.value;
                const locked = !!opt.proOnly && !isProUser;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      if (locked) {
                        navigate('/pricing');
                        return;
                      }
                      setDraft((d) => ({ ...d, monthlyBudget: opt.value }));
                    }}
                    className={[
                      'quiz-option',
                      sel ? 'selected' : '',
                      locked ? 'stackwise-pro-dramatic-reveal' : '',
                    ].join(' ')}
                    style={{
                      minHeight: 64,
                      padding: '14px 16px',
                      opacity: locked ? 0.84 : 1,
                      borderColor: locked ? '#C4A574' : undefined,
                      background: locked ? 'linear-gradient(135deg, #FFFDF8 0%, #FFF3D6 100%)' : undefined,
                      animationDelay: locked ? '140ms' : undefined,
                      boxShadow: locked ? '0 10px 26px rgba(196,149,56,0.2)' : undefined,
                    }}
                  >
                    <div className={['quiz-check flex-shrink-0', sel ? 'checked' : ''].join(' ')}>
                      {sel && (
                        <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                          <path d="M1 4L4.5 7.5L11 1" stroke="#F9F6F1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-base" style={{ color: sel ? '#1C3A2E' : '#3D2E22' }}>
                        {opt.label}
                        {opt.sub && <span className="font-normal text-xs ml-1.5" style={{ color: '#9C8E84' }}>{opt.sub}</span>}
                      </div>
                      {opt.what && (
                        <div className="text-xs mt-0.5 leading-snug" style={{ color: '#9C8E84' }}>{opt.what}</div>
                      )}
                      {locked && (
                        <div className="text-[11px] mt-1.5 font-semibold" style={{ color: '#4A7C59' }}>
                          Upgrade to Pro to unlock Super Stack →
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {!isProUser && (
              <div
                className="rounded-2xl px-4 py-3 flex items-start gap-2.5"
                style={{ background: '#F0F5F2', border: '1px solid #D4E8DA' }}
              >
                <span style={{ color: '#4A7C59', fontSize: 14, flexShrink: 0, marginTop: 1 }}>🧬</span>
                <p className="text-xs leading-relaxed" style={{ color: '#4A7C59' }}>
                  Our most comprehensive starting point: in-depth supplement education including peptide guidance and timing approaches. For dedicated users who want the full picture. Requires Pro.
                </p>
              </div>
            )}

            {/* Value note */}
            <div
              className="rounded-2xl px-4 py-3 flex items-start gap-2.5"
              style={{ background: '#FDFCFA', border: '1px solid #E8E0D5' }}
            >
              <span style={{ color: '#C4B9AC', fontSize: 14, flexShrink: 0, marginTop: 1 }}>💡</span>
              <p className="text-xs leading-relaxed" style={{ color: '#9C8E84' }}>
                The average person wastes $80 to $120 per month on supplements that don't match their biology.
                Stacky helps you spend on what actually fits you, not on what sounded urgent in an ad.
              </p>
            </div>

            <div className="mt-6 pt-6 border-t border-[#E8E0D5]">
              <div
                className="relative mx-auto flex w-full max-w-md items-end justify-center"
                style={{ minHeight: 200 }}
              >
                <StackyCat
                  mood={getStepStacky(6).mood}
                  size={88}
                  outfit={getStepStacky(step).outfit}
                  bubble="Last step: pick a monthly range that feels honest. We'll build within it. 🐾"
                  bubblePosition="top"
                />
              </div>
            </div>
          </div>
        )}

        {/* ─── NAVIGATION ─── */}
        <div className="quiz-bottom-nav">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setStep((s) => Math.max(1, s - 1));
              }}
              disabled={step === 1}
            >
              ←
            </button>

            {step < 6 ? (
              <button
                type="button"
                className="btn-primary flex-1"
                onClick={() => {
                  if (step === 4 && step4SubSlide === 'background') {
                    if (!stepValidity(4)) return;
                    setStep4SubSlide('frustrations');
                    return;
                  }
                  if (!stepValidity(step)) return;
                  setStep((s) => {
                    const next = Math.min(6, s + 1);
                    maybeShowFact(next);
                    return next;
                  });
                }}
                disabled={!stepValidity(step)}
              >
                {stepValidity(step)
                  ? 'Continue'
                  : step === 2 && !(draft.primaryGoals ?? []).length
                    ? 'Pick at least one goal area'
                    : step === 4 && step4SubSlide === 'background'
                      ? 'Complete each health topic first'
                      : step === 4 && step4SubSlide === 'frustrations'
                        ? 'Pick at least one improvement priority'
                        : 'Select an option to continue'}
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary flex-1"
                onClick={() => {
                  if (!payload) return;
                  if (nameDraft.trim()) setUserName(nameDraft.trim());
                  submitAnalyze(payload);
                }}
                disabled={!payload || isAnalyzing}
              >
                Reveal My Personalised Stack
              </button>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            className="mt-4 rounded-2xl p-4"
            style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}
          >
            <div className="font-semibold text-sm" style={{ color: '#991B1B' }}>Something went wrong</div>
            <div className="mt-1 text-xs leading-relaxed" style={{ color: '#B91C1C' }}>{error}</div>
            <p className="mt-2 text-[11px] leading-relaxed" style={{ color: '#7F1D1D' }}>
              Your quiz answers are already saved on this device. Tap Try again to resend the same answers—you do not need to redo the quiz.
            </p>
            <button
              type="button"
              className="btn-primary mt-3"
              style={{ height: 44, fontSize: 14, background: '#991B1B' }}
              onClick={() => { if (!payload) return; submitAnalyze(payload); }}
              disabled={!payload || isAnalyzing}
            >
              Try Again
            </button>
          </div>
        )}

      </div>

      {step2UpgradeGate && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center px-4"
          style={{ background: 'rgba(28,58,46,0.55)', backdropFilter: 'blur(6px)' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="step2-upgrade-title"
          onClick={() => setStep2UpgradeGate(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-6 shadow-xl"
            style={{ background: '#F9F6F1', border: '1px solid #E8E0D5' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="step2-upgrade-title"
              className="font-serif font-light text-xl mb-2"
              style={{ color: '#1C3A2E', fontStyle: 'italic', letterSpacing: '-0.01em' }}
            >
              {step2UpgradeGate.reason === 'max_goals' && 'Goal limit on Free'}
              {step2UpgradeGate.reason === 'paid_goal' && `${step2UpgradeGate.label} is a paid pick`}
              {step2UpgradeGate.reason === 'pro_goal' && `${step2UpgradeGate.label} is Pro-only`}
            </h2>
            <p className="text-sm leading-relaxed mb-5" style={{ color: '#6B5B4E' }}>
              {step2UpgradeGate.reason === 'max_goals' && (
                <>
                  On the free plan you can select up to {FREE_MAX_PRIMARY_GOALS} goals.{' '}
                  <strong style={{ color: '#1C3A2E' }}>Basic</strong> or{' '}
                  <strong style={{ color: '#1C3A2E' }}>Pro</strong> unlocks more goals so your stack can cover everything you care
                  about. Basic also unlocks LooksMaxxing; Pro adds Peptide Optimization.
                </>
              )}
              {step2UpgradeGate.reason === 'paid_goal' && (
                <>
                  <strong style={{ color: '#1C3A2E' }}>{step2UpgradeGate.label}</strong> is included on{' '}
                  <strong style={{ color: '#1C3A2E' }}>Basic</strong> and <strong style={{ color: '#1C3A2E' }}>Pro</strong>, not on
                  the free plan. Upgrade when you are ready, then come back and select it.
                </>
              )}
              {step2UpgradeGate.reason === 'pro_goal' && (
                <>
                  <strong style={{ color: '#1C3A2E' }}>{step2UpgradeGate.label}</strong> is only available on{' '}
                  <strong style={{ color: '#1C3A2E' }}>Pro</strong>. Basic includes LooksMaxxing and full stack features, but peptide
                  goals and peptide guidance stay on Pro.
                </>
              )}
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                className="btn-primary w-full"
                style={{ height: 48 }}
                onClick={() => {
                  setStep2UpgradeGate(null);
                  navigate('/pricing');
                }}
              >
                View plans
              </button>
              <button
                type="button"
                className="w-full text-xs font-semibold py-2 rounded-xl"
                style={{ color: '#9C8E84' }}
                onClick={() => setStep2UpgradeGate(null)}
              >
                Not now — keep my current picks
              </button>
            </div>
          </div>
        </div>
      )}

      <HealthFactPopup open={showFact} onClose={dismissFact} factIdx={factIdx} />
      <LoadingOverlay isActive={isAnalyzing} />
    </div>
  );
}


