import { Router } from 'express';
import type { Request, Response } from 'express';
import {
  createUser,
  getUserByEmail,
  createMagicToken,
  verifyAndConsumeMagicToken,
  setUserEmail,
  cleanExpiredTokens,
} from '../db/index.js';
import { signSessionToken, verifySessionToken } from '../auth/jwt.js';
import { formatResendApiError } from '../services/emailService.js';
import { appPublicOrigin } from '../config/appPublicUrl.js';

const router = Router();

const bootstrapCounts = new Map<string, number[]>();
const BOOTSTRAP_MAX_PER_HOUR = Number(process.env.STACKWISE_SESSION_MAX_PER_IP_PER_HOUR ?? 40);

function clientIp(req: Request): string {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.trim()) return xf.split(',')[0]?.trim() ?? 'unknown';
  return req.socket.remoteAddress ?? 'unknown';
}

function allowBootstrap(ip: string): boolean {
  const now = Date.now();
  const hour = 60 * 60 * 1000;
  let hits = bootstrapCounts.get(ip) ?? [];
  hits = hits.filter((t) => now - t < hour);
  if (hits.length >= BOOTSTRAP_MAX_PER_HOUR) return false;
  hits.push(now);
  bootstrapCounts.set(ip, hits);
  return true;
}

/** Creates an anonymous user row and returns a long-lived JWT. */
router.post('/session', async (req, res) => {
  try {
    const ip = clientIp(req);
    if (!allowBootstrap(ip)) {
      return res.status(429).json({ error: 'Too many sessions from this network. Try again later.' });
    }
    const userId = createUser();
    const token = await signSessionToken(userId);
    return res.status(200).json({ token, userId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
});

/**
 * POST /api/auth/magic-link
 * Body: { email: string, displayName?: string }
 * Creates/finds user by email, sends a magic link via Resend.
 */
router.post('/magic-link', async (req, res) => {
  try {
    const body = req.body as { email?: unknown; displayName?: unknown };
    const rawEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!rawEmail || !rawEmail.includes('@') || rawEmail.length < 5) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }
    const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : undefined;

    let userId: string;
    const existing = getUserByEmail(rawEmail);
    if (existing) {
      userId = existing.id;
    } else {
      const hdr = req.headers.authorization;
      if (hdr?.startsWith('Bearer ')) {
        const verified = await verifySessionToken(hdr.slice(7).trim());
        if (verified?.sub) {
          setUserEmail(verified.sub, rawEmail, displayName);
          userId = verified.sub;
        } else {
          userId = createUser();
          setUserEmail(userId, rawEmail, displayName);
        }
      } else {
        userId = createUser();
        setUserEmail(userId, rawEmail, displayName);
      }
    }

    cleanExpiredTokens();

    const token = createMagicToken(userId);
    const appUrl = appPublicOrigin();
    const magicUrl = `${appUrl}/auth/verify?token=${encodeURIComponent(token)}`;

    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'stacky@stack-wise.org';

    if (!resendKey) {
      // eslint-disable-next-line no-console
      console.log(`[magic-link] DEV MODE. Magic link: ${magicUrl}`);
      return res.status(200).json({ ok: true, dev_url: magicUrl, message: 'Dev mode: see server console for link.' });
    }

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Stacky at StackWise <${fromEmail}>`,
        to: [rawEmail],
        subject: 'Your StackWise sign-in link',
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #F9F6F1;">
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="font-size: 48px; margin-bottom: 8px;">🐱</div>
              <div style="font-family: Georgia, serif; font-size: 24px; font-weight: 300; color: #1C3A2E; font-style: italic;">
                Hey${displayName ? `, ${displayName.split(' ')[0]}` : ''}! Stacky here.
              </div>
            </div>
            <p style="color: #6B5B4E; font-size: 15px; line-height: 1.6; text-align: center; margin-bottom: 28px;">
              Click the button below to access your StackWise account and pick up where you left off. This link expires in 15 minutes.
            </p>
            <div style="text-align: center; margin-bottom: 24px;">
              <a href="${magicUrl}"
                style="display: inline-block; background: #1C3A2E; color: #F9F6F1; font-size: 16px; font-weight: 600; padding: 16px 36px; border-radius: 100px; text-decoration: none;">
                Open my stack →
              </a>
            </div>
            <p style="color: #C4B9AC; font-size: 12px; text-align: center; line-height: 1.5;">
              If you didn't request this, you can safely ignore it. No account changes will be made.<br/>
              This link can only be used once and expires in 15 minutes.<br/>
              StackWise · 3101 Borgata Way · El Dorado Hills, CA 95762
            </p>
          </div>
        `,
      }),
    });

    if (!emailRes.ok) {
      const errData = await emailRes.json().catch(() => ({}));
      const detail = formatResendApiError(errData);
      // eslint-disable-next-line no-console
      console.error('[magic-link] Resend HTTP', emailRes.status, detail);
      return res.status(500).json({
        error: 'Failed to send email. Please try again.',
        /** Resend message (domain verification, invalid from, etc.) — shown in UI for debugging */
        detail,
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
});

/**
 * GET /api/auth/verify?token=xxx
 * Validates magic token, returns a JWT for that account.
 */
router.get('/verify', async (req, res) => {
  try {
    const token = typeof req.query.token === 'string' ? req.query.token.trim() : '';
    if (!token) {
      return res.status(400).json({ error: 'Missing token.' });
    }
    const userId = verifyAndConsumeMagicToken(token);
    if (!userId) {
      return res.status(400).json({ error: 'This link has expired or already been used. Request a new one.' });
    }
    const jwt = await signSessionToken(userId);
    return res.status(200).json({ token: jwt, userId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
});

export default router;
