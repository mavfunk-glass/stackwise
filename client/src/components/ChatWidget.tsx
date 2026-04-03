import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import StackyCat, { type StackyMood } from './StackyCat';
import { apiUrl } from '../api/apiUrl';
import { apiAuthHeaders, ensureApiSession } from '../api/session';
import {
  decrementChatCredit,
  getChatCredits,
  isPro,
  loadStoredState,
  saveResult,
  setChatCreditsRemaining,
} from '../types/storage';
import type { PrimaryGoal, Supplement } from '../types/stackwise';
import { trackEvent } from '../analytics/track';

/** Pass when the user has not taken the quiz yet; enables landing-mode Stacky behavior. */
export const STACKY_LANDING_STACK_CONTEXT =
  '[STACKY_LANDING] The user has not completed the StackWise quiz yet. No personalized supplement stack exists. Stacky is positioned as their guide through supplement confusion and pushy marketing, offering clarity and a plan tailored to their goals once they finish the quiz.';

export interface ChatWidgetProps {
  stackContext: string;
  onStackUpdated?: () => void;
  defaultExpanded?: boolean;
  /** Increment from parent (e.g. button click) to open the chat panel */
  openSignal?: number;
}

type ChatMessage = {
  role: 'user' | 'model';
  text: string;
  isGreeting?: boolean;
  remainingCreditsAfter?: number;
};

const BLURRED_PREVIEWS = [
  "Based on your stack and goals, the most important timing change you should make is taking your magnesium earlier in the evening. Here's exactly why and when...",
  "The supplement you're probably missing that would make the biggest difference for your specific goal is something most people have never heard of...",
  "There's actually a conflict in your current stack that's reducing the effectiveness of two of your supplements by up to 40%. Here's what to change...",
  "Your 30-day results could be significantly better if you made one adjustment to how you're taking your stack. The difference is in the timing of...",
  "Based on everything in your profile, the single highest-impact change you could make right now isn't adding something. It's changing when you take...",
];

/** User messages are capped for safety; quick prompts must fit under the same limit */
const CHAT_INPUT_MAX_CHARS = 50;

const QUICK_PROMPTS = [
  'What should I take first from my stack?',
  'Any interactions I should worry about?',
  'How should I time this around meals?',
  'Can you simplify my daily schedule?',
  'Add one supplement that fits my goals',
];

function sanitizeChatInput(raw: string): string {
  return raw
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/<\s*\/?script/gi, '')
    .replace(/javascript:/gi, '')
    .slice(0, CHAT_INPUT_MAX_CHARS);
}

function getBlurredPreview(): string {
  return BLURRED_PREVIEWS[Math.floor(Math.random() * BLURRED_PREVIEWS.length)];
}

function buildGreeting(freeCount: number): string {
  const q = freeCount === 1 ? 'question' : 'questions';
  return `Hi! I'm Stacky the stack cat 🐾\n\nYour personalized guide is loaded here. You have ${freeCount} free ${q} to sort timing, combinations, or whether something new is worth it (not just what marketing said).\n\nWhat should we start with?`;
}

const PRO_GREETING =
  "Hi! I'm Stacky the stack cat 🐾 You're on Pro with ongoing support.\n\nYour full guide from the quiz is here. Ask about timing, combinations, how to adjust as goals change, or whether a new bottle is worth it before you buy.\n\nWhat do you want to dig into?";

function buildLandingGreeting(freeCount: number): string {
  const q = freeCount === 1 ? 'question' : 'questions';
  return `Hi! I'm Stacky the stack cat 🐾\n\nI'm here to cut through the noise: what to prioritize, how things work together, how forms differ, or where to start when every label claims a miracle.\n\nYou have ${freeCount} free ${q}. Finish the quiz and I can anchor everything to your goals and your actual needs.\n\nWhat's on your mind?`;
}

const LANDING_PRO_GREETING =
  "Hi! I'm Stacky the stack cat 🐾\n\nYou're on Pro with ongoing support.\n\nYour guide from the quiz is here. Ask about timing, combinations, goal shifts, or whether something new fits what you already take.\n\nI can also cover peptide education and cycling basics when relevant.\n\nWhat do you want to know?";

