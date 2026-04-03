import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { fetchAccountMe, requestMagicLink, saveStackToServer } from '../api/session';
import ChatWidget from '../components/ChatWidget';
import StackyCat from '../components/StackyCat';
import {
  ensureCurrentStackFromProfile,
  getAccountabilityState,
  getReminderTime,
  getSubscriptionTier,
  getTodayCheckIn,
  getUserName,
  isBasicOrPro,
  isPro,
  loadStackProfile,
  loadStoredState,
} from '../types/storage';
import {
  REBUILD_HEADLINE,
  REBUILD_PAID_REMINDER,
  REBUILD_SAVINGS_BODY,
  REBUILD_UPGRADE_CTA,
} from '../copy/rebuildStackUpsell';
import { NavIcon } from '../copy/navWayfinding';
import { buildChatStackContext } from '../utils/chatStackContext';
import { GOAL_THEME, resolvePrimaryGoalStrings, splitPrimaryGoal } from '../utils/goalTheme';
import { absorptionBadgesFromTiming } from '../utils/supplementAbsorption';
import {
  supplementAmazonHref,
  supplementAmazonSearchHref,
  supplementHasAmazonProductLink,
  supplementHasIHerbProductLink,
  supplementIHerbHref,
  supplementIHerbSearchHref,
} from '../utils/supplementRetailerUrls';
import { findSupplementForScheduleLine, isRhythmLineLockedForFreeTier } from '../utils/scheduleLineGating';
import type { GeminiResult, PrimaryGoal, Supplement } from '../types/stackwise';
import { useTheme } from '../theme/ThemeProvider';

const RESULTS_PHASE_KEY = 'stackwise_results_phase_v1';

function parseUsdAmount(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.round(v);
  if (typeof v === 'string') {
    const n = Number(v.trim());
    return Number.isFinite(n) ? Math.round(n) : null;
  }
  return null;
}

/** Handles string/undefined costs from older saved stacks or loose JSON. */
function formatPerSupplementMonthly(low: unknown, high: unknown): string {
  const lo = parseUsdAmount(low);
  const hi = parseUsdAmount(high);
  if (lo === null && hi === null) return 'Estimate unavailable';
  const a = Math.max(0, lo ?? hi ?? 0);
  const b = Math.max(a, hi ?? lo ?? a);
  return `~$${a}\u2013$${b}/mo`;
}

function formatStackTotalMonthly(low: unknown, high: unknown): string {
  const lo = parseUsdAmount(low);
  const hi = parseUsdAmount(high);
  if (lo === null && hi === null) return '\u2014';
  const a = Math.max(0, lo ?? hi ?? 0);
  const b = Math.max(a, hi ?? lo ?? a);
  return `$${a}\u2013$${b} / mo`;
}

function readPreferredName(): string {
  try {
    return localStorage.getItem('stackwise_preferred_name') ?? '';
  } catch {
    return '';
  }
}

/** First name for greetings: preferred name from Stack Hub, else quiz first name. */
function getDisplayFirstName(): string | null {
  const pref = readPreferredName().trim();
  if (pref) {
    const w = pref.split(/\s+/)[0];
    return w || null;
  }
  const u = getUserName()?.trim();
  if (u && !/^skip$/i.test(u)) {
    const w = u.split(/\s+/)[0];
    return w || null;
  }
  return null;
}

function getInitialResultsPhase(): 'plan90' | 'full' {
  try {
    return sessionStorage.getItem(RESULTS_PHASE_KEY) === 'full' ? 'full' : 'plan90';
  } catch {
    return 'plan90';
  }
}

function buildResultsStackContext(result: GeminiResult, quiz: ReturnType<typeof loadStoredState>['quiz']): string {
  return buildChatStackContext({
    surface: 'results',
    result,
    quiz: quiz ?? undefined,
    profile: loadStackProfile(),
    preferredName: readPreferredName(),
    accountability: getAccountabilityState(),
    todayCheckIn: getTodayCheckIn(),
    reminderTime: getReminderTime(),
  });
}

const RHYTHM_ICONS = {
  morning: String.fromCodePoint(0x2600, 0xfe0f),
  afternoon: String.fromCodePoint(0x26c5, 0xfe0f),
  evening: String.fromCodePoint(0x1f319),
} as const;

