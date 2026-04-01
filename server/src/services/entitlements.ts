import { getActiveTierForUser, getUser } from '../db/index.js';

export class PaidRequiredError extends Error {
  constructor() {
    super('PAID_REQUIRED');
    this.name = 'PaidRequiredError';
  }
}

/** First stack generation is free; further generations require an active Basic or Pro subscription in the database. */
export function assertCanGenerateStack(userId: string): void {
  const user = getUser(userId);
  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }
  if (user.stack_generations === 0) {
    return;
  }
  const tier = getActiveTierForUser(userId);
  if (tier === 'basic' || tier === 'pro') {
    return;
  }
  throw new PaidRequiredError();
}

export function getEntitlementTier(userId: string): 'free' | 'basic' | 'pro' {
  return getActiveTierForUser(userId);
}
