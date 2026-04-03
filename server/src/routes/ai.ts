import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Request } from 'express';
import { Router } from 'express';
import { requireAuth, requireApiAuth, type AuthedRequest } from '../auth/middleware.js';
import { incrementStackGenerations, incrementChatMessages, getUser, getActiveTierForUser } from '../db/index.js';
import { assertCanGenerateStack, PaidRequiredError } from '../services/entitlements.js';
import { analyzeWithGemini } from '../services/gemini.js';

/** Rolling window rate limit for /analyze (abuse protection; not a substitute for auth). */
const ANALYZE_MAX_PER_HOUR = Number(process.env.ANALYZE_MAX_PER_HOUR ?? 30);
const analyzeHits = new Map<string, number[]>();
const SUPER_FOCUS_MAX_CHARS = 200;
/** Quiz step 4 Improvements: optional “More detail?” field only */
const FRUSTRATION_OTHER_MAX_CHARS = 50;

function getClientIp(req: Request): string {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.trim()) return xf.split(',')[0]?.trim() ?? 'unknown';
  return req.socket.remoteAddress ?? 'unknown';
}

function rateLimitAnalyze(ip: string): boolean {
  const now = Date.now();
  const hour = 60 * 60 * 1000;
  let hits = analyzeHits.get(ip) ?? [];
  hits = hits.filter((t) => now - t < hour);
  if (hits.length >= ANALYZE_MAX_PER_HOUR) return false;
  hits.push(now);
  analyzeHits.set(ip, hits);
  return true;
}

function sanitizeSuperFocusText(raw: string): string {
  return raw
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/<\s*\/?\s*script/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
    .slice(0, SUPER_FOCUS_MAX_CHARS);
}

function sanitizeFrustrationOtherText(raw: string): string {
  return raw
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/<\s*\/?\s*script/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
    .slice(0, FRUSTRATION_OTHER_MAX_CHARS);
}

/** Align with client: short messages only; strip control chars and obvious injection patterns */
const CHAT_MESSAGE_MAX_LEN = 50;

function sanitizeChatMessageText(raw: string): string {
  return raw
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/<\s*\/?script/gi, '')
    .replace(/javascript:/gi, '')
    .trim()
    .slice(0, CHAT_MESSAGE_MAX_LEN);
}

export type IntakePayload = {
  ageRange: '18-25' | '26-35' | '36-45' | '46-55' | '55+';
  biologicalSex: 'Male' | 'Female' | 'Prefer not to say';
  heightCm: number;
  weightKg: number;
  weightIsApproximate?: boolean;
  mindset:
    | 'Beginner: I am new and want a clear personalized starting point'
    | 'Intermediate: I want to improve my health and consistency'
    | 'Advanced: I am already healthy and want precision optimization';
  /** Optional specific near-term target from quiz */
  specificGoal?: string;
  /** Optional first name for personalized generated copy */
  preferredFirstName?: string;
  primaryGoals: (
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
    | '🧬 Peptide Optimization'
  )[];
  currentFeelings: string[];
  healthBackground: string[];
  prescriptionMedication?: string;
  prescriptionMedicationOther?: string;
  symptomDuration:
    | 'Less than 1 month'
    | '1-3 months'
    | '3-6 months'
    | '6-12 months'
    | 'Over 1 year'
    | 'As long as I can remember / my whole life';
  biggestFrustrations: string[];
  frustrationOther?: string;
  dietaryPreferences: string[];
  monthlyBudget: '$30-$60' | 'Under $30' | '$60-$100' | '$100+' | '$150+';
};

const router = Router();

