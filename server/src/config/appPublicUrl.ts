/**
 * Public site origin for links inside emails and Stripe return URLs (no trailing slash).
 * Prefer APP_URL; fall back to CLIENT_URL so Railway setups with only CLIENT_URL still work.
 */
export function appPublicOrigin(): string {
  const raw = process.env.APP_URL?.trim() || process.env.CLIENT_URL?.trim() || '';
  if (raw) return raw.replace(/\/$/, '');
  return 'http://localhost:5173';
}

let warnedLocalhostInProd = false;

/** Log once if production uses a localhost-looking origin for links. */
export function warnIfLocalhostOriginInProduction(): void {
  if (process.env.NODE_ENV !== 'production' || warnedLocalhostInProd) return;
  const o = appPublicOrigin();
  if (/localhost|127\.0\.0\.1/i.test(o)) {
    warnedLocalhostInProd = true;
    // eslint-disable-next-line no-console
    console.warn(
      `[config] APP_URL / CLIENT_URL resolve to "${o}" in production. Email and checkout links will use that. Set APP_URL=https://your-live-domain (and CLIENT_URL if needed).`,
    );
  }
}
