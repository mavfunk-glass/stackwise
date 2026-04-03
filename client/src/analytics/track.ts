import { apiUrl } from '../api/apiUrl';

const ANON_KEY = 'stackwise_distinct_id';
const INGEST = (import.meta.env.VITE_ANALYTICS_INGEST_KEY as string | undefined)?.trim() ?? '';

function getDistinctId(): string {
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `sw_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return 'unknown';
  }
}

/**
 * Product analytics: funnel steps, engagement, revenue-adjacent events.
 * No PII — never pass email, name, or free-text quiz answers.
 * Events POST to /api/analytics/event (logged server-side; wire dashboards later).
 */
export function trackEvent(
  event: string,
  properties?: Record<string, string | number | boolean | null | undefined>,
): void {
  if (typeof window === 'undefined') return;

  const payload = {
    event,
    distinctId: getDistinctId(),
    path: window.location.pathname,
    properties: properties ?? {},
  };

  const url = apiUrl('/api/analytics/event');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (INGEST) headers['X-StackWise-Analytics'] = INGEST;

  void fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {});
}