router.post('/analyze', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const analyzeSecret = process.env.ANALYZE_SECRET;
    if (analyzeSecret) {
      const sent = req.headers['x-stackwise-analyze'];
      if (sent !== analyzeSecret) {
        return res.status(401).json({ error: 'Unauthorized.' });
      }
    }

    const ip = getClientIp(req);
    if (!rateLimitAnalyze(ip)) {
      return res.status(429).json({
        error: 'Too many stack builds from this network. Please try again later.',
      });
    }

    const rawBody = req.body as Record<string, unknown> | null;
    if (!rawBody || typeof rawBody !== 'object') {
      return res.status(400).json({ error: 'Missing request body.' });
    }

    const subscriptionTierRaw = rawBody.subscriptionTier;
    const subscriptionTier =
      subscriptionTierRaw === 'basic' || subscriptionTierRaw === 'pro'
        ? subscriptionTierRaw
        : subscriptionTierRaw === 'free'
          ? 'free'
          : 'free';
    const replacingExistingStack = rawBody.replacingExistingStack === true;

    delete rawBody.subscriptionTier;
    delete rawBody.replacingExistingStack;

    const strict = requireApiAuth();
    if (strict) {
      if (!req.userId) {
        return res.status(401).json({ error: 'Missing session.' });
      }
      try {
        assertCanGenerateStack(req.userId);
      } catch (e) {
        if (e instanceof PaidRequiredError) {
          return res.status(403).json({
            error: 'Further stack builds require Basic or Pro.',
            message: 'Subscribe in the app, then activate your plan after checkout.',
          });
        }
        throw e;
      }
    } else if (replacingExistingStack && subscriptionTier !== 'basic' && subscriptionTier !== 'pro') {
      return res.status(403).json({
        error: 'Replacing an existing stack requires Basic or Pro.',
        message:
          'Your device reported a stack rebuild without an active paid plan. If you subscribe, try again from the app after checkout.',
      });
    }

    const payload = rawBody as Partial<IntakePayload>;

    // Minimal runtime validation to prevent sending nonsense to Gemini.
    const requiredFields: (keyof IntakePayload)[] = [
      'ageRange',
      'biologicalSex',
      'heightCm',
      'weightKg',
      'mindset',
      'primaryGoals',
      'currentFeelings',
      'healthBackground',
      'symptomDuration',
      'biggestFrustrations',
      'dietaryPreferences',
      'monthlyBudget',
    ];

    for (const key of requiredFields) {
      if (payload[key] === undefined || payload[key] === null) {
        return res.status(400).json({ error: `Missing field: ${String(key)}.` });
      }
    }
    if (!Array.isArray(payload.primaryGoals) || payload.primaryGoals.length === 0) {
      return res.status(400).json({ error: 'primaryGoals must be a non-empty array.' });
    }
    if (!Array.isArray(payload.biggestFrustrations) || payload.biggestFrustrations.length === 0) {
      return res.status(400).json({ error: 'biggestFrustrations must be a non-empty array.' });
    }
    if (typeof payload.heightCm !== 'number' || Number.isNaN(payload.heightCm)) {
      return res.status(400).json({ error: 'heightCm must be a valid number (centimeters).' });
    }
    if (payload.heightCm < 100 || payload.heightCm > 250) {
      return res.status(400).json({ error: 'heightCm must be between 100 and 250.' });
    }
    if (typeof payload.weightKg !== 'number' || Number.isNaN(payload.weightKg)) {
      return res.status(400).json({ error: 'weightKg must be a valid number (kilograms).' });
    }
    if (payload.weightKg < 30 || payload.weightKg > 300) {
      return res.status(400).json({ error: 'weightKg must be between 30 and 300.' });
    }
    const allowedBudgets = new Set(['Under $30', '$30-$60', '$60-$100', '$100+', '$150+']);
    if (typeof payload.monthlyBudget !== 'string' || !allowedBudgets.has(payload.monthlyBudget)) {
      return res.status(400).json({ error: 'monthlyBudget must be one of: Under $30, $30-$60, $60-$100, $100+, $150+.' });
    }

    const sanitizedPayload = {
      ...(payload as IntakePayload),
      specificGoal:
        typeof payload.specificGoal === 'string'
          ? sanitizeSuperFocusText(payload.specificGoal) || undefined
          : undefined,
      frustrationOther:
        typeof payload.frustrationOther === 'string'
          ? sanitizeFrustrationOtherText(payload.frustrationOther) || undefined
          : undefined,
    } as IntakePayload;

    const result = await analyzeWithGemini(sanitizedPayload);
    if (strict && req.userId) {
      incrementStackGenerations(req.userId);
    }
    return res.status(200).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({
      error: 'Failed to analyze your health profile.',
      message,
    });
  }
});

