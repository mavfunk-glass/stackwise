import { Router } from 'express';
import type { Response } from 'express';
import {
  getActiveStack,
  getUser,
  saveStack,
  getActiveTierForUser,
  setUserReminder,
  verifyAndConsumeCheckinToken,
} from '../db/index.js';
import { requireAuth, requireApiAuth, type AuthedRequest } from '../auth/middleware.js';

const router = Router();

// ── Reminder settings ──────────────────────────────────────────────────────

/**
 * POST /api/account/reminder
 * Saves reminder time, timezone, and current stack for a Basic/Pro user.
 * Body: { reminderTime: "HH:MM", timezone: string, stackJson: string, enabled: boolean }
 */
router.post('/reminder', requireAuth, (req: AuthedRequest, res: Response) => {
  if (!requireApiAuth() || !req.userId) {
    return res.status(200).json({ ok: true, skipped: true });
  }
  try {
    const tier = getActiveTierForUser(req.userId);
    if (tier === 'free') {
      return res.status(403).json({ error: 'Email reminders require Basic or Pro.' });
    }

    const body = req.body as {
      reminderTime?: unknown;
      timezone?: unknown;
      stackJson?: unknown;
      enabled?: unknown;
    };

    const reminderTime = typeof body.reminderTime === 'string' ? body.reminderTime.trim() : '';
    const timezone = typeof body.timezone === 'string' ? body.timezone.trim() : 'UTC';
    const stackJson = typeof body.stackJson === 'string' ? body.stackJson : '';
    const enabled = body.enabled !== false; // default true

    if (!reminderTime || !/^\d{2}:\d{2}$/.test(reminderTime)) {
      return res.status(400).json({ error: 'reminderTime must be HH:MM format.' });
    }
    if (!stackJson) {
      return res.status(400).json({ error: 'stackJson is required.' });
    }

    const user = getUser(req.userId);
    if (!user?.email) {
      return res.status(400).json({
        error: 'EMAIL_REQUIRED',
        message: 'You need to save your email first to receive reminders.',
      });
    }

    setUserReminder(req.userId, reminderTime, timezone, stackJson, enabled);
    return res.status(200).json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
});

// ── One-click check-in from email ──────────────────────────────────────────

/**
 * GET /api/account/checkin?token=xxx
 * Validates a check-in token from the reminder email and records the check-in.
 * Redirects to the app on success.
 */
router.get('/checkin', async (req, res) => {
  const token = typeof req.query.token === 'string' ? req.query.token.trim() : '';
  const appUrl = process.env.APP_URL ?? 'http://localhost:5173';

  if (!token) {
    return res.redirect(`${appUrl}/?checkin=invalid`);
  }

  const result = verifyAndConsumeCheckinToken(token);
  if (!result) {
    return res.redirect(`${appUrl}/?checkin=expired`);
  }

  console.log(`[checkin] User ${result.userId} checked in for ${result.date}`);

  return res.redirect(`${appUrl}/dashboard?checkin=done&date=${encodeURIComponent(result.date)}`);
});

// ── Stack save + restore ───────────────────────────────────────────────────

/**
 * POST /api/account/stack/save
 * Saves the current stack to the database for authenticated users.
 * Body: { quizJson: string, resultJson: string, label?: string }
 */
router.post('/stack/save', requireAuth, (req: AuthedRequest, res: Response) => {
  if (!requireApiAuth() || !req.userId) {
    return res.status(200).json({ ok: true, skipped: true });
  }
  try {
    const body = req.body as { quizJson?: unknown; resultJson?: unknown; label?: unknown };
    const quizJson = typeof body.quizJson === 'string' ? body.quizJson : '';
    const resultJson = typeof body.resultJson === 'string' ? body.resultJson : '';
    const label = typeof body.label === 'string' ? body.label.trim() : undefined;

    if (!resultJson) {
      return res.status(400).json({ error: 'Missing resultJson.' });
    }
    const stackId = saveStack(req.userId, quizJson, resultJson, label);
    return res.status(200).json({ ok: true, stackId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
});

/**
 * GET /api/account/stack/restore
 * Returns the user's most recent active stack from the database.
 */
router.get('/stack/restore', requireAuth, (req: AuthedRequest, res: Response) => {
  if (!requireApiAuth() || !req.userId) {
    return res.status(200).json({ stack: null });
  }
  try {
    const stack = getActiveStack(req.userId);
    if (!stack) {
      return res.status(200).json({ stack: null });
    }
    return res.status(200).json({
      stack: {
        id: stack.id,
        label: stack.label,
        createdAt: new Date(stack.created_at).toISOString(),
        quiz: stack.quiz_json ? JSON.parse(stack.quiz_json) : null,
        result: JSON.parse(stack.result_json),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
});

/**
 * GET /api/account/me
 * Returns the current user's profile (email, display name, tier, stack count).
 */
router.get('/me', requireAuth, (req: AuthedRequest, res: Response) => {
  if (!requireApiAuth() || !req.userId) {
    return res.status(200).json({ user: null });
  }
  try {
    const user = getUser(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        emailVerified: !!user.email_verified,
        chatMessagesUsed: user.chat_messages_used,
        stackGenerations: user.stack_generations,
        createdAt: new Date(user.created_at).toISOString(),
        reminderTime: user.reminder_time,
        reminderTimezone: user.reminder_timezone,
        reminderEnabled: !!user.reminder_enabled,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
});

/**
 * POST /api/account/unsubscribe
 * One-click unsubscribe from reminder emails via token in email link.
 * Body: { token: string }
 */
router.post('/unsubscribe', async (req, res) => {
  try {
    const body = req.body as { token?: unknown };
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    if (!token) {
      return res.status(400).json({ error: 'Missing token.' });
    }
    const { verifyAndConsumeMagicToken, setUserReminder, getUser } = await import('../db/index.js');
    const userId = verifyAndConsumeMagicToken(token);
    if (!userId) {
      return res.status(400).json({ error: 'This unsubscribe link has expired or already been used.' });
    }
    const user = getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    if (user.reminder_time && user.reminder_timezone && user.reminder_stack_json) {
      setUserReminder(userId, user.reminder_time, user.reminder_timezone, user.reminder_stack_json, false);
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
});

/**
 * GET /api/account/unsubscribe?token=xxx
 * Redirects to the client unsubscribe page (handles prefetch-safe GET).
 */
router.get('/unsubscribe', (req, res) => {
  const token = typeof req.query.token === 'string' ? req.query.token.trim() : '';
  const appUrl = process.env.APP_URL ?? 'http://localhost:5173';
  return res.redirect(`${appUrl}/unsubscribe?token=${encodeURIComponent(token)}`);
});

export default router;
