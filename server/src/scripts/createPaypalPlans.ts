/**
 * Creates one PayPal catalog product and two LIVE (or sandbox) subscription plans
 * matching StackWise pricing: Basic $9/mo, Pro $19/mo.
 *
 * Uses PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_API_BASE from repo root `.env`.
 *
 * Run from repo root:
 *   npm --prefix server run create-paypal-plans
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

async function paypalJson<T>(
  token: string,
  method: string,
  pathSuffix: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${apiBase()}${pathSuffix}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json()) as T & { message?: string; details?: unknown };
  if (!res.ok) {
    const msg =
      (data as { message?: string }).message ??
      JSON.stringify((data as { details?: unknown }).details ?? data, null, 2);
    throw new Error(`${method} ${pathSuffix} -> ${res.status}: ${msg}`);
  }
  return data as T;
}

/** PayPal rejects total_cycles: 0 on some accounts; use large count for “until cancelled”. */
const INFINITEISH_CYCLES = 999;

const basicPlanBody = {
  name: 'StackWise Basic Monthly',
  description:
    'StackWise Basic: supplement guidance, stack generations, reminders. Informational only.',
  status: 'ACTIVE',
  usage_type: 'LICENSED',
  billing_cycles: [
    {
      frequency: { interval_unit: 'MONTH', interval_count: 1 },
      tenure_type: 'REGULAR',
      sequence: 1,
      total_cycles: INFINITEISH_CYCLES,
      pricing_scheme: {
        fixed_price: { value: '9', currency_code: 'USD' },
      },
    },
  ],
  payment_preferences: {
    auto_bill_outstanding: true,
    payment_failure_threshold: 3,
  },
};

const proPlanBody = {
  name: 'StackWise Pro Monthly',
  description:
    'StackWise Pro: full guidance, stack hub, everything in Basic. Informational only.',
  status: 'ACTIVE',
  usage_type: 'LICENSED',
  billing_cycles: [
    {
      frequency: { interval_unit: 'MONTH', interval_count: 1 },
      tenure_type: 'REGULAR',
      sequence: 1,
      total_cycles: INFINITEISH_CYCLES,
      pricing_scheme: {
        fixed_price: { value: '19', currency_code: 'USD' },
      },
    },
  ],
  payment_preferences: {
    auto_bill_outstanding: true,
    payment_failure_threshold: 3,
  },
};

async function main(): Promise<void> {
  const base = apiBase();
  // eslint-disable-next-line no-console
  console.log(`Using PayPal API: ${base}\n`);

  const token = await getAccessToken();

  const product = await paypalJson<{ id: string }>(token, 'POST', '/v1/catalogs/products', {
    name: 'StackWise',
    description: 'Personalized supplement stack guidance (subscription)',
    type: 'SERVICE',
    category: 'SOFTWARE',
  });

  // eslint-disable-next-line no-console
  console.log(`Product: ${product.id}\n`);

  const basic = await paypalJson<{ id: string }>(token, 'POST', '/v1/billing/plans', {
    product_id: product.id,
    ...basicPlanBody,
  });

  const pro = await paypalJson<{ id: string }>(token, 'POST', '/v1/billing/plans', {
    product_id: product.id,
    ...proPlanBody,
  });

  // eslint-disable-next-line no-console
  console.log('Created plans:');
  // eslint-disable-next-line no-console
  console.log(`  Basic: ${basic.id}`);
  // eslint-disable-next-line no-console
  console.log(`  Pro:   ${pro.id}\n`);
  // eslint-disable-next-line no-console
  console.log('Add to root .env:');
  // eslint-disable-next-line no-console
  console.log(`PAYPAL_BASIC_PLAN_ID=${basic.id}`);
  // eslint-disable-next-line no-console
  console.log(`PAYPAL_PRO_PLAN_ID=${pro.id}`);
  // eslint-disable-next-line no-console
  console.log('\nAdd to client/.env:');
  // eslint-disable-next-line no-console
  console.log(`VITE_PAYPAL_BASIC_PLAN_ID=${basic.id}`);
  // eslint-disable-next-line no-console
  console.log(`VITE_PAYPAL_PRO_PLAN_ID=${pro.id}`);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
