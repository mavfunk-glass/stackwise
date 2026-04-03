import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeWithGemini, type IntakePayload, type GeminiResult } from '../services/gemini.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(scriptDir, '../../.env') });
dotenv.config({ path: path.resolve(scriptDir, '../../../.env') });

type Scenario = {
  id: string;
  payload: IntakePayload;
};

function namesSet(result: GeminiResult) {
  return new Set(result.supplements.map((supplement) => supplement.name.toLowerCase().trim()));
}

function jaccardSimilarity(a: Set<string>, b: Set<string>) {
  const union = new Set([...a, ...b]);
  const intersectionCount = [...a].filter((item) => b.has(item)).length;
  return union.size === 0 ? 0 : intersectionCount / union.size;
}

function fail(message: string): never {
  throw new Error(`DIAGNOSIS FAILED: ${message}`);
}

function assert(condition: boolean, message: string) {
  if (!condition) fail(message);
}

const scenarios: Scenario[] = [
  {
    id: 'budget-fat-loss-ssri',
    payload: {
      ageRange: '26-35',
      biologicalSex: 'Female',
      heightCm: 165,
      weightKg: 81,
      mindset: 'Beginner: I am new and want a clear personalized starting point',
      specificGoal: 'lose 8 pounds in 8 weeks while reducing late night cravings',
      primaryGoals: ['🔥 Fat Loss', '⚡ Energy & Focus'],
      currentFeelings: ['Afternoon crash', 'Sugar cravings', 'Low motivation'],
      healthBackground: ['Taking SSRI / antidepressant'],
      prescriptionMedication: 'SSRI / antidepressant',
      symptomDuration: '3-6 months',
      biggestFrustrations: [
        "My weight won't move no matter what I do",
        "I hit a wall every afternoon and can't push through",
      ],
      dietaryPreferences: ['No major restrictions'],
      monthlyBudget: 'Under $30',
    },
  },
  {
    id: 'muscle-performance-advanced',
    payload: {
      ageRange: '18-25',
      biologicalSex: 'Male',
      heightCm: 182,
      weightKg: 77,
      mindset: 'Advanced: I am already healthy and want precision optimization',
      specificGoal: 'add lean mass and improve workout recovery between heavy sessions',
      primaryGoals: ['💪 Muscle & Strength', '😴 Sleep & Recovery'],
      currentFeelings: ['Plateaued lifts', 'Sore for too long'],
      healthBackground: ['None of the above'],
      symptomDuration: '1-3 months',
      biggestFrustrations: [
        "I've stopped working out or can't recover the way I used to",
        'I want training recovery and muscle repair support from my stack',
      ],
      dietaryPreferences: ['High protein diet'],
      monthlyBudget: '$150+',
    },
  },
  {
    id: 'gut-skin-mid-budget',
    payload: {
      ageRange: '36-45',
      biologicalSex: 'Prefer not to say',
      heightCm: 171,
      weightKg: 72,
      mindset: 'Intermediate: I want to improve my health and consistency',
      specificGoal: 'stop bloating after meals and calm recurring breakouts',
      primaryGoals: ['🫧 Debloating & Gut Health', '✨ Skin Health & Glow'],
      currentFeelings: ['Bloating after meals', 'Skin flareups', 'Low confidence'],
      healthBackground: ['Mild reflux / sensitive digestion'],
      symptomDuration: 'Over 1 year',
      biggestFrustrations: [
        'I feel bloated or uncomfortable after eating',
        'My skin looks dull, tired, or broken out',
      ],
      dietaryPreferences: ['Mostly dairy free'],
      monthlyBudget: '$60-$100',
    },
  },
  {
    id: 'looksmaxxing-debloat-glow',
    payload: {
      ageRange: '26-35',
      biologicalSex: 'Male',
      heightCm: 178,
      weightKg: 82,
      mindset: 'Intermediate: I want to improve my health and consistency',
      specificGoal: 'less facial puff in photos and a healthier-looking glow',
      primaryGoals: ['🪞 LooksMaxxing'],
      currentFeelings: [
        'Face looks puffy or bloated, especially in the morning or photos',
        'I want a healthy radiance people notice, not just a clear routine',
      ],
      healthBackground: ['None of the above'],
      symptomDuration: '3-6 months',
      biggestFrustrations: [
        'I want my face to look tighter and less puffy in photos',
        'I want clearer skin texture and a more even tone',
      ],
      dietaryPreferences: ['No major restrictions'],
      monthlyBudget: '$60-$100',
    },
  },
];

async function run() {
  if (!process.env.GEMINI_API_KEY) {
    fail('GEMINI_API_KEY is missing. Add it to environment before running diagnostics.');
  }

  const results: Array<{ id: string; result: GeminiResult }> = [];
  for (const scenario of scenarios) {
    // eslint-disable-next-line no-console
    console.log(`Running scenario: ${scenario.id}`);
    const result = await analyzeWithGemini(scenario.payload);
    assert(result.supplements.length > 0, `${scenario.id} returned no supplements`);
    results.push({ id: scenario.id, result });
  }

  for (let i = 0; i < results.length; i++) {
    for (let j = i + 1; j < results.length; j++) {
      const a = results[i];
      const b = results[j];
      const similarity = jaccardSimilarity(namesSet(a.result), namesSet(b.result));
      assert(
        similarity <= 0.75,
        `stacks too similar (${(similarity * 100).toFixed(1)}%) between ${a.id} and ${b.id}`,
      );
    }
  }

  // eslint-disable-next-line no-console
  console.log('Personalization diagnostics passed across all scenarios.');
}

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