const ADD_MARKER_REGEX = /<STACKWISE_ADD>([\s\S]*?)<\/STACKWISE_ADD>/i;

function normalizeSupplement(candidate: unknown): Supplement | null {
  if (!candidate || typeof candidate !== 'object') return null;
  const source = candidate as Record<string, unknown>;
  const asString = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const asNumber = (v: unknown) => {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string') {
      const parsed = Number(v);
      return Number.isFinite(parsed) ? parsed : NaN;
    }
    return NaN;
  };

  const evidence = asString(source.evidenceStrength);
  const evidenceStrength: Supplement['evidenceStrength'] =
    evidence === 'Strong' || evidence === 'Moderate' || evidence === 'Emerging'
      ? evidence
      : 'Moderate';

  const lowCost = Math.max(0, Math.round(asNumber(source.estimatedMonthlyCostLow)));
  const highCostRaw = Math.max(0, Math.round(asNumber(source.estimatedMonthlyCostHigh)));
  const highCost = Math.max(lowCost, highCostRaw);

  const rawGoals = source.addressesGoals;
  const addressesGoals: PrimaryGoal[] | undefined =
    Array.isArray(rawGoals) && rawGoals.length
      ? (rawGoals.filter((g) => typeof g === 'string') as PrimaryGoal[])
      : undefined;

  const normalized: Supplement = {
    name: asString(source.name),
    tagline: asString(source.tagline) || 'Stacky-added recommendation',
    ...(addressesGoals && addressesGoals.length ? { addressesGoals } : {}),
    whyYouNeedThis: asString(source.whyYouNeedThis) || 'Added by Stacky based on your goals.',
    keyBenefit: asString(source.keyBenefit) || 'Additional targeted support',
    whatYoullFeel: asString(source.whatYoullFeel) || 'You may notice gradual improvements over the next few weeks.',
    dosage: asString(source.dosage) || 'Use as directed',
    timing: asString(source.timing) || 'Morning with food.',
    estimatedMonthlyCostLow: Number.isNaN(lowCost) ? 15 : lowCost,
    estimatedMonthlyCostHigh: Number.isNaN(highCost) ? 30 : highCost,
    amazonSearchTerm: asString(source.amazonSearchTerm) || asString(source.name),
    iHerbSearchTerm: asString(source.iHerbSearchTerm) || asString(source.name),
    ...(asString(source.amazonUrl) ? { amazonUrl: asString(source.amazonUrl) } : {}),
    ...(asString(source.amazonAsin) ? { amazonAsin: asString(source.amazonAsin) } : {}),
    ...(asString(source.iherbUrl) ? { iherbUrl: asString(source.iherbUrl) } : {}),
    ...(asString(source.iherbPath) ? { iherbPath: asString(source.iherbPath) } : {}),
    ...(asString(source.amazonUrlOrAsin)
      ? { amazonUrlOrAsin: asString(source.amazonUrlOrAsin) }
      : {}),
    ...(asString(source.iHerbUrlOrPath) ? { iHerbUrlOrPath: asString(source.iHerbUrlOrPath) } : {}),
    evidenceStrength,
    timeToEffect: asString(source.timeToEffect) || '2-6 weeks',
  };

  if (!normalized.name) return null;
  return normalized;
}

function extractAddSupplementAction(reply: string): { cleanReply: string; supplement: Supplement | null } {
  const match = reply.match(ADD_MARKER_REGEX);
  if (!match) return { cleanReply: reply, supplement: null };

  let supplement: Supplement | null = null;
  try {
    supplement = normalizeSupplement(JSON.parse(match[1]));
  } catch {
    supplement = null;
  }

  const cleanReply = reply.replace(ADD_MARKER_REGEX, '').trim();
  return { cleanReply, supplement };
}

