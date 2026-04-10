import type { CorsOptions } from 'cors';

/**
 * CLIENT_URL drives CORS. Use a comma-separated list for apex + www (e.g.
 * `https://stack-wise.org,https://www.stack-wise.org`) so both work.
 * When unset, the cors package reflects the request origin (flexible for same-origin and many setups).
 */
export function corsOriginOption(): CorsOptions['origin'] {
  const raw = process.env.CLIENT_URL?.trim();
  if (!raw) return true;
  const parts = raw
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter((s) => s.length > 0);
  if (parts.length === 0) return true;
  if (parts.length === 1) return parts[0];
  return parts;
}
