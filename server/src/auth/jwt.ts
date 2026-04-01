import * as jose from 'jose';

function getSecret(): Uint8Array {
  const raw = process.env.JWT_SECRET;
  if (!raw || raw.length < 32) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set to a random string of at least 32 characters in production.');
    }
    // Dev-only weak secret; do not use in production
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
