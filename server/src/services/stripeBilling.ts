import Stripe from 'stripe';

let stripeSingleton: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(key);
  }
  return stripeSingleton;
}

/** Secret key + recurring price IDs (create Checkout Session). Webhook secret is separate. */
export function stripeCheckoutReady(): boolean {
  return stripeCheckoutMissingEnv().length === 0;
}

/** Env var names missing for Stripe Checkout (for 503 diagnostics). */
export function stripeCheckoutMissingEnv(): string[] {
  const m: string[] = [];
  if (!process.env.STRIPE_SECRET_KEY?.trim()) m.push('STRIPE_SECRET_KEY');
  if (!process.env.STRIPE_PRICE_BASIC?.trim()) m.push('STRIPE_PRICE_BASIC');
  if (!process.env.STRIPE_PRICE_PRO?.trim()) m.push('STRIPE_PRICE_PRO');
  return m;
}

export function priceIdForTier(tier: 'basic' | 'pro'): string | null {
  const id = tier === 'pro' ? process.env.STRIPE_PRICE_PRO?.trim() : process.env.STRIPE_PRICE_BASIC?.trim();
  return id || null;
}
