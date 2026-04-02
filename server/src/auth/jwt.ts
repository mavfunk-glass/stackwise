import * as jose from 'jose';

let warnedWeakJwtSecret = false;

function getSecret(): Uint8Array {
  const raw = process.env.JWT_SECRET;
  if (!raw || raw.length < 32) {
    if (process.env.NODE_ENV === 'production' && !warnedWeakJwtSecret) {
      warnedWeakJwtSecret = true;
      // eslint-disable-next-line no-console
      console.warn(
        '[auth] JWT_SECRET is missing or too short (<32). Using fallback signer secret. ' +
        'Set JWT_SECRET to a random 32+ char value in production.',
      );
    }
    // Fallback secret keeps sessions working if auth enforcement is disabled.
    return new TextEncoder().encode('stackwise-dev-secret-min-32-chars!!');
  }
  return new TextEncoder().encode(raw);
}

export async function signSessionToken(userId: string): Promise<string> {
  const secret = getSecret();
  return new jose.SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('400d')
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<{ sub: string } | null> {
  try {
    const secret = getSecret();
    const { payload } = await jose.jwtVerify(token, secret);
    const sub = payload.sub;
    if (typeof sub !== 'string' || !sub) return null;
    return { sub };
  } catch {
    return null;
  }
}
