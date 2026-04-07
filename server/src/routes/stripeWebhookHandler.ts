import type { Request, Response } from 'express';
import Stripe from 'stripe';
import { getStripe } from '../services/stripeBilling.js';
import { getSubscriptionByPayPalId, getUser, upsertSubscription } from '../db/index.js';
import { sendEmail, buildWinBackEmail } from '../services/emailService.js';

/**
 * POST /api/webhooks/stripe — raw JSON body. Register before express.json().
 */
export default async function stripeWebhookHandler(req: Request, res: Response): Promise<void> {
  const stripe = getStripe();
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!stripe || !whSecret) {
    // eslint-disable-next-line no-console
    console.warn('[stripe webhook] STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET not set');
    res.status(503).json({ error: 'Stripe webhooks not configured' });
    return;
  }

  const buf = req.body as Buffer;
  if (!Buffer.isBuffer(buf) || buf.length === 0) {
    res.status(400).json({ error: 'Empty body' });
    return;
  }

  const sig = req.headers['stripe-signature'];
  if (typeof sig !== 'string' || !sig) {
    res.status(400).json({ error: 'Missing stripe-signature' });
    return;
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, whSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Invalid signature';
    // eslint-disable-next-line no-console
    console.error('[stripe webhook] verify failed:', msg);
    res.status(400).json({ error: 'Invalid signature' });
    return;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id?.trim();
        const tierRaw = session.metadata?.tier;
        const tier = tierRaw === 'pro' ? 'pro' : tierRaw === 'basic' ? 'basic' : null;
        const subId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription && typeof session.subscription === 'object'
              ? (session.subscription as Stripe.Subscription).id
              : null;

        if (userId && tier && subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          const priceId = sub.items.data[0]?.price?.id ?? null;
          upsertSubscription({
            paypal_subscription_id: subId,
            user_id: userId,
            tier,
            status: sub.status,
            plan_id: priceId,
            provider: 'stripe',
          });
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subObj = event.data.object as Stripe.Subscription;
        const subId = subObj.id;
        const existing = getSubscriptionByPayPalId(subId);
        if (existing && existing.provider === 'stripe') {
          upsertSubscription({
            paypal_subscription_id: subId,
            user_id: existing.user_id,
            tier: existing.tier,
            status: subObj.status,
            plan_id: subObj.items.data[0]?.price?.id ?? existing.plan_id,
            provider: 'stripe',
          });

          const cancelStatuses = new Set(['canceled', 'unpaid', 'incomplete_expired']);
          if (cancelStatuses.has(subObj.status)) {
            const user = getUser(existing.user_id);
            if (user?.email) {
              const appUrl = process.env.APP_URL ?? 'https://stack-wise.org';
              const html = buildWinBackEmail({
                displayName: user.display_name,
                tier: existing.tier,
                appUrl,
              });
              sendEmail({
                to: user.email,
                subject: `${user.display_name?.split(' ')[0] ?? 'Hey'}, your StackWise plan was cancelled`,
                html,
              }).catch((err: unknown) => {
                // eslint-disable-next-line no-console
                console.error('[stripe webhook] win-back email failed:', err);
              });
            }
          }
        }
        break;
      }
      default:
        break;
    }

    res.status(200).json({ received: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[stripe webhook]', err);
    res.status(500).json({ error: 'Webhook handler error' });
  }
}
