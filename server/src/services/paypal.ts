/**
 * PayPal REST API (subscriptions). Requires PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET,
 * PAYPAL_API_BASE (https://api-m.sandbox.paypal.com or https://api-m.paypal.com).
 */

let cachedToken: { token: string; expiresAt: number } | null = null;

function apiBase(): string {
  return process.env.PAYPAL_API_BASE ?? 'https://api-m.sandbox.paypal.com';
}

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.token;
  }
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) {
    throw new Error('PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be set for billing verification.');
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
  const data = (await res.json()) as { access_token?: string; expires_in?: number; error?: string };
  if (!res.ok || !data.access_token) {
    throw new Error(data.error ?? `PayPal OAuth failed: ${res.status}`);
  }
  const expiresIn = (data.expires_in ?? 3600) * 1000;
  cachedToken = { token: data.access_token, expiresAt: now + expiresIn };
  return data.access_token;
}

export type PayPalSubscription = {
  id: string;
  status: string;
  plan_id?: string;
};

export async function fetchSubscription(subscriptionId: string): Promise<PayPalSubscription> {
  const token = await getAccessToken();
  const res = await fetch(`${apiBase()}/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  const data = (await res.json()) as PayPalSubscription & {
    message?: string;
    plan?: { id?: string };
  };
  if (!res.ok) {
    throw new Error(data.message ?? `PayPal subscription lookup failed: ${res.status}`);
  }
  const plan_id = data.plan_id ?? data.plan?.id;
  return { ...data, plan_id };
}

export function planIdMatchesTier(planId: string | undefined, tier: 'basic' | 'pro'): boolean {
  const basic = process.env.PAYPAL_BASIC_PLAN_ID;
  const pro = process.env.PAYPAL_PRO_PLAN_ID;
  if (tier === 'basic') return !!planId && planId === basic;
  if (tier === 'pro') return !!planId && planId === pro;
  return false;
}

export async function verifyWebhookSignature(
  transmissionId: string,
  transmissionTime: string,
  certUrl: string,
  authAlgo: string,
  transmissionSig: string,
  webhookId: string,
  webhookEvent: unknown,
): Promise<boolean> {
  const token = await getAccessToken();
  const res = await fetch(`${apiBase()}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      transmission_id: transmissionId,
      transmission_time: transmissionTime,
      cert_url: certUrl,
      auth_algo: authAlgo,
      transmission_sig: transmissionSig,
      webhook_id: webhookId,
      webhook_event: webhookEvent,
    }),
  });
  const data = (await res.json()) as { verification_status?: string };
  if (!res.ok) return false;
  return data.verification_status === 'SUCCESS';
}
