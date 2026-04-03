import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StackyCat from '../components/StackyCat';
import {
  getAccountabilityState,
  getTodayCheckIn,
  recordCheckIn,
  getReminderTime,
  setReminderTime,
  loadStoredState,
  isPro,
  isBasicOrPro,
  getSubscriptionTier,
} from '../types/storage';
import { saveReminderToServer, fetchAccountMe } from '../api/session';
import { isRhythmLineLockedForFreeTier } from '../utils/scheduleLineGating';
import { NavIcon } from '../copy/navWayfinding';

function StreakRing({ streak }: { streak: number }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center"
        style={{
          background: streak > 0
            ? 'linear-gradient(135deg, #1C3A2E, #4A7C59)'
            : '#F0EBE3',
          border: streak > 0 ? 'none' : '2px solid #E8E0D5',
        }}
      >
        <div className="text-center">
          <div
            className="font-serif font-light leading-none"
            style={{ fontSize: 28, color: streak > 0 ? '#F9F6F1' : '#C4B9AC' }}
          >
            {streak}
          </div>
          <div
            className="text-xs font-medium"
            style={{ color: streak > 0 ? 'rgba(249,246,241,0.7)' : '#C4B9AC' }}
          >
            day{streak !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </div>
  );
}

function Last7Days({ checkins }: { checkins: { date: string; completed: boolean }[] }) {
  const days = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const done = checkins.some((c) => c.date === dateStr && c.completed);
    const isToday = i === 0;
    days.push({ dateStr, done, isToday });
  }
  return (
    <div className="flex gap-1.5 justify-center">
      {days.map(({ dateStr, done, isToday }) => (
        <div key={dateStr} className="flex flex-col items-center gap-1">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{
              background: done ? '#1C3A2E' : isToday ? '#F0F5F2' : '#F0EBE3',
              border: isToday && !done ? '1.5px dashed #4A7C59' : 'none',
            }}
          >
            {done && (
              <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                <path d="M1 4L4.5 7.5L11 1" stroke="#F9F6F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
          <div className="text-[9px] font-medium" style={{ color: '#C4B9AC' }}>
            {new Date(`${dateStr}T12:00:00`).toLocaleDateString('en', { weekday: 'narrow' })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const tier = getSubscriptionTier();
  const [mood, setMood] = useState<1|2|3|4|5|null>(null);
  const [checkedIn, setCheckedIn] = useState(false);
  const [reminderTime, setReminderTimeLocal] = useState(getReminderTime() ?? '');
  const [reminderSaved, setReminderSaved] = useState(false);
  const [reminderEmailRequired, setReminderEmailRequired] = useState(false);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [reminderServerSaved, setReminderServerSaved] = useState(false);

  useEffect(() => {
    void fetchAccountMe().then(({ user }) => {
      if (user?.email) setAccountEmail(user.email);
      if (user?.reminderTime) setReminderTimeLocal(user.reminderTime);
    });
  }, []);

  const accountability = useMemo(() => getAccountabilityState(), [checkedIn]);
  const todayDone = getTodayCheckIn()?.completed ?? false;
  const { result } = useMemo(() => {
    try { return loadStoredState(); } catch { return { result: null }; }
  }, []);

  const MOODS = [
    { val: 1 as const, emoji: '😔', label: 'Rough' },
    { val: 2 as const, emoji: '😕', label: 'Low' },
    { val: 3 as const, emoji: '😐', label: 'Ok' },
    { val: 4 as const, emoji: '🙂', label: 'Good' },
    { val: 5 as const, emoji: '😊', label: 'Great' },
  ];

  function handleCheckIn() {
    if (!mood) return;
    recordCheckIn(mood);
    setCheckedIn(true);
  }

  async function handleSaveReminder() {
    if (!reminderTime) return;
    setReminderTime(reminderTime);
    setReminderSaved(true);
    setTimeout(() => setReminderSaved(false), 2000);
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    if (isBasicOrPro() && result) {
      const stackJson = JSON.stringify(result);
      const serverResult = await saveReminderToServer(reminderTime, stackJson, true);
      if (serverResult.emailRequired) {
        setReminderEmailRequired(true);
      } else if (serverResult.ok) {
        setReminderServerSaved(true);
        setTimeout(() => setReminderServerSaved(false), 3000);
      }
    }
  }

  return (
    <div className="min-h-screen bg-sw-bg text-warm pb-12">

      {/* Nav */}
      <div
        className="sticky top-0 z-40 px-5"
        style={{
          background: 'rgba(249,246,241,0.95)',
          backdropFilter: 'blur(12px)',
          paddingTop: 'max(14px, env(safe-area-inset-top, 14px))',
          paddingBottom: 14,
          borderBottom: '1px solid #E8E0D5',
        }}
      >
        <div className="max-w-lg mx-auto flex items-center justify-between gap-2 flex-wrap">
          <button
            onClick={() => navigate('/landing')}
            className="inline-flex items-center gap-1.5 font-serif font-light tracking-widest text-sm"
            style={{ color: '#1C3A2E', letterSpacing: '0.15em' }}
          >
            <NavIcon kind="home" size={17} className="text-ink opacity-90" />
            <span>STACKWISE</span>
          </button>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
            {tier !== 'free' && (
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: '#F0F5F2', color: '#1C3A2E', border: '1px solid #D4E8DA' }}
              >
                {tier.toUpperCase()}
              </span>
            )}
            <button
              onClick={() => navigate('/results')}
              className="inline-flex items-center gap-1 text-xs font-medium"
              style={{ color: '#9C8E84' }}
            >
              <NavIcon kind="stack" size={15} className="opacity-90" />
              <span>My stack</span>
            </button>
            <button
              onClick={() => navigate('/coach')}
              className="inline-flex items-center gap-1 text-xs font-medium"
              style={{ color: '#9C8E84' }}
            >
              <NavIcon kind="hub" size={15} className="opacity-90" />
              <span>Stack Hub</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 pt-6 space-y-4">

        {/* Greeting */}
        <div>
          <h1 className="font-serif font-light" style={{ fontSize: 28, color: '#1C3A2E', letterSpacing: '-0.01em' }}>
            Your Daily Check-in
          </h1>
          <p className="text-sm mt-1" style={{ color: '#9C8E84' }}>
            {new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Stacky greeting, mood reacts to streak */}
        {(() => {
          const streak = accountability.currentStreak;
          const mood =
            streak === 0
              ? ('sad' as const)
              : streak >= 7
                ? ('flex' as const)
                : streak >= 3
                  ? ('happy' as const)
                  : ('wave' as const);
          const outfit = streak >= 7 ? ('superhero' as const) : ('default' as const);
          const bubble =
            streak === 0
              ? "Check in today to start your streak! Every day counts. 🐾"
              : streak >= 7
                ? `${streak} days strong, you're unstoppable! 🔥`
                : streak >= 3
                  ? `${streak} day streak! Keep the momentum going. 🐾`
                  : "Good start! Check in every day to build your streak. 🐾";
          return (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14 }}>
              <StackyCat
                mood={mood}
                outfit={outfit}
                size={80}
                animate={streak >= 7}
                bubble={bubble}
                bubblePosition="right"
              />
            </div>
          );
        })()}

        {/* Streak card */}
        <div
          className="rounded-2xl p-5"
          style={{ background: '#FFFFFF', border: '1px solid #E8E0D5' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#9C8E84' }}>
                Current streak
              </div>
              <div className="font-serif font-light mt-0.5" style={{ fontSize: 22, color: '#1C3A2E' }}>
                {accountability.currentStreak} day{accountability.currentStreak !== 1 ? 's' : ''}
              </div>
            </div>
            <StreakRing streak={accountability.currentStreak} />
          </div>
          <Last7Days checkins={accountability.checkins} />
          <div className="mt-3 flex justify-center gap-6 text-xs" style={{ color: '#9C8E84' }}>
            <span>Best: <strong style={{ color: '#1C3A2E' }}>{accountability.longestStreak}d</strong></span>
            <span>Total: <strong style={{ color: '#1C3A2E' }}>{accountability.totalCheckins}</strong></span>
          </div>
        </div>

        {/* Check-in widget */}
        {!isBasicOrPro() ? (
          <div
            className="rounded-2xl p-5 text-center"
            style={{ background: '#1C3A2E' }}
          >
            <div className="font-serif font-light text-xl mb-2" style={{ color: '#F9F6F1' }}>
              Unlock daily check-ins
            </div>
            <p className="text-sm mb-4" style={{ color: 'rgba(249,246,241,0.82)' }}>
              Track your supplement consistency and build the habit loop that actually gets results.
            </p>
            <button
              onClick={() => navigate('/pricing')}
              className="btn-primary"
              style={{ maxWidth: 220, margin: '0 auto', height: 46, fontSize: 14 }}
            >
              Upgrade to Basic: $9/mo
            </button>
          </div>
        ) : todayDone || checkedIn ? (
          <div
            className="rounded-2xl p-5 text-center"
            style={{ background: '#F0F5F2', border: '1px solid #D4E8DA' }}
          >
            <div className="text-3xl mb-2">✓</div>
            <div className="font-serif font-light text-lg" style={{ color: '#1C3A2E' }}>
              Checked in for today
            </div>
            <p className="text-sm mt-1" style={{ color: '#7B9E87' }}>
              Keep the streak going. See you tomorrow.
            </p>
          </div>
        ) : (
          <div
            className="rounded-2xl p-5"
            style={{ background: '#FFFFFF', border: '1px solid #E8E0D5' }}
          >
            <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#9C8E84' }}>
              Today's check-in
            </div>
            <div className="font-serif font-light mb-4" style={{ fontSize: 18, color: '#1C3A2E' }}>
              Did you take your supplements?
            </div>
            <div className="mb-4">
              <div className="text-xs font-medium mb-2" style={{ color: '#9C8E84' }}>How are you feeling today?</div>
              <div className="flex gap-2">
                {MOODS.map((m) => (
                  <button
                    key={m.val}
                    type="button"
                    onClick={() => setMood(m.val)}
                    className="flex-1 flex flex-col items-center py-2.5 rounded-xl border transition-all"
                    style={{
                      border: mood === m.val ? '1.5px solid #1C3A2E' : '1.5px solid #E8E0D5',
                      background: mood === m.val ? '#F0F5F2' : '#FDFCFA',
                    }}
                  >
                    <span style={{ fontSize: 20 }}>{m.emoji}</span>
                    <span className="text-[10px] mt-0.5 font-medium" style={{ color: mood === m.val ? '#1C3A2E' : '#9C8E84' }}>
                      {m.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={handleCheckIn}
              disabled={!mood}
              className="btn-primary w-full"
              style={{ height: 50, opacity: mood ? 1 : 0.4 }}
            >
              Check in: I took my supplements ✓
            </button>
          </div>
        )}

        {/* Today's stack */}
        {result && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid #E8E0D5' }}
          >
            <div
              className="px-4 py-3 flex items-center justify-between"
              style={{ background: '#FDFCFA', borderBottom: '1px solid #F0EBE3' }}
            >
              <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#9C8E84' }}>
                Today's plan
              </div>
              <button
                onClick={() => navigate('/results')}
                className="inline-flex items-center gap-1 text-xs font-medium"
                style={{ color: '#4A7C59' }}
              >
                <NavIcon kind="stack" size={14} className="opacity-90" />
                <span>Full stack</span>
              </button>
            </div>
            {(['morning', 'afternoon', 'evening'] as const).map((period) => {
              const items = result.dailySchedule[period];
              if (!items.length) return null;
              const icons = { morning: '🌅', afternoon: '☀️', evening: '🌙' };
              const blurRhythmLocked = !isBasicOrPro() && result.supplements.length > 2;
              return (
                <div key={period} className="px-4 py-3 border-b border-gray-50 last:border-0" style={{ background: '#fff' }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span style={{ fontSize: 13 }}>{icons[period]}</span>
                    <span className="text-xs font-semibold capitalize" style={{ color: '#6B5B4E' }}>{period}</span>
                  </div>
                  <div className="space-y-1">
                    {items.map((item) => {
                      const lineLocked = blurRhythmLocked && isRhythmLineLockedForFreeTier(item, result.supplements);
                      return (
                        <div key={item} className="text-xs leading-relaxed" style={{ color: '#9C8E84' }}>
                          {lineLocked ? (
                            <>
                              <span className="sr-only">
                                Timing for a supplement in your plan is hidden on Free. Upgrade to see full daily rhythm.
                              </span>
                              <span aria-hidden className="block select-none opacity-70" style={{ color: '#9C8E84', filter: 'blur(4px)' }}>
                                {item}
                              </span>
                            </>
                          ) : (
                            item
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Reminder setup */}
        <div
          className="rounded-2xl p-5"
          style={{ background: '#FFFFFF', border: '1px solid #E8E0D5' }}
        >
          <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#9C8E84' }}>
            Daily reminder
          </div>
          <p className="text-sm mb-1" style={{ color: '#6B5B4E' }}>
            {isBasicOrPro()
              ? 'Set a time and Stacky will email you your daily schedule.'
              : 'Upgrade to Basic or Pro to get daily email reminders.'}
          </p>
          {isBasicOrPro() && accountEmail && (
            <p className="text-xs mb-3" style={{ color: '#4A7C59' }}>
              Reminders will be sent to <strong>{accountEmail}</strong>
            </p>
          )}

          {isBasicOrPro() ? (
            <>
              <div className="flex gap-3 mt-3">
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTimeLocal(e.target.value)}
                  className="flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium"
                  style={{
                    borderColor: '#E8E0D5',
                    background: '#FDFCFA',
                    color: '#3D2E22',
                    fontFamily: 'Figtree, system-ui, sans-serif',
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    void handleSaveReminder();
                  }}
                  disabled={!reminderTime}
                  className="px-5 rounded-xl font-semibold text-sm transition-all"
                  style={{
                    background: reminderSaved ? '#4A7C59' : '#1C3A2E',
                    color: '#F9F6F1',
                    minHeight: 44,
                    opacity: reminderTime ? 1 : 0.4,
                  }}
                >
                  {reminderSaved ? '✓ Saved' : 'Set'}
                </button>
              </div>

              {reminderServerSaved && (
                <p className="text-xs mt-2" style={{ color: '#4A7C59' }}>
                  ✓ Email reminder saved. Stacky will email you at {reminderTime} each day.
                </p>
              )}

              {reminderEmailRequired && (
                <div
                  className="rounded-xl px-4 py-3 mt-3"
                  style={{ background: '#FFF8F0', border: '1px solid #F0D9BE' }}
                >
                  <p className="text-xs font-semibold mb-1" style={{ color: '#8A5C2E' }}>
                    Email needed for reminders
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: '#8A5C2E' }}>
                    Save your stack with an email first (on the results page) to receive email reminders.
                  </p>
                </div>
              )}

              {!reminderEmailRequired && !accountEmail && reminderSaved && (
                <p className="text-xs mt-2" style={{ color: '#C4B9AC' }}>
                  To get email reminders, save your stack with your email on the results page.
                </p>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/pricing')}
              className="mt-3 w-full rounded-full font-semibold text-sm transition-all"
              style={{ background: '#1C3A2E', color: '#F9F6F1', height: 46 }}
            >
              Upgrade to get email reminders →
            </button>
          )}
        </div>

        {/* Pro CTA if not pro */}
        {!isPro() && (
          <div
            className="rounded-2xl p-5"
            style={{ background: '#1C3A2E' }}
          >
            <div className="font-serif font-light text-xl mb-1" style={{ color: '#F9F6F1' }}>
              Get ongoing guidance as your stack evolves.
            </div>
            <p className="text-sm mb-4 leading-relaxed" style={{ color: 'rgba(249,246,241,0.82)' }}>
              Ask questions about your plan, sanity-check new products against the hype, and rebuild as your goals change. Ongoing clarity for less than most single supplements per month.
            </p>
            <button
              onClick={() => navigate('/pricing')}
              className="w-full rounded-full font-semibold text-sm transition-all"
              style={{ background: '#F9F6F1', color: '#1C3A2E', height: 48 }}
            >
              Upgrade to Pro: $19/mo →
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