function resolveScheduleTargets(timing: string, dosage: string): Array<'morning' | 'afternoon' | 'evening'> {
  const haystack = `${timing} ${dosage}`.toLowerCase();
  const targets = new Set<'morning' | 'afternoon' | 'evening'>();

  if (/(morning|breakfast|am\b|upon waking|wake)/.test(haystack)) targets.add('morning');
  if (/(afternoon|midday|lunch|noon|early afternoon)/.test(haystack)) targets.add('afternoon');
  if (/(evening|night|bed|before bed|dinner|pm\b)/.test(haystack)) targets.add('evening');

  if (/(twice daily|2x daily|two times daily|morning and evening|am and pm)/.test(haystack)) {
    targets.add('morning');
    targets.add('evening');
  }
  if (/(three times daily|3x daily|with each meal)/.test(haystack)) {
    targets.add('morning');
    targets.add('afternoon');
    targets.add('evening');
  }

  if (targets.size === 0) targets.add('morning');
  return Array.from(targets);
}

function MidSessionNudge({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="mx-3 mb-2 rounded-xl border border-moss/25 bg-moss-light/40 p-3 flex items-start gap-2.5">
      <span className="text-moss text-base flex-shrink-0 mt-0.5">💡</span>
      <div className="flex-1 min-w-0">
        <div className="text-forest font-bold text-xs">You have 1 free question left</div>
        <div className="text-warm-mid text-[11px] mt-0.5 leading-relaxed">
          Pro members get unlimited stack guidance, plan rebuilds, and support as their goals evolve, for less than most single supplements.
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Link
            to="/pricing"
            className="text-[11px] font-bold bg-forest px-2.5 py-1 rounded-lg hover:bg-forest-light transition"
            style={{ color: '#F9F6F1' }}
          >
            Upgrade ($19/mo)
          </Link>
          <button
            type="button"
            onClick={onDismiss}
            className="text-[11px] text-warm-light hover:text-warm-mid transition"
          >
            Use my last question
          </button>
        </div>
      </div>
    </div>
  );
}

