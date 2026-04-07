import cron from 'node-cron';
import {
  getActiveReminderTimezones,
  getUsersDueForReminder,
  createCheckinToken,
  createMagicToken,
  cleanExpiredTokens,
} from '../db/index.js';
import { sendEmail, buildReminderEmail } from './emailService.js';
import { appPublicOrigin } from '../config/appPublicUrl.js';

/**
 * Gets current HH:MM in a given IANA timezone string.
 * Returns null if the timezone is invalid.
 */
function getHHMMInTimezone(timezone: string): string | null {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date());
    const h = parts.find((p) => p.type === 'hour')?.value ?? '';
    const m = parts.find((p) => p.type === 'minute')?.value ?? '';
    if (!h || !m) return null;
    return `${h}:${m}`;
  } catch {
    return null;
  }
}

/** Parse the daily schedule from the stored result JSON. */
function parseSchedule(stackJson: string): {
  morning: string[];
  afternoon: string[];
  evening: string[];
  displayName: string | null;
} {
  try {
    const result = JSON.parse(stackJson) as {
      dailySchedule?: { morning?: string[]; afternoon?: string[]; evening?: string[] };
      customerName?: string | null;
    };
    return {
      morning: result.dailySchedule?.morning ?? [],
      afternoon: result.dailySchedule?.afternoon ?? [],
      evening: result.dailySchedule?.evening ?? [],
      displayName: result.customerName ?? null,
    };
  } catch {
    return { morning: [], afternoon: [], evening: [], displayName: null };
  }
}

/** Get today's date in YYYY-MM-DD in a given timezone. */
function getTodayInTimezone(timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    return parts; // en-CA gives YYYY-MM-DD format
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

async function processRemindersForTimezone(timezone: string): Promise<void> {
  const hhmm = getHHMMInTimezone(timezone);
  if (!hhmm) return;

  const users = getUsersDueForReminder(hhmm, timezone);
  if (!users.length) return;

  const appUrl = appPublicOrigin();

  for (const user of users) {
    if (!user.email || !user.reminder_stack_json) continue;

    try {
      const { morning, afternoon, evening, displayName } = parseSchedule(user.reminder_stack_json);
      const today = getTodayInTimezone(timezone);
      const checkinToken = createCheckinToken(user.id, today);
      const checkinUrl = `${appUrl}/api/account/checkin?token=${encodeURIComponent(checkinToken)}`;

      const unsubscribeToken = createMagicToken(user.id);
      const unsubscribeUrl = `${appUrl}/api/account/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;

      const nameToUse = user.display_name ?? displayName;

      const html = buildReminderEmail({
        displayName: nameToUse,
        morningItems: morning,
        afternoonItems: afternoon,
        eveningItems: evening,
        checkinUrl,
        unsubscribeUrl,
        appUrl,
        streak: 0, // streak is stored client-side; server doesn't track it yet
      });

      await sendEmail({
        to: user.email,
        subject: `🐾 Time for your supplements, ${nameToUse?.split(' ')[0] ?? 'friend'}!`,
        html,
      });

      console.log(`[reminder] Sent to ${user.email} (${timezone} ${hhmm})`);
    } catch (err) {
      console.error(`[reminder] Failed for user ${user.id}:`, err);
    }
  }
}

/**
 * Starts the reminder cron job.
 * Runs every minute, checks all active reminder timezones,
 * and sends emails to users whose reminder time matches the current minute.
 */
export function startReminderJob(): void {
  // Run at the start of every minute
  cron.schedule('* * * * *', async () => {
    try {
      // Clean up stale tokens every run (cheap operation)
      cleanExpiredTokens();

      const timezones = getActiveReminderTimezones();
      for (const tz of timezones) {
        await processRemindersForTimezone(tz);
      }
    } catch (err) {
      console.error('[reminder] Cron error:', err);
    }
  });

  console.log('[reminder] Cron job started. Checking reminders every minute.');
}
