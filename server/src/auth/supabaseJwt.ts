import * as jose from 'jose';

/**
 * Verifies a Supabase Auth access token (HS256, signed with the project's JWT secret).
 * Dashboard: Project Settings → API → JWT Secret (not the anon key).
 */
export async function verifySupabaseAccessToken(
  token: string,
): Promise<{ sub: string; email: string | null; emailVerified: boolean } | null> {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret || secret.length < 10) return null;

  try {
    const key = new TextEncoder().encode(secret);
    const { payload } = await jose.jwtVerify(token, key, { algorithms: ['HS256'] });
    const sub = payload.sub;
    if (typeof sub !== 'string' || !sub) return null;

    const p = payload as Record<string, unknown>;
    const rawEmail = typeof p.email === 'string' ? p.email : null;
    const email = rawEmail?.toLowerCase().trim() ?? null;

    const emailVerified =
      p.email_confirmed === true ||
      p.email_verified === true ||
      (typeof p.user_metadata === 'object' &&
        p.user_metadata !== null &&
        (p.user_metadata as { email_verified?: boolean }).email_verified === true);

    return {
      sub,
      email,
      emailVerified: !!emailVerified,
    };
  } catch {
    return null;
  }
}
