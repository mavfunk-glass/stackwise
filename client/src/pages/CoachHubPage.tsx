import { useMemo, useState, useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import ChatWidget from '../components/ChatWidget';
import StackyCat from '../components/StackyCat';
import {
  ensureCurrentStackFromProfile,
  getAccountabilityState,
  getReminderTime,
  getTodayCheckIn,
  isBasicOrPro,
  isPro,
  loadStackArchive,
  loadStackProfile,
  loadStoredState,
  moveStackArchiveEntry,
  renameCurrentStackProfile,
  renameStackArchiveEntry,
  recordCheckIn,
  saveQuiz,
  saveResult,
  setReminderTime,
  type StackArchiveEntry,
} from '../types/storage';
import {
  REBUILD_HEADLINE,
  REBUILD_PAID_REMINDER,
  REBUILD_SAVINGS_TEASER,
  REBUILD_UPGRADE_CTA,
} from '../copy/rebuildStackUpsell';
import { NavIcon } from '../copy/navWayfinding';
import { saveReminderToServer, fetchAccountMe } from '../api/session';
import { buildChatStackContext, formatHeightForChat, formatWeightForChat } from '../utils/chatStackContext';
import { GOAL_THEME, splitPrimaryGoal } from '../utils/goalTheme';
import {
  supplementAmazonHref,
  supplementAmazonSearchHref,
  supplementHasAmazonProductLink,
  supplementHasIHerbProductLink,
  supplementIHerbHref,
  supplementIHerbSearchHref,
} from '../utils/supplementRetailerUrls';
import type { PrimaryGoal } from '../types/stackwise';
import { useTheme } from '../theme/ThemeProvider';

function GoalPillRow({ goals, compact }: { goals: PrimaryGoal[]; compact?: boolean }) {
  const { resolved } = useTheme();
  const isDark = resolved === 'dark';
  const max = compact ? 5 : 8;
  const safe = goals.filter((g): g is PrimaryGoal => g in GOAL_THEME);
  const slice = safe.slice(0, max);
  return (
    <div className="flex flex-wrap gap-1 min-w-0 items-center">
      {slice.map((g) => {
        const theme = GOAL_THEME[g];
        const { emoji, label } = splitPrimaryGoal(g);
        return (
          <span
            key={g}
            title={label}
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full max-w-[9rem] truncate"
            style={
              isDark
                ? {
                    color: theme.pillTextDark,
                    background: theme.pillBgDark,
                    border: `1px solid ${theme.pillBorderDark}`,
                  }
                : { color: theme.text, background: theme.pillBg, border: `1px solid ${theme.pillBorder}` }
            }
          >
            {emoji} {label}
          </span>
        );
      })}
      {safe.length > max && (
        <span className="text-[10px] text-warm-light font-medium">+{safe.length - max}</span>
      )}
    </div>
  );
}

const MOOD_LABELS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'Rough',
  2: 'Low',
  3: 'Okay',
  4: 'Good',
  5: 'Great',
};

function getStackyCheckInAdvice(mood: 1 | 2 | 3 | 4 | 5, note: string): string {
  const hasNote = note.trim().length > 0;
  if (mood <= 2) {
    return hasNote
      ? 'Thanks for sharing this. Keep your routine simple today: stick to your core supplements, hydration, and your regular timing. I can help you adjust your stack in chat if this trend continues.'
      : 'If today feels rough, keep it simple: take your core supplements on schedule and avoid adding new products impulsively. We can review possible adjustments together in chat.';
  }
  if (mood === 3) {
    return hasNote
      ? 'Solid check-in. Keep your current routine steady for now, then use your note as context for what to watch over the next few days.'
      : 'Middle-day check-ins are useful. Stay consistent with your current plan and look for patterns before making changes.';
  }
  return hasNote
    ? 'Love this update. Keep doing what is working, and use chat to decide whether to lock this in or fine-tune one detail.'
    : 'Great momentum. Keep your routine steady and log another check-in tomorrow so we can see if this trend holds.';
}