router.post('/chat', requireAuth, async (req: AuthedRequest, res) => {
  try {
    if (requireApiAuth() && !req.userId) {
      return res.status(401).json({ error: 'Missing session.' });
    }
    const body = req.body as {
      message?: unknown;
      history?: unknown;
      stackContext?: unknown;
    } | null;

    if (!body || typeof body.message !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid message.' });
    }
    const message = sanitizeChatMessageText(body.message);
    if (!message) {
      return res.status(400).json({ error: 'Missing or invalid message.' });
    }
    if (!Array.isArray(body.history)) {
      return res.status(400).json({ error: 'Missing or invalid history.' });
    }
    if (typeof body.stackContext !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid stackContext.' });
    }

    const FREE_CHAT_LIMIT = 3;
    if (requireApiAuth() && req.userId) {
      const chatUser = getUser(req.userId);
      if (chatUser) {
        const chatTier = getActiveTierForUser(req.userId);
        if (chatTier === 'free' && chatUser.chat_messages_used >= FREE_CHAT_LIMIT) {
          return res.status(403).json({
            error: 'FREE_CHAT_LIMIT_REACHED',
            message: `Free accounts include ${FREE_CHAT_LIMIT} questions. Upgrade to Pro for unlimited guidance.`,
          });
        }
        if (chatTier === 'free') {
          incrementChatMessages(req.userId);
        }
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // eslint-disable-next-line no-console
      console.error('[chat] Missing GEMINI_API_KEY');
      return res.status(500).json({ error: 'Chat failed. Please try again.' });
    }

    const modelName = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
    const stackContext = body.stackContext as string;
    const isLandingCoach = stackContext.startsWith('[STACKY_LANDING]');

    const systemPrompt = isLandingCoach
      ? `You are StackWise Coach, a knowledgeable and friendly supplement advisor embedded in the StackWise app.

CONTEXT (landing / pre-quiz):
The user has NOT yet generated a personalized supplement stack in StackWise. They may be on the homepage.

YOUR ROLE:
- Explain that StackWise uses a short quiz to build a personalized protocol, then the Coach helps with timing, interactions, and questions on the results page
- Answer high-level supplement education questions (not personal medical advice)
- Encourage them to tap "Build my stack" or take the quiz when they want personalized recommendations
- Do NOT invent a specific stack or pretend you have their quiz answers
- Be warm, encouraging, and clear

CONTEXT LINE (do not contradict):
${stackContext}

STRICT RULES:
- Do NOT use the <STACKWISE_ADD> marker: they have no stack in the app yet
- Never diagnose medical conditions or make treatment claims
- If asked about drug interactions or serious medical concerns, recommend consulting their doctor
- Keep responses concise (2-4 sentences unless a detailed answer is clearly needed)
- Stay within health, supplements, and lifestyle topics
- If asked something off-topic, politely refuse in one sentence and redirect
- If stackContext includes "Subscription tier: pro", you may provide concrete lifestyle tactics beyond supplements (movement, sleep routine, hydration/electrolytes, food quality, stress habits) that directly support the user's goals. Keep them practical and specific.
- For creatine dosing, treat amounts in grams (g), not milligrams (mg). If discussing >5g/day, mention hydration and electrolyte intake, split dosing for tolerance, and that higher dosing may be used for cognitive support in select users.
- If the user asks about peptides, you may discuss them in educational terms. Always open peptide discussions with: "Peptides are research chemicals not FDA-approved for these uses; this is educational only. Consult a physician before starting." Then provide accurate, detailed information. Peptide guidance is a Pro-tier feature. If the user is not on Pro and asks about peptides, let them know peptide guidance is available with StackWise Pro.
- For peptide questions: cover mechanism, dosing protocol, cycling, stacking with supplements, realistic expectations, and sourcing considerations (without recommending specific vendors).`
      : `You are StackWise Coach, a knowledgeable and friendly supplement advisor embedded in the StackWise app.

The user has just received their personalized supplement stack. You have full context of their recommended stack below.

YOUR ROLE:
- Answer questions about their specific supplements: dosage, timing, benefits, interactions
- Explain WHY each supplement was recommended for their goals
- Help them understand how to get the most out of their stack
- Answer general supplement and nutrition questions
- Be warm, encouraging, and clear, like a knowledgeable friend, not a clinical robot

THEIR PERSONALIZED STACK:
${stackContext}

STRICT RULES:
- If stackContext includes "Quiz free-text" or optional improvement / prescription detail lines, treat that text as high-priority user intent: keep it in mind across replies, reference it when relevant, and do not ignore or contradict it.
- Never recommend new supplements outside their current stack unless they explicitly ask to add something, include something in the stack, or describe supplements they already take and want on the plan
- Never diagnose medical conditions or make treatment claims
- If asked about drug interactions or serious medical concerns, always recommend consulting their doctor
- Keep responses concise (2-4 sentences unless a detailed answer is clearly needed)
- Always end responses that touch on medical topics with: "As always, check with your healthcare provider for personalized medical advice."
- Never break character or discuss being an AI unless directly asked
- Stay strictly within health, supplement, and lifestyle questions
- If the user asks something outside that scope, politely refuse in 1 sentence and redirect to supplement/health/lifestyle help
- If stack context includes a "User mindset" line, adapt tone and depth to match it (Beginner = simple guidance, Intermediate = supportive and habit-focused, Advanced = precision optimization detail)
- If stackContext includes "Subscription tier: pro", include practical lifestyle coaching beyond supplements when relevant: examples include daily step targets, sodium/potassium balance, omega-3 to omega-6 food choices, sleep consistency, meal timing, and stress-management habits tailored to their goals.
- For creatine dosing, treat amounts in grams (g), not milligrams (mg). If discussing >5g/day, mention hydration and electrolyte intake, split dosing for tolerance, and that higher dosing may be used for cognitive support in select users.
- If recommending any supplement or peptide, always specify absorption context in addition to timing: explicitly say whether it should be taken with food, empty stomach/without food, with fat, or if meal timing is not critical.
- Never use two ASCII hyphens together in responses. Never use em dash or en dash characters. Use commas, periods, and colons only.
- If the user asks about peptides, you may discuss them in educational terms. Always open peptide discussions with: "Peptides are research chemicals not FDA-approved for these uses; this is educational only. Consult a physician before starting." Then provide accurate, detailed information. Peptide guidance is a Pro-tier feature. If the user is not on Pro and asks about peptides, let them know peptide guidance is available with StackWise Pro.
- For peptide questions: cover mechanism, dosing protocol, cycling, stacking with supplements, realistic expectations, and sourcing considerations (without recommending specific vendors).
- When the user asks to add, include, or "put X in my stack", or says they already take something and want it on their plan, you MUST add it: reply with a short helpful explanation, then append the marker below with complete JSON (no placeholders). Match the depth of quiz recommendations: tagline, why it fits them, key benefit, what they might notice, evidence strength, time to effect, monthly cost range, Amazon/iHerb search terms. If something is unsafe for their profile, refuse in text and do not output the marker.
- If the user explicitly asks to add/include a supplement in their current stack (including items they already take but want tracked like the rest), append this exact marker at the very end on a new line:
<STACKWISE_ADD>{"name":"","tagline":"","whyYouNeedThis":"","keyBenefit":"","whatYoullFeel":"","dosage":"","timing":"","estimatedMonthlyCostLow":0,"estimatedMonthlyCostHigh":0,"amazonSearchTerm":"","iHerbSearchTerm":"","evidenceStrength":"Moderate","timeToEffect":"","addressesGoals":[]}</STACKWISE_ADD>
- Include "addressesGoals" as 1-4 strings copied exactly from Primary goals in stack context when the supplement supports those goals; otherwise use an empty array.
- In any <STACKWISE_ADD> payload, the "timing" field must include both clock timing and absorption context (with food / empty stomach / with fat / meal timing not critical), and include spacing from meds/minerals when relevant, so daily schedule placement is clear.
- Only include that marker when they explicitly ask to add/include a supplement or want something they already take added to the app stack.`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: systemPrompt,
    });

    const history = body.history
      .map((msg: { role: string; text: string }) => {
        const text =
          typeof msg?.text === 'string' ? sanitizeChatMessageText(msg.text) : '';
        const role = msg?.role === 'model' ? 'model' : 'user';
        return { role: role as 'user' | 'model', parts: [{ text }] };
      })
      .filter((h) => h.parts[0].text.length > 0);

    const chat = model.startChat({ history });

    const result = await chat.sendMessage(message);
    const reply = result.response.text();
    return res.status(200).json({ reply });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[chat] Gemini request failed:', err);
    return res.status(500).json({ error: 'Chat failed. Please try again.' });
  }
});

export default router;