function UpgradeWall({ onClose }: { onClose: () => void }) {
  const blurredPreview = useRef(getBlurredPreview()).current;

  return (
    <div className="border-t flex flex-col shrink-0 overflow-y-auto" style={{ borderColor: '#E8E0D5', maxHeight: 'min(55dvh, 420px)', background: '#F9F6F1' }}>

      {/* Blurred preview */}
      <div className="px-4 pt-4 pb-3">
        <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#9C8E84', letterSpacing: '0.08em' }}>
          Stacky was about to say…
        </div>
        <div className="rounded-xl overflow-hidden relative" style={{ border: '1px solid #E8E0D5' }}>
          <div className="p-3 text-sm leading-relaxed" style={{ filter: 'blur(5px)', userSelect: 'none', color: '#3D2E22', background: '#FDFCFA' }}>
            {blurredPreview}
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl" style={{ background: 'linear-gradient(to bottom, rgba(249,246,241,0.3), rgba(249,246,241,0.96))' }}>
            <span style={{ fontSize: 20 }}>🔒</span>
            <div className="text-xs font-semibold mt-1" style={{ color: '#1C3A2E' }}>Unlock to read the full answer</div>
          </div>
        </div>
      </div>

      {/* The reframe */}
      <div className="px-4 pb-4">
        <div className="text-center mb-3">
          <div className="font-serif font-light" style={{ fontSize: 18, color: '#1C3A2E', lineHeight: 1.3 }}>
            Smarter supplement decisions, ongoing.
            <br />
            <span style={{ color: '#4A7C59' }}>$19/month. Built around your goals.</span>
          </div>
        </div>

        {/* Cost table */}
        <div className="rounded-xl overflow-hidden mb-3" style={{ border: '1px solid #E8E0D5' }}>
          {[
            { label: 'Hours of research + trial and error', cost: 'Your time', per: '+ wasted spending', strike: true },
            { label: 'PT supplement advice', cost: '$80+', per: 'per session', strike: true },
            { label: 'StackWise Pro: personalized plan + ongoing guidance', cost: '$19', per: '/month', highlight: true },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between px-3 py-2" style={{ background: row.highlight ? '#F0F5F2' : '#FDFCFA', borderBottom: '1px solid #F0EBE3' }}>
              <span className="text-xs font-medium" style={{ color: row.highlight ? '#1C3A2E' : '#9C8E84' }}>{row.label}</span>
              <div className="text-right">
                <div className="text-xs font-bold" style={{ color: row.highlight ? '#1C3A2E' : '#C4B9AC', textDecoration: row.strike ? 'line-through' : 'none' }}>{row.cost}</div>
                <div className="text-[10px]" style={{ color: '#C4B9AC' }}>{row.per}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Pro features */}
        <div className="rounded-xl p-3 mb-3" style={{ background: '#1C3A2E' }}>
          <div className="text-xs font-semibold mb-2 text-on-dark-muted" style={{ letterSpacing: '0.06em', textTransform: 'uppercase' }}>Pro unlocks</div>
          {[
            '💬 Unlimited guidance. Ask anything about your plan, anytime',
            '📋 Understand every recommendation and why it\'s in your stack',
            '🔄 Rebuild your plan as your goals change',
            '🔍 Evaluate new supplements before you buy them',
            '📈 Guidance on timing, cycling, and adjustments',
            '🩺 Flag potential conflicts. Know when to check with a pro',
          ].map((f) => (
            <div key={f} className="text-xs leading-snug mb-1.5 text-on-dark-muted">{f}</div>
          ))}
        </div>

        {/* Guarantee */}
        <div className="rounded-xl px-3 py-2.5 mb-3 flex items-start gap-2" style={{ background: '#F0F5F2', border: '1px solid #D4E8DA' }}>
          <span style={{ color: '#4A7C59', fontSize: 13, flexShrink: 0 }}>🛡</span>
          <p className="text-xs leading-relaxed" style={{ color: '#4A7C59' }}>
            <strong>7-day fit guarantee.</strong> Doesn&apos;t click? Full refund within 7 days. No hoops.
          </p>
        </div>

        <Link to="/pricing" className="block w-full text-center rounded-full font-semibold text-sm py-3 transition-all" style={{ background: '#1C3A2E', color: '#F9F6F1' }}>
          Start Pro ($19/month) →
        </Link>

        <p className="text-center text-xs mt-2 mb-1" style={{ color: '#C4B9AC' }}>Cancel anytime · No contracts</p>

        <button type="button" onClick={onClose} className="w-full text-center text-xs py-1.5 transition-all" style={{ color: '#C4B9AC' }}>
          Not right now
        </button>
      </div>
    </div>
  );
}

function StackyBubbleAvatar({ mood, size }: { mood: StackyMood; size: number }) {
  return (
    <div
      className="rounded-full overflow-hidden bg-cream flex items-center justify-center shrink-0 border border-cream-dark/50"
      style={{ width: size, height: size }}
    >
      <StackyCat mood={mood} size={size} />
    </div>
  );
}

export default function ChatWidget({
  stackContext,
  onStackUpdated,
  defaultExpanded = false,
  openSignal = 0,
}: ChatWidgetProps) {
  const isLandingCoach = stackContext.startsWith('[STACKY_LANDING]');
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [creditsLeft, setCreditsLeft] = useState<number>(() => getChatCredits());
  const [showUpgrade, setShowUpgrade] = useState<boolean>(() => {
    if (isPro()) return false;
    return getChatCredits() === 0;
  });
  const [showMidNudge, setShowMidNudge] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const expandedRef = useRef(isExpanded);
  expandedRef.current = isExpanded;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isLoading, showUpgrade, isExpanded]);

  useEffect(() => {
    if (!isExpanded) return;
    const t = window.setTimeout(() => textareaRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [isExpanded]);

  useEffect(() => {
    if (!isExpanded) return;
    trackEvent('chat_opened', {
      surface: isLandingCoach ? 'landing' : 'stack',
      pro: isPro(),
    });
  }, [isExpanded, isLandingCoach]);

  const prevOpenSignal = useRef(0);
  useEffect(() => {
    if (openSignal > prevOpenSignal.current) {
      prevOpenSignal.current = openSignal;
      setIsExpanded(true);
    }
  }, [openSignal]);

  useEffect(() => {
    if (!isExpanded) return;
    const c = getChatCredits();
    setCreditsLeft(c);
    setShowUpgrade(c === 0 && !isPro());
    setMessages((prev) => {
      if (prev.length > 0) return prev;
      if (isLandingCoach) {
        if (isPro()) return [{ role: 'model', text: LANDING_PRO_GREETING, isGreeting: true }];
        if (c > 0) return [{ role: 'model', text: buildLandingGreeting(c), isGreeting: true }];
        return prev;
      }
      if (isPro()) return [{ role: 'model', text: PRO_GREETING, isGreeting: true }];
      if (c > 0) return [{ role: 'model', text: buildGreeting(c), isGreeting: true }];
      return prev;
    });
  }, [isExpanded, isLandingCoach, stackContext]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsExpanded((v) => !v);
      }
      if (e.key === 'Escape' && expandedRef.current) {
        e.preventDefault();
        setIsExpanded(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta || !isExpanded) return;
    ta.style.height = 'auto';
    const next = Math.min(ta.scrollHeight, 112);
    ta.style.height = `${Math.max(44, next)}px`;
  }, [input, isExpanded]);

  function applySupplementToCurrentStack(supplement: Supplement): boolean {
    const { result } = loadStoredState();
    if (!result) return false;

    const alreadyExists = result.supplements.some(
      (s) => s.name.trim().toLowerCase() === supplement.name.trim().toLowerCase(),
    );
    if (alreadyExists) return false;

    const targets = resolveScheduleTargets(supplement.timing, supplement.dosage);
    const morning = result.dailySchedule.morning.includes(supplement.name)
      ? result.dailySchedule.morning
      : targets.includes('morning')
        ? [...result.dailySchedule.morning, supplement.name]
        : result.dailySchedule.morning;
    const afternoon = result.dailySchedule.afternoon.includes(supplement.name)
      ? result.dailySchedule.afternoon
      : targets.includes('afternoon')
        ? [...result.dailySchedule.afternoon, supplement.name]
        : result.dailySchedule.afternoon;
    const evening = result.dailySchedule.evening.includes(supplement.name)
      ? result.dailySchedule.evening
      : targets.includes('evening')
        ? [...result.dailySchedule.evening, supplement.name]
        : result.dailySchedule.evening;

    const nextResult = {
      ...result,
      supplements: [...result.supplements, supplement],
      dailySchedule: { morning, afternoon, evening },
      totalMonthlyCostLow: result.totalMonthlyCostLow + supplement.estimatedMonthlyCostLow,
      totalMonthlyCostHigh: result.totalMonthlyCostHigh + supplement.estimatedMonthlyCostHigh,
    };
    saveResult(nextResult);
    onStackUpdated?.();
    return true;
  }

  async function sendMessage() {
    const trimmed = sanitizeChatInput(input).trim();
    if (!trimmed || isLoading || showUpgrade) return;
    if (!isPro() && creditsLeft <= 0) return;

    const historyForApi = messages.filter((m) => !m.isGreeting);

    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setInput('');
    setIsLoading(true);
    setShowMidNudge(false);

    try {
      await ensureApiSession();
      const res = await fetch(apiUrl('/api/chat'), {
        method: 'POST',
        headers: await apiAuthHeaders(),
        body: JSON.stringify({
          message: trimmed,
          history: historyForApi,
          stackContext: `${stackContext}\nSubscription tier: ${isPro() ? 'pro' : 'free/basic'}`,
        }),
      });

      const data = (await res.json()) as { reply?: string; error?: string; message?: string };
      const replyText = data.reply;

      if (res.status === 403 && data.error === 'FREE_CHAT_LIMIT_REACHED') {
        setChatCreditsRemaining(0);
        setCreditsLeft(0);
        setShowUpgrade(true);
        setMessages((prev) => [
          ...prev,
          {
            role: 'model',
            text:
              data.message ??
              'Free accounts include 3 questions. Upgrade to Pro for unlimited guidance.',
          },
        ]);
        return;
      }

      if (!res.ok || typeof replyText !== 'string') {
        setMessages((prev) => [...prev, { role: 'model', text: 'I could not connect just now. Please try again in a second.' }]);
        return;
      }

      const { cleanReply, supplement } = extractAddSupplementAction(replyText);
      const baseReply = cleanReply || replyText;
      const wasAdded = supplement ? applySupplementToCurrentStack(supplement) : false;
      const finalReply = wasAdded
        ? `${baseReply}\n\nAdded "${supplement?.name}" to your current stack.`
        : baseReply;

      if (isPro()) {
        setMessages((prev) => [...prev, { role: 'model', text: finalReply }]);
      } else {
        const remaining = decrementChatCredit();
        setCreditsLeft(remaining);
        setMessages((prev) => [...prev, { role: 'model', text: finalReply, remainingCreditsAfter: remaining }]);

        if (remaining === 1) {
          setTimeout(() => setShowMidNudge(true), 800);
        }

        if (remaining === 0 && !isPro()) {
          setTimeout(() => setShowUpgrade(true), 1800);
        }
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'model', text: 'I could not connect just now. Please try again in a second.' }]);
    } finally {
      setIsLoading(false);
    }
  }

  function askQuickPrompt(prompt: string) {
    if (isLoading || showUpgrade) return;
    setInput(sanitizeChatInput(prompt));
    window.setTimeout(() => {
      textareaRef.current?.focus();
    }, 20);
  }

  const collapsedLabel = isPro()
    ? 'Ask Stacky about your stack… 🐾'
    : creditsLeft === 0
      ? 'Unlock StackWise Pro · ongoing clarity from Stacky'
      : creditsLeft === 1
        ? '1 free question left. Ask Stacky'
        : `Ask Stacky - ${creditsLeft} free questions`;

  return (
    <>
      {isExpanded && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[2px]"
          aria-label="Dismiss coach"
          onClick={() => setIsExpanded(false)}
        />
      )}

      <div
        className="fixed left-0 right-0 bottom-0 z-50 px-3 pointer-events-none"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))' }}
      >
        <div className="max-w-3xl mx-auto w-full pointer-events-auto flex flex-col gap-2">
          {isExpanded && (
            <div className="rounded-2xl border border-stone bg-white shadow-[0_-4px_40px_rgba(61,46,34,0.16)] flex flex-col overflow-hidden min-h-[200px]"
              style={{ maxHeight: 'min(58dvh, 520px)' }}>
              <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-cream-dark/60 shrink-0"
                style={{ background: 'linear-gradient(to right, #1C3A2E, #2D5242)' }}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative flex h-8 w-8 items-center justify-center shrink-0">
                    {isLoading ? (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cream border border-cream-dark/60 text-forest text-xs font-bold">
                        …
                      </div>
                    ) : (
                      <>
                        <StackyBubbleAvatar
                          mood={
                            messages.length === 0
                              ? 'wave'
                              : messages[messages.length - 1]?.role === 'model'
                                ? 'happy'
                                : 'think'
                          }
                          size={30}
                        />
                        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-moss-light text-[8px] leading-none flex items-center justify-center text-forest border border-forest/40">
                          {messages.length === 0 ? '🥼' : messages[messages.length - 1]?.role === 'model' ? '💬' : '✍'}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="min-w-0 flex items-center gap-2">
                    <div>
                      <div className="text-sm font-bold text-on-dark-primary truncate">Stacky</div>
                      <div className="text-[10px] text-on-dark-muted truncate">
                        {isPro()
                          ? 'StackWise · Unlimited guidance'
                          : `StackWise · ${creditsLeft} free question${creditsLeft !== 1 ? 's' : ''} remaining`}
                      </div>
                    </div>
                    {isPro() && (
                      <div className="hidden xs:inline-flex items-center rounded-full bg-moss-light text-forest text-[9px] font-black px-2 py-0.5 border border-sage/40">
                        PRO
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  { !isPro() && creditsLeft > 0 ? (
                    <span className="rounded-md bg-cream/30 text-cream-dark px-2 py-0.5 text-[10px] font-bold tabular-nums border border-cream-dark/60">
                      {creditsLeft} left
                    </span>
                  ) : (
                    !isPro() && (
                      <Link to="/pricing" className="rounded-md bg-cream text-forest px-2 py-0.5 text-[10px] font-bold hover:bg-cream-dark transition">
                      Upgrade →
                      </Link>
                    )
                  )}
                  <button
                    type="button"
                    onClick={() => setIsExpanded(false)}
                    className="rounded-lg p-1.5 text-on-dark-muted hover:text-on-dark-primary hover:bg-white/10 transition"
                    aria-label="Minimize coach"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="relative flex-1 min-h-0 flex flex-col bg-cream">
                <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-4 text-sm">
                  {messages.map((m, i) => (
                    <div key={`${i}-${m.text.slice(0, 24)}`}>
                      {m.role === 'user' ? (
                        <div className="flex justify-end">
                          <div
                            className="max-w-[88%] rounded-2xl rounded-br-sm px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap stackwise-weight-bubble stackwise-buoyant"
                            style={{
                              background: 'linear-gradient(135deg, #1C3A2E, #2D5242)',
                              color: '#F9F6F1',
                              animationDelay: `${(i % 3) * 180}ms`,
                            }}
                          >
                            {m.text}
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-start gap-2">
                          <div className="relative shrink-0 mt-0.5 rounded-full border border-[#4A7C59] overflow-hidden bg-cream" style={{ width: 26, height: 26 }}>
                            <StackyCat mood="happy" size={26} />
                          </div>
                          <div
                            className="max-w-[88%] rounded-2xl rounded-bl-sm px-3 py-2.5 text-warm leading-relaxed text-sm whitespace-pre-wrap border stackwise-weight-bubble stackwise-buoyant"
                            style={{ background: '#FDFCFA', borderColor: '#E8E0D5', animationDelay: `${(i % 3) * 160}ms` }}
                          >
                            {m.text}
                          </div>
                        </div>
                      )}
                      {m.role === 'model' && !m.isGreeting && !isPro() &&
                        m.remainingCreditsAfter !== undefined && m.remainingCreditsAfter > 0 && (
                          <div className="text-[10px] text-warm-light mt-1 ml-8">
                            {m.remainingCreditsAfter} free {m.remainingCreditsAfter === 1 ? 'question' : 'questions'} remaining
                          </div>
                        )}
                    </div>
                  ))}
                  {!isLoading && messages.length <= 1 && !showUpgrade && (
                    <div className="pt-1">
                      <div className="text-[10px] uppercase tracking-widest text-warm-light mb-2 px-1">
                        Quick prompts
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {QUICK_PROMPTS.map((prompt) => (
                          <button
                            key={prompt}
                            type="button"
                            onClick={() => askQuickPrompt(prompt)}
                            className="rounded-full border px-3 py-1.5 text-[11px] text-warm-mid bg-white hover:border-forest/40 hover:text-forest transition stackwise-weight-bubble stackwise-buoyant"
                            style={{ borderColor: '#E8E0D5' }}
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {isLoading && (
                    <div className="flex gap-2 items-center ml-8">
                      <div className="flex gap-1 py-2">
                        {[0, 120, 240].map((d) => (
                          <span key={d} className="w-1.5 h-1.5 rounded-full bg-stone-dark/50 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {showUpgrade && (
                  <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                )}
              </div>

              {showMidNudge && !showUpgrade && !isPro() && (
                <MidSessionNudge onDismiss={() => setShowMidNudge(false)} />
              )}

              {showUpgrade ? (
                <UpgradeWall onClose={() => setIsExpanded(false)} />
              ) : (
                <div className="border-t border-cream-dark/70 p-2 bg-white shrink-0">
                  <div className="flex items-end gap-2 rounded-xl border border-cream-dark bg-cream/70 focus-within:border-forest/40 focus-within:ring-1 focus-within:ring-forest/15 px-2 py-1.5">
                    <textarea
                      ref={textareaRef}
                      value={input}
                      maxLength={CHAT_INPUT_MAX_CHARS}
                      onChange={(e) => setInput(sanitizeChatInput(e.target.value))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          void sendMessage();
                        }
                      }}
                      placeholder={
                        creditsLeft === 1
                          ? 'What feels most urgent right now?'
                          : 'Tell me what you want help with...'
                      }
                      disabled={isLoading}
                      rows={1}
                      className="flex-1 min-h-[44px] max-h-28 resize-none bg-transparent px-2 py-2 text-sm text-warm placeholder:text-warm-light focus:outline-none disabled:opacity-50 overflow-y-auto"
                    />
                    <button
                      type="button"
                      onClick={() => void sendMessage()}
                      disabled={isLoading || !input.trim() || (!isPro() && creditsLeft <= 0)}
                      className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-forest disabled:opacity-35 hover:bg-forest/90 transition"
                      style={{ color: '#F9F6F1' }}
                      aria-label="Send"
                    >
                      {isLoading ? (
                        <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between px-1 text-[10px] text-warm-light">
                    <span>
                      <kbd className="rounded border border-cream-dark bg-cream px-1 font-mono">Enter</kbd> send · max{' '}
                      {CHAT_INPUT_MAX_CHARS} chars
                    </span>
                    <span className="tabular-nums font-medium text-warm-mid">
                      {input.length}/{CHAT_INPUT_MAX_CHARS}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-end px-1 text-[10px] text-warm-light hidden sm:flex">
                    <span>
                      <kbd className="rounded border border-cream-dark bg-cream px-1 font-mono">Ctrl+K</kbd> toggle
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {!isExpanded && (
            <div className="relative w-full">
              <button
                type="button"
                onClick={() => setIsExpanded(true)}
                style={{ minHeight: 56 }}
                className={[
                  'w-full rounded-2xl border px-4 flex items-center gap-3 text-left transition-all active:scale-[0.99]',
                  creditsLeft === 0 && !isPro()
                    ? 'border-amber-200 bg-amber-50/90 shadow-[0_8px_30px_rgba(251,191,36,0.15)] hover:border-amber-300'
                    : 'border-cream-dark bg-white/95 backdrop-blur-md shadow-[0_8px_30px_rgba(61,46,34,0.14)] hover:border-forest/25 hover:shadow-lg',
                ].join(' ')}
              >
                <span
                  className={[
                    'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full overflow-hidden border animate-stackwise-idle',
                    isPro() ? 'bg-cream border-sage/40' : creditsLeft === 0 ? 'bg-amber-400 border-amber-500' : 'bg-cream border-forest/30',
                  ].join(' ')}
                >
                  {creditsLeft === 0 && !isPro() ? (
                    <span className="text-lg" aria-hidden>
                      🔒
                    </span>
                  ) : (
                    <StackyCat mood="wave" size={34} />
                  )}
                  {creditsLeft > 0 && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-moss-light text-[8px] leading-none flex items-center justify-center text-forest border border-forest/40 animate-stackwise-idle-glow">
                      💬
                    </span>
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <div className={[
                    'text-sm font-semibold truncate',
                    creditsLeft === 0 && !isPro() ? 'text-amber-800' : 'text-warm',
                  ].join(' ')}>
                    {collapsedLabel}
                  </div>
                  {!isPro() && creditsLeft === 0 && (
                    <div className="text-[10px] text-amber-600 mt-0.5">7-day fit guarantee · Cancel anytime</div>
                  )}
                  {!isPro() && creditsLeft > 0 && (
                    <div className="text-[10px] text-warm-light mt-0.5">Knows your full stack · Answers in seconds</div>
                  )}
                  {isPro() && (
                    <div className="text-[10px] text-warm-light mt-0.5">Unlimited · Knows your full stack</div>
                  )}
                </div>
                <svg className="w-4 h-4 text-warm-light transition shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>

              {isPro() ? (
                <div className="absolute -top-2 -right-1 bg-moss-light text-forest text-[9px] font-black rounded-full px-2 py-0.5 shadow-sm pointer-events-none">
                  PRO
                </div>
              ) : creditsLeft > 0 ? (
                <div className="absolute -top-2 -right-1 bg-moss-light text-forest text-[9px] font-black rounded-full px-2 py-0.5 shadow-sm tabular-nums pointer-events-none">
                  {creditsLeft} FREE
                </div>
              ) : (
                <div className="absolute -top-2 -right-1 bg-amber-400 text-white text-[9px] font-black rounded-full px-2 py-0.5 shadow-sm whitespace-nowrap pointer-events-none">
                  UPGRADE
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
