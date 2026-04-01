import { Router } from 'express';
import type { Response } from 'express';
import { getActiveSubscription, getActiveTierForUser, getUser, upsertSubscription } from '../db/index.js';
import { requireAuth, requireApiAuth, type AuthedRequest } from '../auth/middleware.js';
import { fetchSubscription, planIdMatchesTier } from '../services/paypal.js';

const router = Router();

/** GET /api/billing/me: current subscription tier from PayPal-backed DB */
router.get('/me', requireAuth, (req: AuthedRequest, res: Response) => {
  if (!requireApiAuth() || !req.userId) {
    return res.status(200).json({ tier: 'free', subscriptionActive: false, serverEntitlements: false });
  }
  const u = getUser(req.userId);
  if (!u) return res.status(404).json({ error: 'User not found.' });
  const tier = getActiveTierForUser(req.userId);
  const active = getActiveSubscription(req.userId);
  return res.status(200).json({
    tier,
    subscriptionActive: tier === 'basic' || tier === 'pro',
    stackGenerations: u.stack_generations,
    serverEntitlements: true,
    paypalSubscriptionId: active?.paypal_subscription_id ?? null,
    activatedAt: active ? new Date(active.updated_at).toISOString() : null,
  });
});

/**
 * POST /api/billing/activate
 * After PayPal checkout, client sends subscription id; server verifies with PayPal API and stores in SQLite.
 */
router.post('/activate', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    if (!requireApiAuth() || !req.userId) {
      return res.status(400).json({ error: 'Server entitlements are disabled.' });
    }
    const body = req.body as { subscriptionId?: unknown; tier?: unknown };
    const subscriptionId = typeof body.subscriptionId === 'string' ? body.subscriptionId.trim() : '';
    const tier = body.tier === 'pro' ? 'pro' : body.tier === 'basic' ? 'basic' : null;
    if (!subscriptionId || !tier) {
      return res.status(400).json({ error: 'Missing subscriptionId or tier.' });
    }

    const sub = await fetchSubscription(subscriptionId);
    if (!planIdMatchesTier(sub.plan_id, tier)) {
      return res.status(400).json({ error: 'Subscription plan does not match selected tier.' });
    }

    const allowed = new Set(['ACTIVE', 'APPROVED']);
    if (!allowed.has(sub.status)) {
      return res.status(400).json({ error: `Subscription status is ${sub.status}, not active.` });
    }

    upsertSubscription({
      paypal_subscription_id: subscriptionId,
      user_id: req.userId,
      tier,
      status: sub.status,
      plan_id: sub.plan_id ?? null,
    });

    const t = getActiveTierForUser(req.userId);
    return res.status(200).json({ ok: true, tier: t, paypalStatus: sub.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Activation failed';
    return res.status(400).json({ error: message });
  }
});

export default router;