export default function CoachHubPage() {
  ensureCurrentStackFromProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const stored = loadStoredState();
  const [profile, setProfile] = useState(() => loadStackProfile());
  const accountability = getAccountabilityState();
  const todayCheckIn = getTodayCheckIn();

  const [mood, setMood] = useState<1 | 2 | 3 | 4 | 5>((todayCheckIn?.mood as 1 | 2 | 3 | 4 | 5) ?? 3);
  const [note, setNote] = useState(todayCheckIn?.note ?? '');
  const [savedCheckIn, setSavedCheckIn] = useState(false);
  const [reminder, setReminder] = useState(getReminderTime() ?? '20:30');
  const [savedReminder, setSavedReminder] = useState(false);
  const [reminderEmailRequired, setReminderEmailRequired] = useState(false);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [reminderServerSaved, setReminderServerSaved] = useState(false);

  useEffect(() => {
    void fetchAccountMe().then(({ user }) => {
      if (user?.email) setAccountEmail(user.email);
      if (user?.reminderTime) setReminder(user.reminderTime);
    });
  }, []);
  const [preferredName, setPreferredName] = useState<string>(() => {
    try {
      return localStorage.getItem('stackwise_preferred_name') ?? '';
    } catch {
      return '';
    }
  });
  const [savedName, setSavedName] = useState(false);
  const [stackArchive, setStackArchive] = useState<StackArchiveEntry[]>(() => loadStackArchive());
  const [activeStackNameDraft, setActiveStackNameDraft] = useState(() => loadStackProfile()?.name ?? 'Current stack');
  const [editingArchiveId, setEditingArchiveId] = useState<string | null>(null);
  const [archiveLabelDraft, setArchiveLabelDraft] = useState<Record<string, string>>({});
  const [isNavScrolled, setIsNavScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setIsNavScrolled(window.scrollY > 6);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!stored.result) return <Navigate to="/quiz" replace />;

  const quiz = stored.quiz;
  const result = stored.result;
  const goals = (quiz?.primaryGoals ?? []) as PrimaryGoal[];
  const displayName = preferredName.trim() || 'friend';

  const stackContext = useMemo(
    () =>
      buildChatStackContext({
        surface: 'hub',
        result,
        quiz,
        profile,
        preferredName,
        accountability,
        todayCheckIn,
        reminderTime: getReminderTime(),
      }),
    [accountability, preferredName, profile, quiz, result, todayCheckIn],
  );

  return (
    <div className="min-h-screen bg-sw-bg text-warm">
      <nav
        className="sticky top-0 z-40 border-b border-stone sw-sticky-nav"
        style={{
          borderBottomWidth: isNavScrolled ? '0.5px' : '1px',
        }}
      >
        <div className="max-w-4xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/results')}
              className="inline-flex items-center gap-1.5 shrink-0 text-xs font-semibold text-ink hover:text-moss transition-colors whitespace-nowrap dark:text-warm dark:hover:text-moss"
            >
              <NavIcon kind="stack" size={15} className="text-ink opacity-90" />
              <span>Back to stack</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/landing')}
              className="inline-flex items-center gap-1.5 font-serif font-light tracking-widest text-sm text-ink truncate dark:text-warm"
              style={{ letterSpacing: '0.15em' }}
            >
              <NavIcon kind="home" size={17} className="text-ink opacity-90 shrink-0" />
              <span>STACKWISE</span>
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-1 text-xs font-medium text-warm-mid hover:text-ink transition-colors dark:text-warm-mid dark:hover:text-warm"
            >
              <NavIcon kind="daily" size={15} className="opacity-90" />
              <span>Daily</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/results')}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] rounded-full border-2 border-forest/25 bg-surface-elevated px-4 text-sm font-bold text-ink hover:bg-moss-light/25 transition-colors dark:text-warm"
            >
              <NavIcon kind="stack" size={17} className="text-ink opacity-90" />
              <span>Full stack guide</span>
            </button>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-warm-mid px-1 dark:text-warm-mid">
              <NavIcon kind="hub" size={15} className="text-warm-mid opacity-90" />
              <span>Stack Hub</span>
            </span>
          </div>
        </div>
      </nav>

      <div
        key={`hub-${location.key}`}
        className="max-w-4xl mx-auto px-4 py-6 pb-56 sm:pb-60 space-y-4"
      >
        <div className="stackwise-result-block-reveal rounded-2xl border border-stone bg-surface-elevated p-5 shadow-sm">
          <div className="text-[10px] uppercase tracking-widest text-warm-light font-semibold mb-2">Quick action</div>
          <p className="text-base font-bold text-ink mb-1">{REBUILD_HEADLINE}</p>
          <p className="text-sm text-warm-mid leading-relaxed mb-4">
            {isBasicOrPro() ? REBUILD_PAID_REMINDER : REBUILD_SAVINGS_TEASER}
          </p>
          {isBasicOrPro() ? (
            <button
              type="button"
              onClick={() => navigate('/quiz', { state: { quickRebuild: true } })}
              className="inline-flex w-full min-h-[56px] items-center justify-center gap-2 rounded-2xl bg-forest px-5 text-base font-bold text-on-dark-primary hover:bg-forest-light transition-colors shadow-lg ring-2 ring-forest/20"
            >
              <NavIcon kind="rebuild" size={18} className="text-on-dark-primary opacity-95" />
              <span>Build a new stack</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/pricing', { state: { intent: 'rebuild' } })}
              className="inline-flex w-full min-h-[56px] items-center justify-center gap-2 rounded-2xl border-2 border-forest bg-cream px-5 text-base font-bold text-ink hover:bg-moss-light/40 transition-colors shadow-md"
            >
              <NavIcon kind="pricing" size={18} className="text-ink opacity-90" />
              <span>{REBUILD_UPGRADE_CTA}</span>
            </button>
          )}
        </div>

        <div
          className="stackwise-result-hero-reveal rounded-2xl border border-stone bg-surface-elevated p-4 sm:p-5 shadow-sm"
          style={{ animationDelay: '120ms' }}
        >
          <h1 className="font-display text-2xl sm:text-3xl text-ink leading-tight">Your Stack Hub</h1>

          <div className="mt-4 flex flex-col sm:flex-row gap-4 items-start">
            <div className="flex-shrink-0 mx-auto sm:mx-0">
              <StackyCat
                mood="wave"
                size={120}
                className="drop-shadow-sm"
              />
            </div>
            <div className="flex-1 min-w-0 w-full">
              <p className="text-sm leading-relaxed text-warm">
                Hey <span className="font-semibold text-ink">{displayName}</span>. This is your home base for your stack, daily check-ins, reminders, and quick support from Stacky.
              </p>
              <p className="text-sm leading-relaxed text-warm mt-2">
                Everything below is organized to help you stay consistent and make clearer supplement decisions over time.
              </p>
              <p className="text-[11px] text-warm-light mt-2 leading-snug">
                {isPro()
                  ? 'Pro is active. You have unlimited Stacky chat and advanced guidance.'
                  : 'Upgrade to Pro for unlimited Stacky chat and deeper guidance.'}{' '}
                <button
                  type="button"
                  className="inline-flex items-center gap-1 font-semibold text-ink underline underline-offset-2"
                  onClick={() => navigate('/profile')}
                >
                  <NavIcon kind="profile" size={14} className="text-ink opacity-90" />
                  <span>Profile</span>
                </button>
              </p>

              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={preferredName}
                  onChange={(e) => setPreferredName(e.target.value)}
                  className="flex-1 rounded-xl border border-stone bg-cream/40 px-3 py-2 text-sm"
                  placeholder="What's your name?"
                />
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem('stackwise_preferred_name', preferredName.trim());
                    setSavedName(true);
                    window.setTimeout(() => setSavedName(false), 1300);
                  }}
                  className="rounded-xl bg-forest text-on-dark-primary text-xs font-semibold px-3 py-2 sm:self-stretch"
                >
                  Save name
                </button>
              </div>
              {savedName && <div className="text-xs text-forest-light dark:text-moss mt-2">Name saved.</div>}
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-stone/80">
            <div className="text-[10px] uppercase tracking-widest text-warm-light font-semibold mb-2">Stack library</div>
            <p className="text-[11px] text-warm-mid mb-3 leading-snug">
              Open your current stack or load a previous one. Past stacks appear here after each rebuild on Basic or Pro.
            </p>
            {isPro() && (
              <p className="text-[10px] text-forest-light dark:text-moss mb-3">
                Pro: Edit names inside each stack card and reorder archived stacks with the arrows.
              </p>
            )}
            <div
              className={stackArchive.length > 5 ? 'max-h-[380px] overflow-y-auto pr-1' : ''}
            >
              <ul className="space-y-2">
              <li>
                <div className="rounded-xl border border-forest/25 bg-moss-light/20 px-3 py-2.5">
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-ink shrink-0">Active</span>
                      {isPro() ? (
                        <div className="flex flex-1 min-w-0 flex-wrap items-center gap-2">
                          <input
                            type="text"
                            value={activeStackNameDraft}
                            onChange={(e) => setActiveStackNameDraft(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="min-w-0 flex-1 rounded-lg border border-stone bg-surface-elevated px-2.5 py-1.5 text-xs text-ink"
                            placeholder="Name this stack"
                            aria-label="Stack name"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const next = renameCurrentStackProfile(activeStackNameDraft);
                              if (next) {
                                setProfile(next);
                                setActiveStackNameDraft(next.name);
                              }
                            }}
                            className="shrink-0 rounded-lg border border-forest/25 bg-moss-light/40 px-2.5 py-1.5 text-[10px] font-semibold text-ink hover:bg-moss-light/60"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-ink truncate">
                          {profile?.name?.trim() || 'Current stack'}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                      <div className="min-w-0 flex-1">
                        {goals.length > 0 ? (
                          <GoalPillRow goals={goals} compact />
                        ) : (
                          <span className="text-[10px] text-warm-light">Goals from quiz</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate('/results')}
                        className="shrink-0 rounded-lg border border-forest/30 bg-surface-elevated/80 px-3 py-1.5 text-[11px] font-semibold text-ink hover:bg-surface-elevated"
                      >
                        Open stack
                      </button>
                    </div>
                  </div>
                </div>
              </li>
              {stackArchive.map((entry: StackArchiveEntry) => (
                <li key={entry.id}>
                  <div className="rounded-xl border border-stone bg-cream/30 px-3 py-2.5">
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          {isPro() && editingArchiveId === entry.id ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <input
                                type="text"
                                value={archiveLabelDraft[entry.id] ?? entry.label}
                                onChange={(e) =>
                                  setArchiveLabelDraft((prev) => ({ ...prev, [entry.id]: e.target.value }))
                                }
                                className="min-w-0 flex-1 rounded-lg border border-stone bg-surface-elevated px-2 py-1.5 text-xs"
                                placeholder="Stack name"
                                aria-label="Rename stack"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const ok = renameStackArchiveEntry(entry.id, archiveLabelDraft[entry.id] ?? entry.label);
                                  if (ok) {
                                    setStackArchive(loadStackArchive());
                                    setEditingArchiveId(null);
                                  }
                                }}
                                className="rounded-lg border border-forest/25 bg-moss-light/30 px-2 py-1.5 text-[10px] font-semibold text-ink"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingArchiveId(null)}
                                className="rounded-lg border border-stone px-2 py-1.5 text-[10px] font-semibold text-warm-mid"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-semibold text-ink truncate">{entry.label}</span>
                              {isPro() && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingArchiveId(entry.id);
                                    setArchiveLabelDraft((prev) => ({ ...prev, [entry.id]: entry.label }));
                                  }}
                                  className="shrink-0 rounded-md border border-stone/80 bg-surface-elevated/60 px-2 py-0.5 text-[10px] font-semibold text-warm-mid hover:text-ink"
                                >
                                  Edit name
                                </button>
                              )}
                            </div>
                          )}
                          <div className="text-[10px] text-warm-light tabular-nums mt-0.5">
                            {new Date(entry.savedAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </div>
                        </div>
                        {!(isPro() && editingArchiveId === entry.id) && (
                          <button
                            type="button"
                            onClick={() => {
                              if (entry.quiz) saveQuiz(entry.quiz);
                              saveResult(entry.result);
                              navigate('/results', { replace: true });
                            }}
                            className="shrink-0 rounded-lg border border-stone bg-surface-elevated/70 px-3 py-1.5 text-[11px] font-semibold text-ink hover:bg-surface-elevated"
                          >
                            Load
                          </button>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                        <div className="min-w-0 flex-1">
                          {(entry.quiz?.primaryGoals?.length ?? 0) > 0 ? (
                            <GoalPillRow goals={(entry.quiz!.primaryGoals ?? []) as PrimaryGoal[]} compact />
                          ) : (
                            <span className="text-[10px] text-warm-light">Saved plan</span>
                          )}
                        </div>
                        {isPro() && editingArchiveId !== entry.id && (
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (moveStackArchiveEntry(entry.id, -1)) setStackArchive(loadStackArchive());
                              }}
                              className="rounded-lg border border-stone px-2 py-1 text-[10px] font-semibold text-warm-mid hover:bg-surface-elevated/80"
                              aria-label="Move stack up"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (moveStackArchiveEntry(entry.id, 1)) setStackArchive(loadStackArchive());
                              }}
                              className="rounded-lg border border-stone px-2 py-1 text-[10px] font-semibold text-warm-mid hover:bg-surface-elevated/80"
                              aria-label="Move stack down"
                            >
                              ↓
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
              </ul>
            </div>
            {stackArchive.length === 0 && (
              <p className="text-[11px] text-warm-light mt-2">No archived stacks yet, when you generate a new plan, your prior stack appears here.</p>
            )}
          </div>
        </div>

        <div
          className="stackwise-result-block-reveal rounded-2xl border border-stone bg-surface-elevated p-4 shadow-sm"
          style={{ animationDelay: '220ms' }}
        >
          <div className="text-[10px] uppercase tracking-widest text-warm-light font-semibold mb-2">Profile snapshot</div>
          <p className="text-[11px] text-warm-mid mb-3 leading-snug">
            Quick reference for the details guiding your current plan.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <div>Age: <span className="font-semibold">{quiz?.ageRange ?? 'Not set'}</span></div>
            <div>Sex: <span className="font-semibold">{quiz?.biologicalSex ?? 'Not set'}</span></div>
            <div>Height: <span className="font-semibold">{formatHeightForChat(quiz?.heightCm as number | undefined)}</span></div>
            <div>Weight: <span className="font-semibold">{formatWeightForChat(quiz?.weightKg as number | undefined)}</span></div>
            <div className="sm:col-span-2">Mindset: <span className="font-semibold">{quiz?.mindset ?? 'Not set'}</span></div>
            {quiz?.specificGoal?.trim() ? (
              <div className="sm:col-span-2">
                Focus Stack: <span className="font-semibold">{quiz.specificGoal.trim()}</span>
              </div>
            ) : null}
          </div>
          {goals.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {goals.map((g) => {
                const theme = GOAL_THEME[g];
                const { emoji, label } = splitPrimaryGoal(g);
                return (
                  <span
                    key={g}
                    className="text-[11px] font-semibold px-3 py-1 rounded-full"
                    style={{ color: theme.text, background: theme.pillBg, border: `1px solid ${theme.pillBorder}` }}
                  >
                    {emoji} {label}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        <div
          className="stackwise-result-block-reveal rounded-2xl border border-stone bg-surface-elevated p-4 shadow-sm"
          style={{ animationDelay: '300ms' }}
        >
          <div className="text-[10px] uppercase tracking-widest text-warm-light font-semibold mb-2">Stacky daily check-in</div>
          <p className="text-[11px] text-warm-mid mb-3 leading-snug">
            Check in with Stacky so you get quick guidance and cleaner decisions on what to keep, tweak, or watch.
          </p>
          <div className="rounded-xl border border-sage/35 bg-moss-light/20 p-3 mb-3">
            <div className="flex items-start gap-2.5">
              <StackyCat mood={mood <= 2 ? 'think' : mood >= 4 ? 'celebrate' : 'wave'} size={54} />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-ink mb-1">
                  Stacky says for today ({MOOD_LABELS[mood]}):
                </p>
                <p className="text-xs text-warm-mid leading-relaxed">
                  {getStackyCheckInAdvice(mood, note)}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMood(m as 1 | 2 | 3 | 4 | 5)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold border border-stone ${
                  mood === m ? 'bg-forest text-on-dark-primary' : 'bg-surface-elevated text-warm'
                }`}
              >
                {m} · {MOOD_LABELS[m as 1 | 2 | 3 | 4 | 5]}
              </button>
            ))}
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-3 w-full rounded-xl border border-stone bg-cream/40 px-3 py-2 text-sm"
            rows={3}
            placeholder="Optional note: what felt better, what felt off, or what you want to adjust"
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                recordCheckIn(mood, note.trim() || undefined);
                setSavedCheckIn(true);
                window.setTimeout(() => setSavedCheckIn(false), 1400);
              }}
              className="rounded-xl bg-forest text-on-dark-primary text-xs font-semibold px-3 py-2"
            >
              Check in with Stacky
            </button>
            {savedCheckIn && <span className="text-xs text-forest-light dark:text-moss">Checked in.</span>}
            <span className="text-xs text-warm-light ml-auto">
              Streak: {accountability.currentStreak}d (best {accountability.longestStreak}d)
            </span>
          </div>
        </div>

        <div
          className="stackwise-result-block-reveal rounded-2xl border border-stone bg-surface-elevated p-4 shadow-sm"
          style={{ animationDelay: '380ms' }}
        >
          <div className="text-[10px] uppercase tracking-widest text-warm-light font-semibold mb-2">Reminder settings</div>
          <p className="text-xs text-warm-mid mb-2 leading-snug">
            {isBasicOrPro()
              ? 'Set a time and Stacky will email you your daily schedule.'
              : 'Upgrade to Basic or Pro for daily email reminders.'}
          </p>
          {isBasicOrPro() && accountEmail && (
            <p className="text-[11px] text-forest-light dark:text-moss mb-2">
              Reminders will go to <strong className="text-ink">{accountEmail}</strong>
            </p>
          )}
          {isBasicOrPro() ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="time"
                  value={reminder}
                  onChange={(e) => setReminder(e.target.value)}
                  className="rounded-xl border border-stone px-3 py-2 text-sm bg-cream/30"
                />
                <button
                  type="button"
                  onClick={() => {
                    void (async () => {
                      setReminderTime(reminder);
                      setSavedReminder(true);
                      window.setTimeout(() => setSavedReminder(false), 1400);
                      const stackJson = JSON.stringify(result);
                      const serverResult = await saveReminderToServer(reminder, stackJson, true);
                      if (serverResult.emailRequired) {
                        setReminderEmailRequired(true);
                      } else if (serverResult.ok) {
                        setReminderServerSaved(true);
                        window.setTimeout(() => setReminderServerSaved(false), 3000);
                      }
                    })();
                  }}
                  className="rounded-xl bg-forest text-on-dark-primary text-xs font-semibold px-3 py-2"
                >
                  Save reminder
                </button>
                {savedReminder && <span className="text-xs text-forest-light dark:text-moss">Saved.</span>}
              </div>
              {reminderServerSaved && (
                <p className="text-xs text-forest-light dark:text-moss mt-2">
                  ✓ Email reminder saved. Stacky will email you at {reminder} each day.
                </p>
              )}
              {reminderEmailRequired && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2 mt-2">
                  <p className="text-[11px] font-semibold text-amber-900 mb-0.5">Email needed</p>
                  <p className="text-[11px] text-amber-900/90 leading-snug">
                    Save your stack with an email on the results page to receive reminders.
                  </p>
                </div>
              )}
              {!reminderEmailRequired && !accountEmail && savedReminder && (
                <p className="text-[11px] text-warm-light mt-2">
                  Link your email on the results page to enable email reminders.
                </p>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/pricing')}
              className="inline-flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl bg-forest text-on-dark-primary text-sm font-semibold px-4"
            >
              <NavIcon kind="pricing" size={17} className="text-on-dark-primary opacity-95" />
              <span>Upgrade for email reminders</span>
            </button>
          )}
        </div>

        <div
          className="stackwise-result-block-reveal rounded-2xl border border-stone bg-surface-elevated p-4 shadow-sm"
          style={{ animationDelay: '460ms' }}
        >
          <div className="text-[10px] uppercase tracking-widest text-warm-light font-semibold mb-1">Supplement list</div>
          <p className="text-[11px] text-warm-mid leading-snug mb-3">
            Your active stack at a glance, with dose, timing, and quick shop links.
          </p>
          {!isBasicOrPro() && result.supplements.length > 2 && (
            <p className="text-[10px] text-warm-light leading-snug mb-3 rounded-lg border border-stone/80 bg-cream/60 px-2.5 py-2">
              On Free, full dose and timing match your results page: the first two supplements stay clear; the rest stay
              blurred until you upgrade.
            </p>
          )}
          <div className="space-y-2">
            {result.supplements.map((s, idx) => {
              const isLocked = !isBasicOrPro() && idx >= 2;
              const amazonPrimary = supplementAmazonHref(s);
              const amazonSearchOnly = supplementAmazonSearchHref(s);
              const amazonIsProduct = supplementHasAmazonProductLink(s);
              const iHerbPrimary = supplementIHerbHref(s);
              const iHerbSearchOnly = supplementIHerbSearchHref(s);
              const iHerbIsProduct = supplementHasIHerbProductLink(s);
              return (
              <div
                key={s.name}
                className="stackwise-result-card-reveal rounded-xl border border-stone bg-cream/50 p-3"
                style={{ animationDelay: `${520 + idx * 60}ms` }}
              >
                <div className="flex items-start gap-2">
                  {isLocked && (
                    <span className="text-warm-light text-sm mt-0.5 shrink-0 font-mono" aria-hidden>
                      🔒
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-ink text-sm">{s.name}</div>
                    {isLocked ? (
                      <>
                        <div className="text-[10px] font-semibold text-warm-light mt-1 uppercase tracking-wide">
                          Unlock dose, timing &amp; shop links
                        </div>
                        <span className="sr-only">
                          Dose and timing for this supplement are hidden on Free. Upgrade or open your full stack on a paid
                          plan to see details.
                        </span>
                        <div
                          className="text-xs text-warm-mid mt-1 line-clamp-2 select-none opacity-70"
                          aria-hidden
                          style={{ filter: 'blur(4px)' }}
                        >
                          Dose: {s.dosage} · Timing: {s.timing}
                        </div>
                        <button
                          type="button"
                          onClick={() => navigate('/pricing')}
                          className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-ink underline underline-offset-2 decoration-moss/40 hover:text-moss"
                        >
                          <NavIcon kind="pricing" size={13} className="text-ink opacity-90" />
                          <span>Upgrade to unlock</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="text-xs text-warm-mid mt-1">Dose: {s.dosage}</div>
                        <div className="text-xs text-warm-mid">Timing: {s.timing}</div>
                        <div className="mt-2.5 rounded-lg border border-stone/80 bg-surface-elevated/80 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[inset_0_1px_0_rgba(80,160,120,0.12)]">
                          <div className="text-[9px] font-bold uppercase tracking-wider text-warm-mid mb-1.5">Shop</div>
                          <div className="flex flex-wrap gap-2">
                            <a
                              href={amazonPrimary}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex flex-1 min-w-[120px] items-center justify-center rounded-xl min-h-[40px] px-3 py-2 text-xs font-bold text-[#111] bg-amazonOrange shadow-[0_2px_6px_rgba(0,0,0,0.12)] ring-1 ring-black/10 hover:shadow-[0_3px_10px_rgba(255,153,0,0.4)] active:scale-[0.99] transition-all"
                            >
                              {amazonIsProduct ? 'Buy on Amazon' : 'Search Amazon'}
                            </a>
                            <a
                              href={iHerbPrimary}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex flex-1 min-w-[120px] items-center justify-center rounded-xl min-h-[40px] px-3 py-2 text-xs font-bold text-white bg-iHerbGreen shadow-[0_2px_6px_rgba(45,122,58,0.3)] ring-1 ring-white/15 hover:shadow-[0_3px_10px_rgba(45,122,58,0.4)] active:scale-[0.99] transition-all"
                            >
                              {iHerbIsProduct ? 'Buy on iHerb' : 'Search iHerb'}
                            </a>
                          </div>
                          {(amazonIsProduct || iHerbIsProduct) && (
                            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 border-t border-stone/40 pt-2">
                              {amazonIsProduct && (
                                <a href={amazonSearchOnly} target="_blank" rel="noreferrer" className="text-[10px] font-medium text-ink/85 underline underline-offset-2">
                                  Amazon search
                                </a>
                              )}
                              {iHerbIsProduct && (
                                <a href={iHerbSearchOnly} target="_blank" rel="noreferrer" className="text-[10px] font-medium text-ink/85 underline underline-offset-2">
                                  iHerb search
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );})}
          </div>
        </div>

        <div
          className="stackwise-result-block-reveal rounded-2xl border border-stone bg-surface-elevated p-5 sm:p-6 shadow-sm mb-6"
          style={{ animationDelay: `${600 + result.supplements.length * 60}ms` }}
        >
          <h2 className="font-display text-xl sm:text-2xl font-bold text-ink mb-2">Next step</h2>
          <p className="text-sm text-warm-mid leading-relaxed mb-5">
            Pick one action based on what you want to do now.
          </p>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => navigate('/results')}
              className="btn-hub-cta w-full"
            >
              <span className="inline-flex items-center justify-center gap-2">
                <NavIcon kind="stack" size={18} className="text-ink opacity-90" />
                <span>Open full stack guide</span>
              </span>
              <span className="btn-hub-cta-sub">Review full reasoning, schedule, and details</span>
            </button>
            {isBasicOrPro() ? (
              <button
                type="button"
                onClick={() => navigate('/quiz', { state: { quickRebuild: true } })}
                className="inline-flex w-full min-h-[56px] items-center justify-center gap-2 rounded-2xl bg-forest text-on-dark-primary font-bold text-base px-5 hover:bg-forest-light transition-colors shadow-lg ring-2 ring-forest/25"
              >
                <NavIcon kind="rebuild" size={18} className="text-on-dark-primary opacity-95" />
                <span>Build a new stack</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/pricing', { state: { intent: 'rebuild' } })}
                className="inline-flex w-full min-h-[56px] items-center justify-center gap-2 rounded-2xl border-2 border-forest bg-cream text-ink font-bold text-base px-5 hover:bg-moss-light/40 transition-colors shadow-md"
              >
                <NavIcon kind="pricing" size={18} className="text-ink opacity-90" />
                <span>{REBUILD_UPGRADE_CTA}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <ChatWidget stackContext={stackContext} defaultExpanded />
    </div>
  );
}
