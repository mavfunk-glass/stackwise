import { Router } from 'express';
import type { Response } from 'express';
import type Stripe from 'stripe';
import { getActiveSubscription, getActiveTierForUser, getUser, upsertSubscription } from '../db/index.js';
import { requireAuth, requireApiAuth, type AuthedRequest } from '../auth/middleware.js';
import { fetchSubscription, planIdMatchesTier } from '../services/paypal.js';
import {
  getStripe,
  priceIdForTier,
  stripeCheckoutMissingEnv,
  stripeCheckoutReady,
} from '../services/stripeBilling.js';
import { appPublicOrigin } from '../config/appPublicUrl.js';

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
    subscriptionProvider: active?.provider ?? null,
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
      provider: 'paypal',
    });

    const t = getActiveTierForUser(req.userId);
    return res.status(200).json({ ok: true, tier: t, paypalStatus: sub.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Activation failed';
    return res.status(400).json({ error: message });
  }
});

/**
 * POST /api/billing/stripe/checkout-session
 * Returns { url } for hosted Stripe Checkout (subscription).
 */
router.post('/stripe/checkout-session', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    if (!requireApiAuth() || !req.userId) {
      return res.status(400).json({ error: 'Server entitlements are disabled.' });
    }
    if (!stripeCheckoutReady()) {
      return res.status(503).json({
        error: 'Stripe checkout is not configured on the server.',
        missingEnv: stripeCheckoutMissingEnv(),
      });
    }
    const stripe = getStripe();
    if (!stripe) {
      return res.status(503).json({
        error: 'Stripe is not configured.',
        missingEnv: stripeCheckoutMissingEnv(),
      });
    }

    const tier = req.body?.tier === 'pro' ? 'pro' : req.body?.tier === 'basic' ? 'basic' : null;
    if (!tier) {
      return res.status(400).json({ error: 'Missing or invalid tier.' });
    }

    const priceId = priceIdForTier(tier);
    if (!priceId) {
      return res.status(503).json({ error: 'Stripe price IDs are not set.' });
    }

    const appUrl = appPublicOrigin();

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/pricing?stripe_success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing?stripe_cancel=1`,
      client_reference_id: req.userId,
      metadata: { userId: req.userId, tier },
      subscription_data: {
        metadata: { userId: req.userId, tier },
      },
    });

    if (!session.url) {
      return res.status(500).json({ error: 'Stripe did not return a checkout URL.' });
    }

    return res.status(200).json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Checkout failed';
    return res.status(400).json({ error: message });
  }
});

/**
 * POST /api/billing/stripe/confirm
 * After redirect from Checkout; verifies session belongs to user and syncs subscription row.
 */
router.post('/stripe/confirm', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    if (!requireApiAuth() || !req.userId) {
      return res.status(400).json({ error: 'Server entitlements are disabled.' });
    }
    const stripe = getStripe();
    if (!stripe || !stripeCheckoutReady()) {
      return res.status(503).json({
        error: 'Stripe is not configured.',
        missingEnv: stripeCheckoutMissingEnv(),
      });
    }

    const sessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId.trim() : '';
    if (!sessionId || !sessionId.startsWith('cs_')) {
      return res.status(400).json({ error: 'Missing or invalid sessionId.' });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    if (session.client_reference_id !== req.userId) {
      return res.status(403).json({ error: 'This checkout session does not belong to your account.' });
    }

    if (session.status !== 'complete') {
      return res.status(400).json({ error: 'Checkout is not complete yet.' });
    }

    const tier = session.metadata?.tier === 'pro' ? 'pro' : session.metadata?.tier === 'basic' ? 'basic' : null;
    const subRef = session.subscription;
    let fullSub: Stripe.Subscription;
    if (typeof subRef === 'string') {
      fullSub = await stripe.subscriptions.retrieve(subRef);
    } else if (subRef && typeof subRef === 'object' && 'id' in subRef) {
      fullSub = subRef as Stripe.Subscription;
    } else {
      return res.status(400).json({ error: 'Could not read subscription from session.' });
    }

    if (!tier) {
      return res.status(400).json({ error: 'Could not read plan tier from session.' });
    }

    const priceId = fullSub.items.data[0]?.price?.id ?? null;

    upsertSubscription({
      paypal_subscription_id: fullSub.id,
      user_id: req.userId,
      tier,
      status: fullSub.status,
      plan_id: priceId,
      provider: 'stripe',
    });

    const t = getActiveTierForUser(req.userId);
    return res.status(200).json({ ok: true, tier: t });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Confirm failed';
    return res.status(400).json({ error: message });
  }
});

export default router;
