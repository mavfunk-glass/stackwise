import type { NextFunction, Request, Response } from 'express';
import { verifySessionToken } from './jwt.js';
import { verifySupabaseAccessToken } from './supabaseJwt.js';
import { upsertUserFromSupabaseAuth } from '../db/index.js';

export type AuthedRequest = Request & { userId?: string };

/** In production, API auth is on unless STACKWISE_REQUIRE_API_AUTH=false. In dev, off unless explicitly true. */
export function requireApiAuth(): boolean {
  if (process.env.STACKWISE_REQUIRE_API_AUTH === 'false') return false;
  if (process.env.STACKWISE_REQUIRE_API_AUTH === 'true') return true;
  return process.env.NODE_ENV === 'production';
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (!requireApiAuth()) {
    next();
    return;
  }
  const hdr = req.headers.authorization;
  if (!hdr?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing session. Open the app and try again.' });
    return;
  }
  const token = hdr.slice(7).trim();

  void (async () => {
    const supa = await verifySupabaseAccessToken(token);
    if (supa) {
      upsertUserFromSupabaseAuth(supa.sub, supa.email, supa.emailVerified);
      req.userId = supa.sub;
      next();
      return;
    }

    try {
      const v = await verifySessionToken(token);
      if (!v) {
        res.status(401).json({ error: 'Invalid or expired session. Refresh the page.' });
        return;
      }
      req.userId = v.sub;
      next();
    } catch {
      res.status(401).json({ error: 'Invalid session.' });
    }
  })();
}
