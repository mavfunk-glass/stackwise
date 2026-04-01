/** Base URL for the StackWise API (Express). Empty = same origin (dev proxy or reverse proxy). */
const raw = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ?? '';
const base = raw.replace(/\/$/, '');

/** Build an absolute API URL for production when the SPA and API use different origins. */
export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}
