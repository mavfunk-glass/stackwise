import { clearPaidClientState } from '../types/storage';
import { getSupabase } from '../lib/supabase';
import { apiUrl } from './apiUrl';

const SESSION_TOKEN_KEY = 'stackwise_api_session_token';

const ANALYZE_SECRET = import.meta.env.VITE_ANALYZE_SECRET as string | undefined;

/** Prefer Supabase access token, then legacy anonymous JWT in localStorage. */
async function getBearerTokenForApi(): Promise<string | null> {
  const sb = getSupabase();
  if (sb) {
    const {
      data: { session },
    } = await sb.auth.getSession();
    if (session?.access_token) return session.access_token;
  }
  try {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Bootstrap server session (anonymous user + JWT) when not using Supabase auth. */
export async function ensureApiSession(): Promise<string | null> {
  const sb = getSupabase();
  if (sb) {
    const {
      data: { session },
    } = await sb.auth.getSession();
    if (session?.access_token) return session.access_token;
  }

  try {
    const existing = localStorage.getItem(SESSION_TOKEN_KEY);
    if (existing) return existing;

    const res = await fetch(apiUrl('/api/auth/session'), { method: 'POST' });
    if (!res.ok) return null;
    const data = (await res.json()) as { token?: string };
    if (typeof data.token === 'string' && data.token) {
      localStorage.setItem(SESSION_TOKEN_KEY, data.token);
      return data.token;
    }
    return null;
  } catch {
    return null;
  }
}

export function getApiSessionToken(): string | null {
  try {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function clearApiSessionToken(): void {
  try {
    localStorage.removeItem(SESSION_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

/** Sign out of Supabase (if configured) and clear legacy JWT, then start a fresh anonymous session. */
export async function signOut(): Promise<void> {
  const sb = getSupabase();
  if (sb) {
    await sb.auth.signOut();
  }
  clearApiSessionToken();
  await ensureApiSession();
}

/**
 * Clears saved subscription, ever-paid flag, Pro UI prefs, chat credits, and the API JWT so billing sync does not immediately restore Pro.
 * Use with `VITE_DEV_PRO=false` and reload. In dev, `window.stackwiseResetFreeView()` runs this and reloads.
 */
export function resetClientToFreeView(): void {
  void getSupabase()?.auth.signOut();
  clearApiSessionToken();
  clearPaidClientState();
}

export async function apiAuthHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const t = await getBearerTokenForApi();
  if (t) headers.Authorization = `Bearer ${t}`;
  if (ANALYZE_SECRET) headers['x-stackwise-analyze'] = ANALYZE_SECRET;
  return headers;
}

/** After PayPal checkout: verify subscription server-side and link to this session user. */
export async function activateSubscriptionOnServer(subscriptionId: string, tier: 'basic' | 'pro'): Promise<{ ok: boolean; error?: string }> {
  await ensureApiSession();
  try {
    const res = await fetch(apiUrl('/api/billing/activate'), {
      method: 'POST',
      headers: await apiAuthHeaders(),
      body: JSON.stringify({ subscriptionId, tier }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok) return { ok: false, error: data.error ?? res.statusText };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

/** Sync paid tier from SQLite (source of truth when server entitlements are on). */
export async function fetchBillingStatus(): Promise<{
  tier: 'free' | 'basic' | 'pro';
  subscriptionActive: boolean;
  serverEntitlements: boolean;
  paypalSubscriptionId?: string | null;
  subscriptionProvider?: 'paypal' | 'stripe' | null;
  activatedAt?: string | null;
} | null> {
  await ensureApiSession();
  try {
    const res = await fetch(apiUrl('/api/billing/me'), { headers: await apiAuthHeaders() });
    if (!res.ok) return null;
    return (await res.json()) as {
      tier: 'free' | 'basic' | 'pro';
      subscriptionActive: boolean;
      serverEntitlements: boolean;
      paypalSubscriptionId?: string | null;
      subscriptionProvider?: 'paypal' | 'stripe' | null;
      activatedAt?: string | null;
    };
  } catch {
    return null;
  }
}

/** Stripe Checkout (hosted). Server must have STRIPE_SECRET_KEY + STRIPE_PRICE_* . */
export async function createStripeCheckoutSession(
  tier: 'basic' | 'pro',
): Promise<{ ok: boolean; url?: string; error?: string }> {
  await ensureApiSession();
  try {
    const res = await fetch(apiUrl('/api/billing/stripe/checkout-session'), {
      method: 'POST',
      headers: await apiAuthHeaders(),
      body: JSON.stringify({ tier }),
    });
    const data = (await res.json()) as { url?: string; error?: string };
    if (!res.ok) return { ok: false, error: data.error ?? res.statusText };
    if (!data.url) return { ok: false, error: 'No checkout URL returned.' };
    return { ok: true, url: data.url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

/** After returning from Stripe Checkout success URL. */
export async function confirmStripeCheckoutSession(sessionId: string): Promise<{ ok: boolean; error?: string }> {
  await ensureApiSession();
  try {
    const res = await fetch(apiUrl('/api/billing/stripe/confirm'), {
      method: 'POST',
      headers: await apiAuthHeaders(),
      body: JSON.stringify({ sessionId }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok) return { ok: false, error: data.error ?? res.statusText };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

/**
 * Request a sign-in link. Uses Supabase Auth when `VITE_SUPABASE_*` is configured; otherwise Resend via the API.
 * Magic-link URLs in Resend emails use server APP_URL / CLIENT_URL (see appPublicOrigin).
 */
export async function requestMagicLink(
  email: string,
  displayName?: string,
): Promise<{ ok: boolean; error?: string; dev_url?: string }> {
  const sb = getSupabase();
  if (sb) {
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await sb.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: redirectTo,
        data: displayName ? { display_name: displayName } : undefined,
      },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  try {
    await ensureApiSession();
    const res = await fetch(apiUrl('/api/auth/magic-link'), {
      method: 'POST',
      headers: await apiAuthHeaders(),
      body: JSON.stringify({ email: email.trim().toLowerCase(), displayName }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string; detail?: string; dev_url?: string };
    if (!res.ok) {
      const base = data.error ?? 'Failed to send link.';
      const detail =
        typeof data.detail === 'string' && data.detail.trim() ? ` — ${data.detail.trim()}` : '';
      return { ok: false, error: `${base}${detail}` };
    }
    return { ok: true, dev_url: data.dev_url };
  } catch {
    return { ok: false, error: 'Network error. Please try again.' };
  }
}

/** Verify a legacy magic link token. On success, stores the returned JWT and returns true. */
export async function verifyMagicToken(token: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(apiUrl(`/api/auth/verify?token=${encodeURIComponent(token)}`));
    const data = (await res.json()) as { token?: string; error?: string };
    if (!res.ok || !data.token) return { ok: false, error: data.error ?? 'Invalid or expired link.' };
    localStorage.setItem(SESSION_TOKEN_KEY, data.token);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Network error. Please try again.' };
  }
}

/** Save current stack to the server (called after quiz completion for logged-in users). */
export async function saveStackToServer(quizJson: string, resultJson: string, label?: string): Promise<{ ok: boolean }> {
  try {
    await ensureApiSession();
    const res = await fetch(apiUrl('/api/account/stack/save'), {
      method: 'POST',
      headers: await apiAuthHeaders(),
      body: JSON.stringify({ quizJson, resultJson, label }),
    });
    if (!res.ok) return { ok: false };
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/** Restore the user's last stack from the server (called on app load for returning users). */
export async function restoreStackFromServer(): Promise<{
  stack: { quiz: unknown; result: unknown; label: string | null } | null;
}> {
  try {
    await ensureApiSession();
    const res = await fetch(apiUrl('/api/account/stack/restore'), { headers: await apiAuthHeaders() });
    if (!res.ok) return { stack: null };
    const data = (await res.json()) as { stack: { quiz: unknown; result: unknown; label: string | null } | null };
    return { stack: data.stack ?? null };
  } catch {
    return { stack: null };
  }
}

/** Get the current user's account info (email, tier, etc). */
export async function fetchAccountMe(): Promise<{
  user: {
    email: string | null;
    displayName: string | null;
    emailVerified: boolean;
    reminderTime: string | null;
    reminderEnabled: boolean;
  } | null;
}> {
  try {
    await ensureApiSession();
    const res = await fetch(apiUrl('/api/account/me'), { headers: await apiAuthHeaders() });
    if (!res.ok) return { user: null };
    const data = (await res.json()) as {
      user: {
        email: string | null;
        displayName: string | null;
        emailVerified: boolean;
        reminderTime?: string | null;
        reminderEnabled?: boolean;
      } | null;
    };
    const u = data.user ?? null;
    if (!u) return { user: null };
    return {
      user: {
        email: u.email,
        displayName: u.displayName,
        emailVerified: u.emailVerified,
        reminderTime: u.reminderTime ?? null,
        reminderEnabled: !!u.reminderEnabled,
      },
    };
  } catch {
    return { user: null };
  }
}

/** Save reminder settings to the server. Requires Basic/Pro and a linked email. */
export async function saveReminderToServer(
  reminderTime: string,
  stackJson: string,
  enabled: boolean,
): Promise<{ ok: boolean; error?: string; emailRequired?: boolean }> {
  try {
    await ensureApiSession();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
    const res = await fetch(apiUrl('/api/account/reminder'), {
      method: 'POST',
      headers: await apiAuthHeaders(),
      body: JSON.stringify({ reminderTime, timezone, stackJson, enabled }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (res.status === 400 && data.error === 'EMAIL_REQUIRED') {
      return { ok: false, emailRequired: true };
    }
    if (!res.ok) return { ok: false, error: data.error };
    return { ok: true };
  } catch {
    return { ok: false, error: 'Network error.' };
  }
}
