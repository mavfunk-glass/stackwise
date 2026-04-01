import type { IntakePayload, GeminiResult } from './stackwise';
import type { CheckIn, AccountabilityState } from './stackwise';

export const STORAGE_KEYS = {
  quiz: 'stackwise_quiz_v1',
  result: 'stackwise_result_v1',
  profile: 'stackwise_profile_v1',
  stackArchive: 'stackwise_stack_archive_v1',
} as const;

const MAX_ARCHIVED_STACKS = 15;

export type StoredState = {
  quiz: IntakePayload | null;
  result: GeminiResult | null;
};

export type StackProfile = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  quiz: IntakePayload | null;
  result: GeminiResult;
};

/** Prior stacks saved on-device when Basic/Pro users generate a new plan (FIFO cap). */
export type StackArchiveEntry = {
  id: string;
  savedAt: string;
  label: string;
  quiz: IntakePayload | null;
  result: GeminiResult;
};

export function loadStackArchive(): StackArchiveEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.stackArchive);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StackArchiveEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Called when replacing the active stack after a successful new /api/analyze. */
export function pushStackArchiveEntry(entry: Omit<StackArchiveEntry, 'id'>): void {
  const id = `arch_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const next = [{ ...entry, id }, ...loadStackArchive()].slice(0, MAX_ARCHIVED_STACKS);
  localStorage.setItem(STORAGE_KEYS.stackArchive, JSON.stringify(next));
}

function saveStackArchive(entries: StackArchiveEntry[]): void {
  localStorage.setItem(STORAGE_KEYS.stackArchive, JSON.stringify(entries.slice(0, MAX_ARCHIVED_STACKS)));
}

export function renameStackArchiveEntry(entryId: string, nextLabel: string): boolean {
  const trimmed = nextLabel.trim();
  if (!trimmed) return false;
  const rows = loadStackArchive();
  const idx = rows.findIndex((r) => r.id === entryId);
  if (idx < 0) return false;
  rows[idx] = { ...rows[idx], label: trimmed };
  saveStackArchive(rows);
  return true;
}

export function moveStackArchiveEntry(entryId: string, direction: -1 | 1): boolean {
  const rows = loadStackArchive();
  const idx = rows.findIndex((r) => r.id === entryId);
  if (idx < 0) return false;
  const nextIdx = idx + direction;
  if (nextIdx < 0 || nextIdx >= rows.length) return false;
  const copy = [...rows];
  const [picked] = copy.splice(idx, 1);
  copy.splice(nextIdx, 0, picked);
  saveStackArchive(copy);
  return true;
}

export function loadStoredState(): StoredState {
  const quizRaw = localStorage.getItem(STORAGE_KEYS.quiz);
  const resultRaw = localStorage.getItem(STORAGE_KEYS.result);

  return {
    quiz: quizRaw ? (JSON.parse(quizRaw) as IntakePayload) : null,
    result: resultRaw ? (JSON.parse(resultRaw) as GeminiResult) : null,
  };
}

export function saveQuiz(quiz: IntakePayload) {
  localStorage.setItem(STORAGE_KEYS.quiz, JSON.stringify(quiz));
}

export function saveResult(result: GeminiResult) {
  localStorage.setItem(STORAGE_KEYS.result, JSON.stringify(result));
}

export function clearResult() {
  localStorage.removeItem(STORAGE_KEYS.result);
}

export function loadStackProfile(): StackProfile | null {
  const raw = localStorage.getItem(STORAGE_KEYS.profile);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StackProfile;
  } catch {
    return null;
  }
}

export function saveCurrentStackAsProfile(name = 'My Stack Profile'): StackProfile | null {
  const { quiz, result } = loadStoredState();
  if (!result) return null;
  const current = loadStackProfile();
  const now = new Date().toISOString();
  const profile: StackProfile = {
    id: current?.id ?? `profile_${Date.now()}`,
    name,
    createdAt: current?.createdAt ?? now,
    updatedAt: now,
    quiz,
    result,
  };
  localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile));
  return profile;
}

/** Renames the current stack profile. If no profile exists but a current stack exists, creates one first. */
export function renameCurrentStackProfile(name: string): StackProfile | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const existing = loadStackProfile();
  if (existing) {
    const updated: StackProfile = {
      ...existing,
      name: trimmed,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(updated));
    return updated;
  }
  return saveCurrentStackAsProfile(trimmed);
}

export function applyProfileToCurrentStack(profile: StackProfile): void {
  if (profile.quiz) saveQuiz(profile.quiz);
  saveResult(profile.result);
}

/** True when there is a stack to open (active result or a saved Stack Hub profile with supplements). */
export function hasSavedStackAvailable(): boolean {
  const { result } = loadStoredState();
  if (result?.supplements?.length) return true;
  const p = loadStackProfile();
  return !!(p?.result?.supplements?.length);
}

/**
 * If the active slot has no stack but a profile backup exists, restore it.
 * Call before navigating to Stack Hub so returning users keep their plan.
 */
export function ensureCurrentStackFromProfile(): boolean {
  const { result } = loadStoredState();
  if (result?.supplements?.length) return true;
  const p = loadStackProfile();
  if (p?.result?.supplements?.length) {
    applyProfileToCurrentStack(p);
    return true;
  }
  return false;
}

const CHAT_CREDITS_KEY = 'stackwise_chat_credits';
const CHAT_CREDITS_TOTAL = 3;

export function getChatCredits(): number {
  const stored = localStorage.getItem(CHAT_CREDITS_KEY);
  if (stored === null) return CHAT_CREDITS_TOTAL;
  const parsed = parseInt(stored, 10);
  return isNaN(parsed) ? CHAT_CREDITS_TOTAL : Math.max(0, parsed);
}

export function decrementChatCredit(): number {
  const current = getChatCredits();
  const next = Math.max(0, current - 1);
  localStorage.setItem(CHAT_CREDITS_KEY, String(next));
  return next;
}

/** Sync client credits to match server enforcement (e.g. after FREE_CHAT_LIMIT_REACHED). */
export function setChatCreditsRemaining(n: number): void {
  localStorage.setItem(CHAT_CREDITS_KEY, String(Math.max(0, n)));
}

export function resetChatCredits(): void {
  localStorage.removeItem(CHAT_CREDITS_KEY);
}

const SUBSCRIPTION_KEY = 'stackwise_subscription';
/** Set when user completes a paid checkout (Basic or Pro); survives for returning-user messaging if subscription row is cleared). */
const EVER_PAID_KEY = 'stackwise_ever_paid_v1';

export type SubscriptionTier = 'free' | 'basic' | 'pro';

export interface SubscriptionRecord {
  tier: Exclude<SubscriptionTier, 'free'>;
  subscriptionId: string;
  activatedAt: string;
}

function parseSubscriptionRecord(raw: string | null): SubscriptionRecord | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SubscriptionRecord;
    if (parsed.tier !== 'basic' && parsed.tier !== 'pro') return null;
    if (typeof parsed.subscriptionId !== 'string' || !parsed.subscriptionId.trim()) return null;
    if (typeof parsed.activatedAt !== 'string' || !parsed.activatedAt.trim()) return null;
    return {
      tier: parsed.tier,
      subscriptionId: parsed.subscriptionId.trim(),
      activatedAt: parsed.activatedAt.trim(),
    };
  } catch {
    return null;
  }
}

export function getSubscription(): SubscriptionRecord | null {
  return parseSubscriptionRecord(localStorage.getItem(SUBSCRIPTION_KEY));
}

/**
 * Persists paid plan after PayPal (or manual unlock). Resets chat credits when the plan or subscription id changes.
 * Sets ever-paid flag so returning-user state can be inferred even if the subscription object is later cleared.
 */
export function saveSubscription(record: SubscriptionRecord): void {
  const normalized: SubscriptionRecord = {
    tier: record.tier === 'pro' ? 'pro' : 'basic',
    subscriptionId: String(record.subscriptionId ?? '').trim(),
    activatedAt: record.activatedAt?.trim() || new Date().toISOString(),
  };
  if (!normalized.subscriptionId) return;

  const prev = getSubscription();
  localStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(normalized));
  try {
    localStorage.setItem(EVER_PAID_KEY, '1');
  } catch {
    /* ignore */
  }

  const shouldResetCredits =
    !prev || prev.subscriptionId !== normalized.subscriptionId || prev.tier !== normalized.tier;
  if (shouldResetCredits) {
    resetChatCredits();
  }
}

/** True if this device has ever completed a paid StackWise checkout (Basic or Pro). */
export function hasEverPurchasedPlan(): boolean {
  try {
    if (localStorage.getItem(EVER_PAID_KEY) === '1') return true;
  } catch {
    /* ignore */
  }
  return getSubscription() != null;
}

export function getSubscriptionTier(): SubscriptionTier {
  if (import.meta.env.DEV && import.meta.env.VITE_DEV_PRO === 'true') {
    return 'pro';
  }
  const sub = getSubscription();
  if (!sub) return 'free';
  return sub.tier;
}

export function isPro(): boolean {
  return getSubscriptionTier() === 'pro';
}

const STACKY_COWBOY_HAT_KEY = 'stackwise_stacky_cowboy_hat';

/** Pro-only: user-enabled cowboy hat for Stacky across the app. */
export function getStackyCowboyHatEnabled(): boolean {
  if (!isPro()) return false;
  try {
    return localStorage.getItem(STACKY_COWBOY_HAT_KEY) === '1';
  } catch {
    return false;
  }
}

export function setStackyCowboyHatEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STACKY_COWBOY_HAT_KEY, enabled ? '1' : '0');
    window.dispatchEvent(new Event('stacky-cowboy-hat'));
  } catch {
    /* ignore */
  }
}

export function isBasicOrPro(): boolean {
  const tier = getSubscriptionTier();
  return tier === 'basic' || tier === 'pro';
}

/**
 * Free users who already have a stack must upgrade to run the quiz again and replace it.
 * First-time quiz (no saved stack) is always allowed.
 */
export function mustUpgradeToRebuildStack(): boolean {
  const { result } = loadStoredState();
  return !!(result?.supplements?.length) && !isBasicOrPro();
}

export function clearSubscription(): void {
  localStorage.removeItem(SUBSCRIPTION_KEY);
}

/** Clears client-side paid tier, ever-paid flag, Pro hat preference, and chat credits, like a fresh free visitor (UI only; restart API session separately if server had a paid sub). */
export function clearPaidClientState(): void {
  try {
    localStorage.removeItem(SUBSCRIPTION_KEY);
    localStorage.removeItem(EVER_PAID_KEY);
    localStorage.removeItem(STACKY_COWBOY_HAT_KEY);
  } catch {
    /* ignore */
  }
  resetChatCredits();
}

/**
 * Single place for “returning user” product logic (client-side). Server still enforces rebuild + paid for /analyze.
 * - hasActiveStack: current saved result with supplements
 * - hasRestorableStack: profile backup or current
 * - isPaidSubscriber: Basic or Pro currently stored
 */
export function getReturningUserSnapshot(): {
  hasActiveStack: boolean;
  hasRestorableStack: boolean;
  isPaidSubscriber: boolean;
  tier: SubscriptionTier;
  mustPayToRebuild: boolean;
  hasEverPaid: boolean;
} {
  const { result } = loadStoredState();
  const hasActiveStack = !!(result?.supplements?.length);
  const hasRestorableStack = hasSavedStackAvailable();
  const tier = getSubscriptionTier();
  const isPaidSubscriber = isBasicOrPro();
  return {
    hasActiveStack,
    hasRestorableStack,
    isPaidSubscriber,
    tier,
    mustPayToRebuild: hasActiveStack && !isPaidSubscriber,
    hasEverPaid: hasEverPurchasedPlan(),
  };
}

const CHECKIN_KEY = 'stackwise_checkins_v1';
const REMINDER_KEY = 'stackwise_reminder_v1';

function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftLocalDate(isoDate: string, deltaDays: number): string {
  const [y, m, d] = isoDate.split('-').map((part) => parseInt(part, 10));
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + deltaDays);
  return toLocalIsoDate(dt);
}

export function getAccountabilityState(): AccountabilityState {
  const raw = localStorage.getItem(CHECKIN_KEY);
  const checkins: CheckIn[] = raw ? (JSON.parse(raw) as CheckIn[]) : [];

  const completedDates = Array.from(
    new Set(checkins.filter((c) => c.completed).map((c) => c.date)),
  ).sort();
  const completedSet = new Set(completedDates);

  // Current streak (today backwards)
  let currentStreak = 0;
  const today = toLocalIsoDate(new Date());
  let cursor = today;
  while (completedSet.has(cursor)) {
    currentStreak++;
    cursor = shiftLocalDate(cursor, -1);
  }

  // Longest streak (across stored period)
  let longestStreak = 0;
  let runningStreak = 0;
  for (let i = 0; i < completedDates.length; i++) {
    if (i === 0) {
      runningStreak = 1;
    } else if (completedDates[i] === shiftLocalDate(completedDates[i - 1], 1)) {
      runningStreak++;
    } else {
      runningStreak = 1;
    }
    longestStreak = Math.max(longestStreak, runningStreak);
  }

  return {
    checkins,
    currentStreak,
    longestStreak,
    totalCheckins: completedDates.length,
  };
}

export function recordCheckIn(mood?: 1 | 2 | 3 | 4 | 5, note?: string, dateOverride?: string): void {
  const raw = localStorage.getItem(CHECKIN_KEY);
  const checkins: CheckIn[] = raw ? (JSON.parse(raw) as CheckIn[]) : [];
  const today = dateOverride ?? toLocalIsoDate(new Date());
  const existing = checkins.findIndex((c) => c.date === today);
  const entry: CheckIn = { date: today, completed: true, mood, note };
  if (existing >= 0) {
    checkins[existing] = entry;
  } else {
    checkins.push(entry);
  }
  // Keep last 180 days
  const cutoffStr = shiftLocalDate(today, -180);
  const trimmed = checkins.filter((c) => c.date >= cutoffStr);
  localStorage.setItem(CHECKIN_KEY, JSON.stringify(trimmed));
}

export function getTodayCheckIn(): CheckIn | null {
  const raw = localStorage.getItem(CHECKIN_KEY);
  const checkins: CheckIn[] = raw ? (JSON.parse(raw) as CheckIn[]) : [];
  const today = toLocalIsoDate(new Date());
  return checkins.find((c) => c.date === today) ?? null;
}

export function getReminderTime(): string | null {
  return localStorage.getItem(REMINDER_KEY);
}

export function setReminderTime(time: string): void {
  localStorage.setItem(REMINDER_KEY, time);
}

export function clearReminderTime(): void {
  localStorage.removeItem(REMINDER_KEY);
}

const USER_NAME_KEY = 'stackwise_user_name';

export function getUserName(): string | null {
  return localStorage.getItem(USER_NAME_KEY);
}

export function setUserName(name: string): void {
  localStorage.setItem(USER_NAME_KEY, name.trim());
}

