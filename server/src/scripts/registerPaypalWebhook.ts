/**
 * Registers a Live (or sandbox) PayPal webhook pointing at your deployed app.
 * Prints PAYPAL_WEBHOOK_ID for Railway / root .env.
 *
 * Requires public HTTPS URL (PayPal rejects localhost).
 * Uses APP_URL from root .env, or override with PAYPAL_WEBHOOK_BASE_URL (no trailing slash).
 *
 * Run: npm --prefix server run paypal:register-webhook
 */
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

function apiBase(): string {
  return process.env.PAYPAL_API_BASE ?? 'https://api-m.sandbox.paypal.com';
}

async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) {
    throw new Error('Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in root .env');
  }
  const auth = Buffer.from(`${clientId}:${secret}`).toString('base64');
  const res = await fetch(`${apiBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const data = (await res.json()) as { access_token?: string; error_description?: string };
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description ?? `OAuth failed: ${res.status}`);
  }
  return data.access_token;
}

const SUBSCRIPTION_EVENTS = [
  'BILLING.SUBSCRIPTION.CREATED',
  'BILLING.SUBSCRIPTION.ACTIVATED',
  'BILLING.SUBSCRIPTION.UPDATED',
  'BILLING.SUBSCRIPTION.EXPIRED',
  'BILLING.SUBSCRIPTION.CANCELLED',
  'BILLING.SUBSCRIPTION.SUSPENDED',
  'BILLING.SUBSCRIPTION.PAYMENT.FAILED',
];

async function main(): Promise<void> {
  const base =
    process.env.PAYPAL_WEBHOOK_BASE_URL?.replace(/\/$/, '') ??
    process.env.APP_URL?.replace(/\/$/, '');
  if (!base || /localhost|127\.0\.0\.1/i.test(base)) {
    throw new Error(
      'Set APP_URL to your public https://... URL in .env, or set PAYPAL_WEBHOOK_BASE_URL. PayPal does not accept localhost.',
    );
  }
  const url = `${base}/api/webhooks/paypal`;
  // eslint-disable-next-line no-console
  console.log(`Registering webhook URL: ${url}\n`);

  const token = await getAccessToken();
  const res = await fetch(`${apiBase()}/v1/notifications/webhooks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      event_types: SUBSCRIPTION_EVENTS.map((name) => ({ name })),
    }),
  });
  const data = (await res.json()) as { id?: string; name?: string; message?: string };
  if (!res.ok || !data.id) {
    throw new Error(data.message ?? JSON.stringify(data));
  }
  // eslint-disable-next-line no-console
  console.log(`PAYPAL_WEBHOOK_ID=${data.id}`);
  // eslint-disable-next-line no-console
  console.log('\nAdd that line to root .env and Railway, then redeploy.');
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
