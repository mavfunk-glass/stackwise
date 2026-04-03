import type { Request, Response } from 'express';
import { Router } from 'express';

const EVENT_RE = /^[a-z][a-z0-9_]{0,62}$/i;
const MAX_BODY = 12_000;

/** Simple sliding-window rate limit per IP (best-effort; resets on process restart). */
const windowMs = 60_000;
const maxPerWindow = 300;
const hits = new Map<string, number[]>();

function rateLimitOk(ip: string): boolean {
  const now = Date.now();
  const arr = hits.get(ip) ?? [];
  const recent = arr.filter((t) => now - t < windowMs);
  if (recent.length >= maxPerWindow) return false;
  recent.push(now);
  hits.set(ip, recent);
  return true;
}

const router = Router();

router.post('/event', (req: Request, res: Response) => {
  if (process.env.ANALYTICS_ENABLED === 'false') {
    res.status(204).end();
    return;
  }

  const secret = process.env.ANALYTICS_INGEST_KEY?.trim();
  if (secret && req.headers['x-stackwise-analytics'] !== secret) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const ip = (req.ip || req.socket.remoteAddress || 'unknown').replace(/^::ffff:/, '');
  if (!rateLimitOk(ip)) {
    res.status(429).json({ error: 'Too many requests' });
    return;
  }

  const raw = JSON.stringify(req.body ?? {});
  if (raw.length > MAX_BODY) {
    res.status(413).json({ error: 'Payload too large' });
    return;
  }

  let body: { event?: unknown; distinctId?: unknown; path?: unknown; properties?: unknown };
  try {
    body = typeof req.body === 'object' && req.body !== null ? req.body : {};
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  const event = typeof body.event === 'string' ? body.event.trim() : '';
  if (!event || !EVENT_RE.test(event)) {
    res.status(400).json({ error: 'Invalid event name' });
    return;
  }

  const distinctId =
    typeof body.distinctId === 'string' && body.distinctId.length <= 128 ? body.distinctId : undefined;
  const path = typeof body.path === 'string' && body.path.length <= 512 ? body.path : undefined;
  let properties: Record<string, unknown> = {};
  if (body.properties && typeof body.properties === 'object' && !Array.isArray(body.properties)) {
    properties = body.properties as Record<string, unknown>;
  }

  const line = JSON.stringify({
    t: new Date().toISOString(),
    event,
    distinctId,
    path,
    properties,
    ip: process.env.ANALYTICS_LOG_IP === 'true' ? ip : undefined,
  });

  // eslint-disable-next-line no-console
  console.log(`[analytics] ${line}`);

  res.status(204).end();
});

export default router;