function GoalPill({ goal }: { goal: PrimaryGoal }) {
  const { resolved } = useTheme();
  const isDark = resolved === 'dark';
  const t = GOAL_THEME[goal];
  const { emoji, label } = splitPrimaryGoal(goal);
  if (!t) {
    return (
      <span className="inline-flex items-center rounded-full border border-stone bg-cream px-2.5 py-1 text-[11px] font-semibold text-ink dark:bg-surface dark:text-warm">
        {goal}
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold border"
      style={
        isDark
          ? { background: t.pillBgDark, borderColor: t.pillBorderDark, color: t.pillTextDark }
          : { background: t.pillBg, borderColor: t.pillBorder, color: t.text }
      }
    >
      <span className="mr-0.5" aria-hidden>
        {emoji}
      </span>
      {label}
    </span>
  );
}

/** Explains that the supplement was surfaced because of quiz goal selection; colors align with GOAL_THEME. */
function GoalMatchCallout({ goals }: { goals: PrimaryGoal[] }) {
  const { resolved } = useTheme();
  const isDark = resolved === 'dark';
  if (goals.length === 0) return null;
  const single = goals.length === 1;
  const t = single ? GOAL_THEME[goals[0]] : undefined;

  return (
    <div
      className={
        single && t
          ? 'rounded-xl px-3.5 py-3 mb-1'
          : 'rounded-xl px-3.5 py-3 mb-1 border border-emerald-800/25 bg-gradient-to-br from-emerald-50/90 to-white shadow-[inset_3px_0_0_rgba(28,58,46,0.35)] dark:from-surface-elevated dark:to-surface dark:border-emerald-500/35 dark:shadow-[inset_3px_0_0_rgba(104,226,168,0.55)]'
      }
      role="status"
      style={
        single && t
          ? isDark
            ? {
                background: t.pillBgDark,
                borderWidth: 1,
                borderStyle: 'solid',
                borderColor: t.pillBorderDark,
                boxShadow: `inset 3px 0 0 ${t.pillTextDark}`,
              }
            : {
                background: t.pillBg,
                borderWidth: 1,
                borderStyle: 'solid',
                borderColor: t.pillBorder,
                boxShadow: `inset 3px 0 0 ${t.text}`,
              }
          : undefined
      }
    >
      <p
        className="text-[10px] font-bold uppercase tracking-[0.14em] mb-1"
        style={single && t ? { color: isDark ? t.pillTextDark : t.text } : undefined}
      >
        {single ? (
          'Included for your selected goal'
        ) : (
          <span className="text-ink dark:text-warm">Included for your selected goals</span>
        )}
      </p>
      <p className="text-xs text-warm-mid leading-relaxed mb-2.5">
        Stacky showed this because it supports {single ? 'a goal you picked in the quiz' : 'goals you picked in the quiz'}, not a random add-on.
      </p>
      <div className="flex flex-wrap gap-1.5" aria-label="Goals this supplement supports">
        {goals.map((g) => (
          <GoalPill key={g} goal={g} />
        ))}
      </div>
    </div>
  );
}

function cleanTagline(t: string) {
  return t.replace(/^[\s\u2713\u2714\u2705\u2611]+/u, '').trim();
}

function ClarityHero({
  headline,
  diagnosis,
  solutionIntro,
  quiz,
  className = '',
}: {
  headline: string;
  diagnosis: string;
  solutionIntro: string;
  quiz: ReturnType<typeof loadStoredState>['quiz'];
  className?: string;
}) {
  const goals = (quiz?.primaryGoals ?? []) as PrimaryGoal[];
  const target = quiz?.specificGoal?.trim();

  return (
    <section
      className={`relative overflow-hidden rounded-[28px] p-[3px] shadow-[0_20px_50px_-12px_rgba(28,58,46,0.22)] dark:shadow-[0_24px_56px_-14px_rgba(0,0,0,0.55)] ${className}`.trim()}
      style={{
        background: 'linear-gradient(135deg, #1C3A2E 0%, #3d6b4f 45%, #b8956a 100%)',
      }}
    >
      <div className="sw-hero-panel relative rounded-[25px] px-5 py-7 sm:px-8 sm:py-8 overflow-hidden">
        <div className="pointer-events-none absolute -right-16 -top-24 h-52 w-52 rounded-full bg-emerald-200/35 blur-3xl dark:bg-emerald-400/15" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-44 w-44 rounded-full bg-amber-200/30 blur-3xl dark:bg-amber-400/10" />

        <div className="relative flex flex-col sm:flex-row gap-6 sm:gap-8 items-center sm:items-start">
          <div className="shrink-0 flex flex-col items-center">
            <div className="rounded-2xl shadow-lg border border-stone p-2 bg-surface-elevated">
              <StackyCat mood="wave" size={76} />
            </div>
            <span className="mt-2 text-[10px] font-bold uppercase tracking-widest text-moss">Stacky</span>
          </div>

          <div className="flex-1 min-w-0 text-center sm:text-left">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink/55 dark:text-warm-mid mb-1.5">
              Your plan
            </p>
            <h1 className="font-display text-xl sm:text-2xl text-ink leading-snug text-balance">{headline}</h1>

            {(goals.length > 0 || target) && (
              <div className="mt-4 flex flex-wrap justify-center sm:justify-start gap-1.5">
                {goals.map((g) => (
                  <GoalPill key={g} goal={g} />
                ))}
                {target && (
                  <span
                    className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold text-[#5A3E14] border-[1.5px] border-[#C4A574] bg-gradient-to-br from-[#FFFDF8] via-[#FFF3D6] to-[#FCE9BE] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.55),0_2px_10px_rgba(196,165,116,0.3)] dark:text-amber-100 dark:border-amber-600/60 dark:from-amber-950/80 dark:via-amber-900/50 dark:to-amber-950/80 dark:shadow-none"
                  >
                    Super Focus: {target}
                  </span>
                )}
              </div>
            )}

            <div className="mt-5 space-y-3 text-left">
              <p className="sw-inset-panel text-sm leading-relaxed rounded-2xl px-4 py-3.5 shadow-sm">
                {diagnosis}
              </p>
              <p className="sw-accent-panel text-sm font-semibold text-ink leading-relaxed rounded-2xl px-4 py-3.5">
                {solutionIntro}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SupplementCard({
  s,
  expanded,
  onToggle,
  quizGoals,
  locked = false,
}: {
  s: Supplement;
  expanded: boolean;
  onToggle: () => void;
  quizGoals: PrimaryGoal[];
  locked?: boolean;
}) {
  const badges = absorptionBadgesFromTiming(s.timing);
  const goalTags = resolvePrimaryGoalStrings(s.addressesGoals, quizGoals);
  const taglineDisplay = cleanTagline(s.tagline);
  const amazonPrimary = supplementAmazonHref(s);
  const amazonSearchOnly = supplementAmazonSearchHref(s);
  const amazonIsProduct = supplementHasAmazonProductLink(s);
  const iHerbPrimary = supplementIHerbHref(s);
  const iHerbSearchOnly = supplementIHerbSearchHref(s);
  const iHerbIsProduct = supplementHasIHerbProductLink(s);
  const whyItFitsLead =
    goalTags.length === 1
      ? `Why it fits your ${splitPrimaryGoal(goalTags[0]).label} goal: `
      : goalTags.length > 1
        ? 'Why it fits these goals: '
        : 'Why it fits: ';

  return (
    <div
      className="sw-stack-card rounded-2xl border border-stone overflow-hidden"
    >
      {locked ? (
        <div className="w-full px-4 py-4 sm:py-5 flex items-start gap-3">
          <span className="text-warm-light text-sm mt-1 w-5 shrink-0 font-mono" aria-hidden>
            ??
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-base text-ink">{s.name}</div>
            <div className="text-[11px] font-semibold text-warm-light mt-1 uppercase tracking-wide">
              Unlock dose, timing &amp; why it fits
            </div>
            <div className="text-xs text-warm-light mt-1 line-clamp-1 opacity-60 select-none" style={{ filter: 'blur(3px)' }}>
              {s.tagline}
            </div>
            {goalTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2 opacity-40" aria-hidden>
                {goalTags.map((g) => (
                  <GoalPill key={g} goal={g} />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onToggle}
          className="w-full px-4 py-4 sm:py-5 text-left flex items-start gap-3 border-b border-transparent hover:bg-cream-dark/70 dark:hover:bg-surface-elevated/55 transition-colors group"
          aria-expanded={expanded}
          aria-label={expanded ? `Collapse details for ${s.name}` : `Expand for full details: ${s.name}`}
        >
          <span
            className="text-moss text-sm mt-1 w-5 shrink-0 font-mono transition-transform group-hover:scale-110"
            aria-hidden
          >
            {expanded ? '\u25BC' : '\u25B6'}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="font-semibold text-base text-ink">{s.name}</div>
              {!expanded && (
                <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border border-stone/90 text-warm-mid bg-cream/40 dark:border-stone dark:text-warm-mid dark:bg-surface/60">
                  tap to expand ▾
                </span>
              )}
            </div>
            <div className="text-xs text-warm-mid mt-1">{taglineDisplay}</div>
            {goalTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2" aria-label="Goals this supports">
                {goalTags.map((g) => (
                  <GoalPill key={g} goal={g} />
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {badges.map((b) => (
                <span
                  key={b}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-moss-light/45 text-ink border border-sage/25"
                >
                  {b}
                </span>
              ))}
            </div>
            <div className="text-[11px] text-warm-light mt-2 line-clamp-2">{s.timing}</div>
          </div>
        </button>
      )}
      {!locked && expanded && (
        <div className="p-4 space-y-3 text-sm border-t border-stone">
          {goalTags.length > 0 && <GoalMatchCallout goals={goalTags} />}
          <p className="text-warm leading-relaxed">
            <span className="font-semibold text-ink">{whyItFitsLead}</span>
            {s.whyYouNeedThis}
          </p>
          <p className="text-warm-mid text-xs leading-relaxed">
            <span className="font-semibold text-warm">Key benefit: </span>
            {s.keyBenefit}
          </p>
          <p className="text-warm-mid text-xs leading-relaxed">
            <span className="font-semibold text-warm">What you might notice: </span>
            {s.whatYoullFeel}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl border border-stone bg-cream/50 px-3 py-2 dark:bg-surface-elevated/70 dark:border-stone">
              <div className="font-semibold text-ink mb-0.5">Dose</div>
              <div className="text-warm-mid">{s.dosage}</div>
            </div>
            <div className="rounded-xl border border-stone bg-cream/50 px-3 py-2 dark:bg-surface-elevated/70 dark:border-stone">
              <div className="font-semibold text-ink mb-0.5">Timing & absorption</div>
              <div className="text-warm-mid">{s.timing}</div>
              {badges.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {badges.map((b) => (
                    <span key={b} className="text-[10px] px-1.5 py-0.5 rounded bg-surface border border-stone text-ink">
                      {b}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-warm-light">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-flex items-center gap-0.5">
                {[1, 2, 3].map((i) => {
                  const filled =
                    i <= ({ Strong: 3, Moderate: 2, Emerging: 1 } as Record<string, number>)[s.evidenceStrength];
                  return (
                    <span
                      key={i}
                      className={filled ? 'text-moss' : 'text-stone/55 dark:text-warm-light/40'}
                      style={{ fontSize: 7 }}
                    >
                      ●
                    </span>
                  );
                })}
              </span>
              <span>{{ Strong: 'Well studied', Moderate: 'Supported', Emerging: 'Promising' }[s.evidenceStrength] ?? s.evidenceStrength}</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-cream-dark/40 text-warm-mid">~{s.timeToEffect}</span>
            <span className="px-2 py-0.5 rounded-full bg-cream-dark/40 text-warm-mid">
              {formatPerSupplementMonthly(s.estimatedMonthlyCostLow, s.estimatedMonthlyCostHigh)}
            </span>
          </div>
          <div className="mt-1 rounded-xl border border-stone bg-surface p-3 shadow-[0_1px_3px_rgba(28,58,46,0.06)] dark:shadow-[inset_0_1px_0_rgba(100,200,150,0.08)]">
            <div className="flex items-center justify-between mb-2.5">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-warm-mid">Shop</div>
              <div className="text-[9px] text-stone dark:text-warm-light">Affiliate links - we may earn a commission</div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <a
                href={amazonPrimary}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center rounded-xl min-h-[46px] px-4 py-2.5 text-sm font-bold bg-amazonOrange text-[#111] shadow-[0_2px_8px_rgba(0,0,0,0.12)] ring-1 ring-black/10 hover:shadow-[0_4px_14px_rgba(255,153,0,0.45)] hover:brightness-[1.02] active:scale-[0.99] transition-all"
              >
                {amazonIsProduct ? 'Buy on Amazon' : 'Search Amazon'}
              </a>
              <a
                href={iHerbPrimary}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center rounded-xl min-h-[46px] px-4 py-2.5 text-sm font-bold bg-iHerbGreen text-white shadow-[0_2px_8px_rgba(45,122,58,0.35)] ring-1 ring-white/15 hover:shadow-[0_4px_14px_rgba(45,122,58,0.45)] hover:brightness-[1.03] active:scale-[0.99] transition-all"
              >
                {iHerbIsProduct ? 'Buy on iHerb' : 'Search iHerb'}
              </a>
            </div>
            {(amazonIsProduct || iHerbIsProduct) && (
              <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 pt-2 border-t border-stone/50">
                {amazonIsProduct && (
                  <a
                    href={amazonSearchOnly}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-medium text-ink/90 underline underline-offset-2 decoration-forest/25 hover:text-ink hover:decoration-forest/50"
                  >
                    Search Amazon instead
                  </a>
                )}
                {iHerbIsProduct && (
                  <a
                    href={iHerbSearchOnly}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-medium text-ink/90 underline underline-offset-2 decoration-forest/25 hover:text-ink hover:decoration-forest/50"
                  >
                    Search iHerb instead
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResultsPage() {
  ensureCurrentStackFromProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const tier = getSubscriptionTier();
  const [phase, setPhase] = useState<'plan90' | 'full'>(getInitialResultsPhase);
  const [stackRefresh, setStackRefresh] = useState(0);
  const [chatOpenSignal, setChatOpenSignal] = useState(0);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(() => new Set());
  const [saveEmail, setSaveEmail] = useState('');
  const [saveName, setSaveName] = useState(getUserName() ?? '');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');
  const [accountEmail, setAccountEmail] = useState<string | null>(null);

  const { result, quiz } = useMemo(() => {
    void stackRefresh;
    return loadStoredState();
  }, [stackRefresh]);

  useEffect(() => {
    fetchAccountMe().then(({ user }) => {
      if (user?.email) setAccountEmail(user.email);
    });
  }, []);

  useEffect(() => {
    if (!result || !accountEmail) return;
    const quizJson = quiz ? JSON.stringify(quiz) : '';
    const resultJson = JSON.stringify(result);
    void saveStackToServer(quizJson, resultJson, 'My stack');
  }, [result, quiz, accountEmail]);

  async function handleSaveStack() {
    if (!saveEmail.trim() || !saveEmail.includes('@')) return;
    if (!result) return;
    setSaveStatus('sending');
    setSaveError('');
    const quizJson = quiz ? JSON.stringify(quiz) : '';
    const resultJson = JSON.stringify(result);
    await saveStackToServer(quizJson, resultJson, 'My stack');
    const res = await requestMagicLink(saveEmail.trim(), saveName.trim() || undefined);
    if (res.ok) {
      setSaveStatus('sent');
    } else {
      setSaveStatus('error');
      setSaveError(res.error ?? 'Something went wrong. Please try again.');
    }
  }

  const stackContext = result ? buildResultsStackContext(result, quiz) : '';

  const onStackUpdated = useCallback(() => setStackRefresh((n) => n + 1), []);

  const toggleCard = useCallback((cardId: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  }, []);

  const goToFullResults = useCallback(() => {
    try {
      sessionStorage.setItem(RESULTS_PHASE_KEY, 'full');
    } catch {
      /* ignore */
    }
    setPhase('full');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const showPlanAgain = useCallback(() => {
    try {
      sessionStorage.removeItem(RESULTS_PHASE_KEY);
    } catch {
      /* ignore */
    }
    setPhase('plan90');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  if (!result) {
    return (
      <div className="min-h-screen bg-sw-bg text-warm pb-12 font-body">
        <nav
          className="sticky top-0 z-40 px-5 border-b border-stone sw-sticky-nav"
          style={{
            paddingTop: 'max(14px, env(safe-area-inset-top, 14px))',
            paddingBottom: 14,
          }}
        >
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate('/landing')}
              className="inline-flex items-center gap-1.5 font-serif font-light tracking-widest text-sm text-ink"
              style={{ letterSpacing: '0.15em' }}
            >
              <NavIcon kind="home" size={17} className="opacity-90" />
              <span>STACKWISE</span>
            </button>
          </div>
        </nav>

        <div className="max-w-lg mx-auto px-5 pt-8">
          <div className="quiz-step-card p-8 text-center shadow-sm">
            <p className="text-warm-mid text-sm leading-relaxed">
              No stack is saved on this device yet. Take the quiz once and your personalized guide will show up here.
            </p>
            <button type="button" className="btn-primary mt-6 max-w-xs mx-auto" onClick={() => navigate('/quiz')}>
              <span className="inline-flex items-center justify-center gap-2">
                <NavIcon kind="rebuild" size={17} className="text-on-dark-primary opacity-95" />
                <span>Build my stack</span>
              </span>
            </button>
            <button
              type="button"
              className="mt-4 block w-full text-sm font-medium text-warm-light hover:text-ink transition-colors"
              onClick={() => navigate('/landing')}
            >
              <span className="inline-flex items-center justify-center gap-2">
                <NavIcon kind="home" size={17} className="opacity-90" />
                <span>Back to home</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { painPointHeadline, diagnosis, solutionIntro, supplements, superFocusSupplements = [], dailySchedule } = result;
  const firstName = getDisplayFirstName();
  const quizGoalList = (quiz?.primaryGoals ?? []) as PrimaryGoal[];
  const blurRhythmForLockedSupplements = !isBasicOrPro() && supplements.length > 2;

  return (
    <div className="min-h-screen bg-sw-bg text-warm pb-[calc(88px+env(safe-area-inset-bottom,0px))] font-body">
      <nav
        className="sticky top-0 z-40 px-5 border-b border-stone sw-sticky-nav"
        style={{
          paddingTop: 'max(14px, env(safe-area-inset-top, 14px))',
          paddingBottom: 14,
        }}
      >
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/landing')}
            className="inline-flex items-center gap-1.5 font-serif font-light tracking-widest text-sm text-ink shrink-0"
            style={{ letterSpacing: '0.15em' }}
          >
            <NavIcon kind="home" size={17} className="text-ink opacity-90" />
            <span>STACKWISE</span>
          </button>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
            {tier !== 'free' && (
              <span className="text-[10px] sm:text-xs font-semibold px-2 py-1 rounded-full bg-moss-light text-ink border border-sage/30">
                {tier.toUpperCase()}
              </span>
            )}
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-1 text-xs font-medium text-warm-mid hover:text-ink transition-colors"
            >
              <NavIcon kind="daily" size={15} className="opacity-90" />
              <span>Daily</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/coach')}
              className="inline-flex items-center gap-1 text-xs font-medium text-warm-mid hover:text-ink transition-colors"
            >
              <NavIcon kind="hub" size={15} className="opacity-90" />
              <span>Stack Hub</span>
            </button>
            {isBasicOrPro() && quiz && (
              <button
                type="button"
                onClick={() => navigate('/quiz', { state: { quickRebuild: true } })}
                className="inline-flex items-center gap-1 text-xs font-semibold text-ink hover:text-moss transition-colors whitespace-nowrap"
              >
                <NavIcon kind="rebuild" size={15} className="opacity-90" />
                <span>New stack</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {phase === 'plan90' ? (
        <div
          key={`plan90-${location.key}`}
          className="max-w-2xl mx-auto px-5 pt-8 pb-8 space-y-8"
        >
          <div className="stackwise-result-plan90-reveal flex flex-col items-center text-center gap-4">
            <StackyCat mood="celebrate" size={88} />
            <p className="quiz-label mb-0">Before your stack</p>
            <h1 className="quiz-headline text-balance max-w-lg">
              {firstName ? `${firstName}, your first 90 days` : 'Your first 90 days'}
            </h1>
            <p className="text-sm text-warm-mid max-w-md leading-relaxed">
              <span className="font-semibold text-ink">StackWise</span> is here to help guide you through the confusion around{' '}
              <span className="font-semibold text-ink">what to take</span>, how supplements fit your{' '}
              <span className="font-semibold text-ink">budget</span>, and how to avoid{' '}
              <span className="font-semibold text-ink">wasting money on poor fits</span>.{' '}
              {firstName ? `${firstName}, this` : 'This'} guide sits <span className="font-semibold text-ink">next to</span> sleep, movement, and how you eat, not instead of them.
            </p>
            <p className="text-xs text-warm-light max-w-md leading-relaxed">
              The timeline may use your first name if you shared one in the quiz. Retake anytime to refresh this outlook.
            </p>
          </div>

          <div
            className="stackwise-result-block-reveal rounded-2xl border border-stone bg-surface-elevated p-5 space-y-5 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)]"
            style={{ animationDelay: '200ms' }}
          >
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-moss mb-2">~30 days</div>
              <p className="text-sm text-warm-mid leading-relaxed whitespace-pre-line">{result.the30DayFeeling}</p>
            </div>
            <div className="border-t border-stone/70 pt-5">
              <div className="text-xs font-semibold uppercase tracking-widest text-moss mb-2">~60 days</div>
              <p className="text-sm text-warm-mid leading-relaxed whitespace-pre-line">{result.the60DayFeeling}</p>
            </div>
            <div className="border-t border-stone/70 pt-5">
              <div className="text-xs font-semibold uppercase tracking-widest text-moss mb-2">~90 days</div>
              <p className="text-sm text-warm-mid leading-relaxed whitespace-pre-line">{result.the90DayFeeling}</p>
            </div>
          </div>

          <button type="button" className="btn-results-next w-full" onClick={goToFullResults}>
            <span className="inline-flex items-center justify-center gap-2">
              <NavIcon kind="stack" size={20} className="text-ink opacity-90" />
              <span>See my full stack</span>
            </span>
            <span className="btn-results-next-sub">Dose, daily rhythm, timing, and shop links, next step</span>
          </button>
          <button type="button" className="btn-hub-cta w-full" onClick={() => navigate('/coach')}>
            <span className="inline-flex items-center justify-center gap-2">
              <NavIcon kind="hub" size={20} className="text-ink opacity-90" />
              <span>Open Stack Hub</span>
            </span>
            <span className="btn-hub-cta-sub">Your plan and supplements on one easy screen</span>
          </button>
          {isBasicOrPro() && quiz && (
            <button
              type="button"
              onClick={() => navigate('/quiz', { state: { quickRebuild: true } })}
              className="w-full min-h-[56px] rounded-2xl bg-forest text-on-dark-primary font-bold text-base hover:bg-forest-light transition-colors shadow-md"
            >
              <span className="inline-flex items-center justify-center gap-2">
                <NavIcon kind="rebuild" size={20} className="text-on-dark-primary opacity-95" />
                <span>Build a new stack, skip intro and edit goals</span>
              </span>
            </button>
          )}
        </div>
      ) : (
        <div
          key={`full-${location.key}`}
          className="max-w-2xl mx-auto px-5 pt-8 space-y-6"
        >
          <ClarityHero
            className="stackwise-result-hero-reveal"
            headline={painPointHeadline}
            diagnosis={diagnosis}
            solutionIntro={solutionIntro}
            quiz={quiz}
          />

          {saveStatus !== 'sent' && !accountEmail && (
            <div className="rounded-2xl p-5 bg-surface-elevated border border-stone shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-emerald-50 border border-emerald-200/90 dark:bg-emerald-950/50 dark:border-emerald-800/50">
                  <span className="text-base">??</span>
                </div>
                <div>
                  <div className="font-semibold text-sm text-ink">Save your stack, access it anywhere</div>
                  <div className="text-xs text-warm-light">
                    We&apos;ll email you a link. No password, no account form.
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="your@email.com"
                  value={saveEmail}
                  onChange={(e) => setSaveEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleSaveStack();
                  }}
                  className="flex-1 rounded-xl border border-stone bg-surface px-3 py-2.5 text-sm text-warm placeholder:text-warm-light focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest/30 font-body min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={() => void handleSaveStack()}
                  disabled={saveStatus === 'sending' || !saveEmail.includes('@')}
                  className={`rounded-xl font-semibold text-xs px-4 transition-all min-h-[44px] min-w-[80px] shrink-0 ${
                    saveEmail.includes('@')
                      ? 'bg-forest text-on-dark-primary hover:bg-forest-light'
                      : 'bg-stone dark:bg-surface text-warm-light dark:text-warm-mid'
                  } disabled:opacity-60`}
                >
                  {saveStatus === 'sending' ? 'Sending...' : 'Send link'}
                </button>
              </div>
              {saveStatus === 'error' && <p className="text-xs mt-2 text-red-600 dark:text-red-400">{saveError}</p>}
              <p className="text-xs mt-2 text-warm-light">
                One-click link, no password needed, your stack saved to your account
              </p>
            </div>
          )}

          {saveStatus === 'sent' && (
            <div className="rounded-2xl p-4 flex items-start gap-3 bg-emerald-50/90 border border-emerald-200/80 dark:bg-emerald-950/35 dark:border-emerald-800/50">
              <span className="text-xl">?</span>
              <div>
                <div className="font-semibold text-sm text-ink">Check your email</div>
                <p className="text-xs mt-0.5 leading-relaxed text-emerald-900 dark:text-emerald-100">
                  We sent a sign-in link to <strong>{saveEmail}</strong>. Click it to save your stack and access it from any
                  device. Link expires in 15 minutes.
                </p>
              </div>
            </div>
          )}

          {accountEmail && (
            <div className="rounded-2xl px-4 py-3 flex items-center gap-2 bg-emerald-50/90 border border-emerald-200/80 dark:bg-emerald-950/35 dark:border-emerald-800/50">
              <span className="text-sm">?</span>
              <p className="text-xs text-emerald-900 dark:text-emerald-100">
                Stack saved to <strong>{accountEmail}</strong>, accessible from any device.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={showPlanAgain}
            className="w-full text-center text-xs font-medium text-ink underline underline-offset-2 decoration-moss/50 hover:text-moss"
          >
            <span className="inline-flex items-center justify-center gap-1.5">
              <NavIcon kind="daily" size={14} className="text-ink opacity-90" />
              <span>Review your 90-day outlook</span>
            </span>
          </button>

          <div className="stackwise-result-block-reveal" style={{ animationDelay: '140ms' }}>
            <h2 className="font-display text-xl text-ink mb-2">Your stack</h2>
            <p className="text-sm text-warm-mid mb-1 leading-relaxed">
              <span className="font-semibold text-ink">Tap any supplement</span> below to open the full card?dose, timing, why it fits your goals, evidence, and buy links.
            </p>
            <p className="text-xs text-warm-light mb-4">Collapsed rows show a quick summary; expand when you&apos;re ready to go deeper.</p>
            <div className="rounded-2xl border border-sage/35 bg-moss-light/30 px-4 py-3 mb-4 space-y-2 dark:border-stone dark:bg-surface/85 dark:shadow-[inset_0_1px_0_rgba(104,226,168,0.1)]">
              <p className="text-sm font-semibold text-ink">Already taking supplements?</p>
              <p className="text-xs text-warm-mid leading-relaxed">
                Tell Stacky what you take, even if it is not on this list yet. Stacky can add them to your stack with the same detail as everything here: best way to take them (food, absorption, spacing), where they fit in your daily rhythm, benefits you might notice, and shop links?just ask in chat.
              </p>
              <button
                type="button"
                onClick={() => setChatOpenSignal((n) => n + 1)}
                className="text-xs font-bold text-ink underline underline-offset-2 decoration-moss/50 hover:text-moss"
              >
                <span className="inline-flex items-center gap-1.5">
                  <NavIcon kind="chat" size={14} className="text-ink opacity-90" />
                  <span>Open Stacky to add what you take</span>
                </span>
              </button>
            </div>
            <div className="space-y-3">
              {supplements.map((s, idx) => {
                const cardId = `${idx}-${s.name}`;
                const isLocked = !isBasicOrPro() && idx >= 2;
                return (
                  <div
                    key={cardId}
                    className="stackwise-result-card-reveal"
                    style={{ animationDelay: `${220 + idx * 72}ms` }}
                  >
                    <SupplementCard
                      s={s}
                      quizGoals={quizGoalList}
                      expanded={expandedCards.has(cardId)}
                      onToggle={() => {
                        if (!isLocked) toggleCard(cardId);
                      }}
                      locked={isLocked}
                    />
                  </div>
                );
              })}
            </div>

            {!isBasicOrPro() && supplements.length > 2 && (
              <div className="rounded-2xl p-5 text-center bg-forest border border-white/10">
                <div className="text-2xl mb-2">??</div>
                <div className="font-serif font-light text-lg mb-1 text-on-dark-primary">
                  {supplements.length - 2} more supplement{supplements.length - 2 !== 1 ? 's' : ''} in your plan
                </div>
                <p className="text-sm mb-4 leading-relaxed text-on-dark-muted">
                  Unlock full dose, timing, and the reasoning behind every recommendation. Plus rebuild your stack whenever
                  your goals change.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/pricing')}
                  className="sw-pill-on-dark w-full rounded-full font-semibold text-sm transition-all inline-flex items-center justify-center gap-2 hover:opacity-95 h-[50px] max-w-[280px] mx-auto"
                >
                  <NavIcon kind="pricing" size={16} className="opacity-90" />
                  <span>Unlock full stack, from $9/mo.</span>
                </button>
                <p className="text-xs mt-3 text-on-dark-subtle">
                  Cancel anytime · 7-day fit guarantee
                </p>
              </div>
            )}
          </div>

          {quiz?.specificGoal?.trim() && (
            <section
              className="stackwise-result-block-reveal rounded-[24px] p-[1.5px] shadow-[0_22px_48px_rgba(28,58,46,0.32)]"
              style={{
                animationDelay: `${300 + supplements.length * 72}ms`,
                background:
                  'linear-gradient(135deg, #E8CF7A 0%, #C9A855 22%, #4A7C59 52%, #1C3A2E 100%)',
              }}
            >
              <div
                className="rounded-[23px] p-4 sm:p-5"
                style={{
                  background:
                    'radial-gradient(circle at top right, rgba(247,226,178,0.14) 0%, transparent 46%), linear-gradient(180deg, #142920 0%, #1C3A2E 52%, #163028 100%)',
                  border: '1.5px solid rgba(123, 158, 135, 0.55)',
                  boxShadow: 'inset 0 1px 0 rgba(247,226,178,0.12)',
                }}
              >
                <div className="mb-3">
                  <h3
                    className="font-display text-xl sm:text-2xl font-semibold text-[#F7E2B2] tracking-[0.04em]"
                    style={{
                      textShadow:
                        '0 0 36px rgba(212,232,218,0.22), 0 0 42px rgba(247,226,178,0.32), 0 2px 10px rgba(0,0,0,0.35)',
                    }}
                  >
                    Super Focus
                  </h3>
                  <div
                    className="mt-2.5 h-0.5 max-w-[7.5rem] rounded-full"
                    style={{
                      background:
                        'linear-gradient(90deg, #E4C27A 0%, #4A7C59 55%, rgba(74,124,89,0.25) 100%)',
                      boxShadow: '0 0 14px rgba(74,124,89,0.35), 0 0 8px rgba(228,194,122,0.25)',
                    }}
                    aria-hidden
                  />
                </div>
                <p className="text-sm text-[#D4E8DA] leading-relaxed">
                  Built from your specific target: <span className="font-semibold text-[#F7E2B2]">{quiz?.specificGoal}</span>.
                </p>
                <p className="text-xs text-[#9BB8A8] mt-2 leading-relaxed">
                  Budget-aware behavior stays on. Super Focus scales to your budget while keeping your base stack pricing stable.
                </p>

                {superFocusSupplements.length > 0 ? (
                  <div className="space-y-3 mt-4">
                    {superFocusSupplements.map((s, idx) => {
                      const cardId = `sf-${idx}-${s.name}`;
                      return (
                        <div
                          key={cardId}
                          className="relative rounded-2xl p-[1.5px]"
                          style={{
                            background:
                              'linear-gradient(135deg, #F7E2B2 0%, #B8D4C4 38%, #4A7C59 72%, #2D5242 100%)',
                            boxShadow: '0 10px 28px rgba(28,58,46,0.22)',
                          }}
                        >
                          <span
                            className="absolute -top-2.5 right-3 z-10 text-[10px] font-black uppercase tracking-[0.14em] px-2.5 py-1 rounded-full"
                            style={{
                              background: 'linear-gradient(135deg, #E8F2EC 0%, #D4E8DA 55%, #B8D4C4 100%)',
                              color: '#1C3A2E',
                              border: '1px solid rgba(228,194,122,0.55)',
                              boxShadow: '0 2px 10px rgba(28,58,46,0.2)',
                            }}
                          >
                            Super Focus
                          </span>
                          <div className="rounded-2xl bg-surface-elevated">
                            <SupplementCard
                              s={s}
                              quizGoals={quizGoalList}
                              expanded={expandedCards.has(cardId)}
                              onToggle={() => toggleCard(cardId)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-sage/35 bg-moss-light/85 px-3 py-2.5 mt-4 text-xs text-ink">
                    Super Focus is saved, but no extra add-ons were needed for your current budget and target.
                  </div>
                )}
              </div>
            </section>
          )}

          <div
            className="stackwise-result-block-reveal rounded-2xl border border-stone bg-surface-elevated overflow-hidden"
            style={{ animationDelay: `${240 + supplements.length * 72}ms` }}
          >
            <div className="px-4 py-3 border-b border-stone bg-cream-dark/50">
              <div className="text-xs font-semibold uppercase tracking-widest text-warm-light">Daily rhythm</div>
              <p className="text-[11px] text-warm-mid mt-1">Your supplement schedule, made simple.</p>
            </div>
            {(['morning', 'afternoon', 'evening'] as const).map((period) => {
              const items = dailySchedule[period];
              if (!items?.length) return null;
              return (
                <div key={period} className="px-4 py-3 border-b border-stone/60 last:border-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg" aria-hidden>
                      {RHYTHM_ICONS[period]}
                    </span>
                    <span className="text-sm font-semibold capitalize text-ink">{period}</span>
                  </div>
                  <ul className="space-y-2 text-sm text-warm-mid">
                    {items.map((line) => {
                      const matched = findSupplementForScheduleLine(line, supplements);
                      const lineBadges = matched ? absorptionBadgesFromTiming(matched.timing) : [];
                      const lineLocked = blurRhythmForLockedSupplements && isRhythmLineLockedForFreeTier(line, supplements);
                      return (
                        <li
                          key={line}
                          className={`leading-relaxed pl-1 border-l-2 pl-3 ${lineLocked ? 'border-stone/40' : 'border-moss/25'}`}
                        >
                          {lineLocked ? (
                            <>
                              <span className="sr-only">
                                Timing for a supplement in your plan is hidden on Free. Upgrade to see full daily rhythm.
                              </span>
                              <span
                                aria-hidden
                                className="block select-none text-warm-light opacity-70"
                                style={{ filter: 'blur(4px)' }}
                              >
                                {line}
                              </span>
                              {lineBadges.length > 0 && (
                                <div
                                  className="flex flex-wrap gap-1 mt-1 opacity-40 select-none"
                                  aria-hidden
                                  style={{ filter: 'blur(3px)' }}
                                >
                                  {lineBadges.map((b) => (
                                    <span
                                      key={b}
                                      className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-moss-light/40 text-ink"
                                    >
                                      {b}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <span>{line}</span>
                              {lineBadges.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {lineBadges.map((b) => (
                                    <span
                                      key={b}
                                      className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-moss-light/40 text-ink"
                                    >
                                      {b}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>

          <div
            className="stackwise-result-block-reveal rounded-2xl border-2 border-moss/35 bg-surface-elevated dark:border-moss/25 p-5 sm:p-6 space-y-4 shadow-[0_8px_30px_rgba(28,58,46,0.08)] dark:shadow-[0_8px_36px_rgba(0,0,0,0.35)]"
            style={{ animationDelay: `${320 + supplements.length * 72}ms` }}
          >
            <h3 className="font-display text-xl sm:text-2xl text-ink font-bold tracking-tight">
              What do you want to do next?
            </h3>
            <p className="text-sm text-warm-mid leading-relaxed">
              <span className="font-semibold text-ink">Take your time</span> scrolling your stack and daily rhythm
              above. There is no rush. When you are ready to go deeper, use the bright orange button first to chat with
              Stacky, or open Stack Hub for your full plan on one screen.
            </p>
              <p className="text-xs text-warm-light leading-relaxed border-l-2 border-moss/40 pl-3">
              Want to log mood and reminders? Use <span className="font-semibold text-ink">Track daily rhythm</span>, it is a lighter step whenever you are ready.
            </p>
            <div className="flex flex-col gap-3 pt-1">
              <button
                type="button"
                className="btn-stacky-continue w-full"
                onClick={() => setChatOpenSignal((n) => n + 1)}
              >
                <span className="btn-stacky-continue-title inline-flex items-center justify-center gap-2">
                  <NavIcon kind="chat" size={18} className="text-ink opacity-95" />
                  <span>Continue, talk to Stacky</span>
                </span>
                <span className="btn-stacky-continue-sub">Tap when you have looked through your plan</span>
              </button>
              <button
                type="button"
                className="btn-hub-cta w-full"
                onClick={() => navigate('/coach')}
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <NavIcon kind="hub" size={18} className="text-ink opacity-90" />
                  <span>Open Stack Hub</span>
                </span>
                <span className="btn-hub-cta-sub">See your plan, supplements, and saved stacks in one place</span>
              </button>
              <button type="button" className="btn-daily-soft w-full" onClick={() => navigate('/dashboard')}>
                <span className="inline-flex items-center justify-center gap-2">
                  <NavIcon kind="daily" size={18} className="text-ink opacity-90" />
                  <span>Track daily rhythm</span>
                </span>
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-stone bg-surface-elevated px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span className="text-sm font-semibold text-ink">Estimated monthly range</span>
            <span className="text-sm text-warm-mid tabular-nums">
              {formatStackTotalMonthly(result.totalMonthlyCostLow, result.totalMonthlyCostHigh)}
            </span>
          </div>

          <p className="text-[11px] leading-relaxed text-warm-light px-1">{result.disclaimer}</p>

          <p className="text-[11px] leading-relaxed px-1 text-warm-light/90 dark:text-warm-mid" style={{ marginTop: -4 }}>
            These statements have not been evaluated by the Food and Drug Administration. Supplement recommendations are not intended to diagnose, treat, cure, or prevent any disease. Always consult a qualified healthcare professional before starting or changing any supplement regimen, particularly if you take prescription medications or have a medical condition.
          </p>

          <div className="space-y-4 pb-4">
            <div className="rounded-2xl border-2 border-moss/35 bg-surface-elevated px-4 py-5 shadow-sm dark:shadow-[0_8px_28px_rgba(0,0,0,0.3)]">
              <p className="font-display text-lg font-bold text-ink mb-1">More ways to get around</p>
              <p className="text-sm text-warm-mid leading-relaxed mb-4">
                Tap what you need. You can always come back to this page from the menu at the top.
              </p>
              <button
                type="button"
                className="btn-hub-cta w-full mb-3"
                onClick={() => navigate('/coach')}
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <NavIcon kind="hub" size={18} className="text-ink opacity-90" />
                  <span>Open Stack Hub</span>
                </span>
                <span className="btn-hub-cta-sub">One screen for your stack, reminders, and check-ins</span>
              </button>
            </div>

            <div className="rounded-xl border border-sage/30 bg-moss-light/35 dark:bg-surface dark:border-sage/25 px-4 py-4">
              <p className="text-base font-bold text-ink mb-1">{REBUILD_HEADLINE}</p>
              <p className="text-sm text-warm-mid leading-relaxed mb-4">
                {isBasicOrPro() ? REBUILD_PAID_REMINDER : REBUILD_SAVINGS_BODY}
              </p>
              {isBasicOrPro() ? (
                <button
                  type="button"
                  className="w-full min-h-[56px] rounded-2xl bg-forest text-on-dark-primary font-bold text-base hover:bg-forest-light transition-colors px-4 shadow-lg ring-2 ring-forest/20"
                  onClick={() => navigate('/quiz', { state: { quickRebuild: true } })}
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <NavIcon kind="rebuild" size={18} className="text-on-dark-primary opacity-95" />
                    <span>Build a new stack</span>
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  className="w-full min-h-[56px] rounded-2xl border-2 border-forest bg-cream text-ink font-bold text-base hover:bg-moss-light/40 transition-colors px-4 shadow-md"
                  onClick={() => navigate('/pricing', { state: { intent: 'rebuild' } })}
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <NavIcon kind="pricing" size={18} className="text-ink opacity-90" />
                    <span>{REBUILD_UPGRADE_CTA}</span>
                  </span>
                </button>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              {!isPro() && (
                <button type="button" className="btn-primary flex-1 min-h-[52px] text-base" onClick={() => navigate('/pricing')}>
                  <span className="inline-flex items-center justify-center gap-2">
                    <NavIcon kind="pricing" size={18} className="text-on-dark-primary opacity-95" />
                    <span>Upgrade for Stacky Pro</span>
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {stackContext ? (
        <ChatWidget stackContext={stackContext} onStackUpdated={onStackUpdated} openSignal={chatOpenSignal} />
      ) : null}
    </div>
  );
}
