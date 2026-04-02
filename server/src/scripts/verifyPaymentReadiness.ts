/**
 * Verifies PayPal credentials and that Basic/Pro plan IDs exist and are ACTIVE.
 * Does not perform a real checkout (that always needs a human in the browser).
 *
 * Run: npm --prefix server run verify:payments
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../../');
dotenv.config({ path: path.join(root, '.env') });

function apiBase(): string {
  return process.env.PAYPAL_API_BASE ?? 'https://api-m.sandbox.paypal.com';
}

async function oauth(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) {
    throw new Error('Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET in root .env');
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
    throw new Error(data.error_description ?? `OAuth HTTP ${res.status}`);
  }
  return data.access_token;
}

async function getPlan(token: string, planId: string): Promise<{ status?: string; name?: string }> {
  const res = await fetch(`${apiBase()}/v1/billing/plans/${encodeURIComponent(planId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await res.json()) as { status?: string; name?: string; message?: string };
  if (!res.ok) {
    throw new Error(data.message ?? `HTTP ${res}`);
  }
  return data;
}

function readClientPlanIds(): { basic?: string; pro?: string; clientId?: string } {
  const p = path.join(root, 'client', '.env');
  if (!fs.existsSync(p)) return {};
  const o = dotenv.parse(fs.readFileSync(p));
  return {
    basic: o.VITE_PAYPAL_BASIC_PLAN_ID,
    pro: o.VITE_PAYPAL_PRO_PLAN_ID,
    clientId: o.VITE_PAYPAL_CLIENT_ID,
  };
}

function ok(msg: string): void {
  // eslint-disable-next-line no-console
  console.log(`[OK]   ${msg}`);
}

function fail(msg: string): void {
  // eslint-disable-next-line no-console
  console.log(`[FAIL] ${msg}`);
}

function warn(msg: string): void {
  // eslint-disable-next-line no-console
  console.log(`[!!]   ${msg}`);
}

async function main(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('StackWise payment readiness (PayPal)\n');

  const base = apiBase();
  ok(`API base: ${base}`);

  let token: string;
  try {
    token = await oauth();
    ok('OAuth (client id + secret accepted)');
  } catch (e) {
    fail(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }

  const basicId = process.env.PAYPAL_BASIC_PLAN_ID?.trim();
  const proId = process.env.PAYPAL_PRO_PLAN_ID?.trim();
  if (!basicId?.startsWith('P-') || !proId?.startsWith('P-')) {
    fail('PAYPAL_BASIC_PLAN_ID / PAYPAL_PRO_PLAN_ID missing or not P-... in root .env');
    process.exit(1);
  }

  for (const [label, id] of [
    ['Basic', basicId],
    ['Pro', proId],
  ] as const) {
    try {
      const plan = await getPlan(token, id);
      if (plan.status === 'ACTIVE') {
        ok(`Plan ${label} (${id}) status ACTIVE — ${plan.name ?? 'unnamed'}`);
      } else {
        warn(`Plan ${label} (${id}) status is "${plan.status ?? 'unknown'}" (prefer ACTIVE for checkout)`);
      }
    } catch (e) {
      fail(`${label} plan ${id}: ${e instanceof Error ? e.message : String(e)}`);
      process.exit(1);
    }
  }

  const vite = readClientPlanIds();
  if (vite.basic === basicId && vite.pro === proId) {
    ok('client/.env VITE_PAYPAL_* plan IDs match server .env');
  } else {
    warn('client/.env VITE plan IDs differ from root .env or are missing — rebuild client after fixing');
  }

  if (vite.clientId && vite.clientId === process.env.PAYPAL_CLIENT_ID?.trim()) {
    ok('VITE_PAYPAL_CLIENT_ID matches PAYPAL_CLIENT_ID');
  } else {
    warn('VITE_PAYPAL_CLIENT_ID should match PAYPAL_CLIENT_ID (same Live app)');
  }

  // eslint-disable-next-line no-console
  console.log('\n--- What only you can do ---');
  // eslint-disable-next-line no-console
  console.log(
    '1) Deploy with public https URL; set APP_URL + CLIENT_URL on the host (see npm run railway:env-paste).',
  );
  // eslint-disable-next-line no-console
  console.log('2) Open /pricing on the deployed site and complete a real subscribe (PayPal login).');
  // eslint-disable-next-line no-console
  console.log(
    '3) Optional: npm --prefix server run paypal:register-webhook after deploy (needs PAYPAL_WEBHOOK_ID).',
  );
  // eslint-disable-next-line no-console
  console.log('\nLocal dev: billing activate may be skipped when server entitlements are off; use production URL for a true end-to-end test.');
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
