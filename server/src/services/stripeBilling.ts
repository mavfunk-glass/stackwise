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
  return Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() &&
      process.env.STRIPE_PRICE_BASIC?.trim() &&
      process.env.STRIPE_PRICE_PRO?.trim(),
  );
}

export function priceIdForTier(tier: 'basic' | 'pro'): string | null {
  const id = tier === 'pro' ? process.env.STRIPE_PRICE_PRO?.trim() : process.env.STRIPE_PRICE_BASIC?.trim();
  return id || null;
}
