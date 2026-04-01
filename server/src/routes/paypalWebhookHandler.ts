import type { Request, Response } from 'express';
import { getSubscriptionByPayPalId, upsertSubscription } from '../db/index.js';
import { verifyWebhookSignature } from '../services/paypal.js';

/**
 * Use with: app.post('/api/webhooks/paypal', express.raw({ type: 'application/json' }), paypalWebhookHandler)
 * Must be registered BEFORE express.json().
 */
export default async function paypalWebhookHandler(req: Request, res: Response): Promise<void> {
  try {
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    if (!webhookId) {
      // eslint-disable-next-line no-console
      console.warn('[webhook] PAYPAL_WEBHOOK_ID not set; skipping verification');
      res.status(200).send();
      return;
    }

    const buf = req.body as Buffer;
    if (!Buffer.isBuffer(buf) || buf.length === 0) {
      res.status(400).json({ error: 'Empty body' });
      return;
    }

    const transmissionId = req.headers['paypal-transmission-id'] as string | undefined;
    const transmissionTime = req.headers['paypal-transmission-time'] as string | undefined;
    const certUrl = req.headers['paypal-cert-url'] as string | undefined;
    const authAlgo = req.headers['paypal-auth-algo'] as string | undefined;
    const transmissionSig = req.headers['paypal-transmission-sig'] as string | undefined;

    if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
      res.status(400).json({ error: 'Missing PayPal verification headers' });
      return;
    }

    let webhookEvent: unknown;
    try {
      webhookEvent = JSON.parse(buf.toString('utf8'));
    } catch {
      res.status(400).json({ error: 'Invalid JSON' });
      return;
    }

    const ok = await verifyWebhookSignature(
      transmissionId,
      transmissionTime,
      certUrl,
      authAlgo,
      transmissionSig,
      webhookId,
      webhookEvent,
    );
    if (!ok) {
      res.status(400).json({ error: 'Invalid webhook signature' });
      return;
    }

    const event = webhookEvent as {
      event_type?: string;
      resource?: { id?: string; status?: string; plan_id?: string };
    };

    const subId = event.resource?.id;
    const status = event.resource?.status;

    if (subId && status && event.event_type?.includes('BILLING.SUBSCRIPTION')) {
      const existing = getSubscriptionByPayPalId(subId);
      if (existing) {
        upsertSubscription({
          paypal_subscription_id: subId,
          user_id: existing.user_id,
          tier: existing.tier,
          status,
          plan_id: event.resource?.plan_id ?? existing.plan_id,
        });
      }
    }

    res.status(200).send();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[webhook]', err);
    res.status(500).json({ error: 'Webhook error' });
  }
}
