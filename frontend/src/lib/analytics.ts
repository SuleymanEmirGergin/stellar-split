/**
 * Anonymous analytics: group_created, expense_added, group_settled.
 * Counts stored locally; optional backend via VITE_ANALYTICS_ENDPOINT.
 */

const STORAGE_KEY = 'stellarsplit_analytics';
const ENDPOINT = typeof import.meta !== 'undefined' && import.meta.env?.VITE_ANALYTICS_ENDPOINT;

type EventName = 'group_created' | 'expense_added' | 'group_settled';

interface Counts {
  group_created: number;
  expense_added: number;
  group_settled: number;
}

function getCounts(): Counts {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Counts;
  // eslint-disable-next-line no-empty
  } catch {} // noop
  return { group_created: 0, expense_added: 0, group_settled: 0 };
}

function saveCounts(c: Counts): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
  // eslint-disable-next-line no-empty
  } catch {} // noop
}

/**
 * Track an anonymous event (no PII). Updates local counts; optionally POSTs to backend.
 */
export function track(event: EventName, payload?: Record<string, unknown>): void {
  const counts = getCounts();
  if (event in counts) {
    const c = counts as unknown as Record<string, number>;
    c[event] = c[event] + 1;
  }
  saveCounts(counts);

  if (ENDPOINT && typeof fetch !== 'undefined') {
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, ...payload, ts: Date.now() }),
    }).catch(() => {});
  }
}

/** Get current anonymous counts (e.g. for a simple stats UI). */
export function getAnalyticsCounts(): Counts {
  return getCounts();
}
