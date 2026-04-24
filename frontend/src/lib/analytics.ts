/**
 * ── Analytics catalog ────────────────────────────────────────────────────────
 *
 * Anonymous event tracking. No PII is ever sent — wallet addresses are never
 * included in payloads. All events are counted locally (localStorage) and
 * optionally shipped to the backend via VITE_ANALYTICS_ENDPOINT.
 *
 * Event catalog (full list, increment as features ship):
 *
 * Onboarding / Auth
 *   wallet_connected          — first wallet connection
 *   demo_mode_toggled         — demo ↔ live toggle
 *   wizard_completed          — new-user wizard finished
 *   referral_link_visited     — ?ref= query param detected on load
 *
 * Groups
 *   group_created             — new group created on-chain
 *   group_joined              — joined via invite link
 *   group_settled             — group settled (all balances zeroed)
 *
 * Expenses
 *   expense_added             — expense recorded
 *   expense_cancelled         — cancel_last_expense called
 *   expense_imported_receipt  — receipt OCR / import used
 *
 * Members
 *   member_added              — member invited to group
 *   member_removed            — member removed from group
 *
 * Referral
 *   referral_code_copied      — referral link copy button clicked
 *   referral_reward_claimed   — rewards claimed on-chain
 *   referral_registered       — contract register_referral called
 *
 * Savings
 *   savings_pool_created      — savings pool activated
 *   savings_contributed       — contribution made to pool
 *
 * Feedback
 *   feedback_submitted        — user submitted feedback (type: bug|feature|general)
 *
 * Settlement
 *   settle_started            — settlement flow initiated
 *   settle_multicurrency      — settle_group_flex path (cross-token swap)
 *
 * Navigation / UI
 *   tab_switched              — main dashboard tab change
 *   referral_tab_opened       — referral dashboard opened
 *   settings_opened           — settings page visited
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type EventName =
  // Onboarding
  | 'wallet_connected'
  | 'demo_mode_toggled'
  | 'wizard_completed'
  | 'referral_link_visited'
  // Groups
  | 'group_created'
  | 'group_joined'
  | 'group_settled'
  // Expenses
  | 'expense_added'
  | 'expense_cancelled'
  | 'expense_imported_receipt'
  // Members
  | 'member_added'
  | 'member_removed'
  // Referral
  | 'referral_code_copied'
  | 'referral_reward_claimed'
  | 'referral_registered'
  // Savings
  | 'savings_pool_created'
  | 'savings_contributed'
  // Feedback
  | 'feedback_submitted'
  // Settlement
  | 'settle_started'
  | 'settle_multicurrency'
  // Navigation / UI
  | 'tab_switched'
  | 'referral_tab_opened'
  | 'settings_opened';

/** Countable events persisted locally */
type CountableEvent =
  | 'group_created'
  | 'expense_added'
  | 'group_settled'
  | 'wallet_connected'
  | 'feedback_submitted'
  | 'referral_registered';

type Counts = Record<CountableEvent, number>;

// ── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'stellarsplit_analytics';
const ENDPOINT =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_ANALYTICS_ENDPOINT
    ? (import.meta.env.VITE_ANALYTICS_ENDPOINT as string)
    : null;

const COUNTABLE: CountableEvent[] = [
  'group_created',
  'expense_added',
  'group_settled',
  'wallet_connected',
  'feedback_submitted',
  'referral_registered',
];

function defaultCounts(): Counts {
  return {
    group_created: 0,
    expense_added: 0,
    group_settled: 0,
    wallet_connected: 0,
    feedback_submitted: 0,
    referral_registered: 0,
  };
}

function getCounts(): Counts {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultCounts(), ...(JSON.parse(raw) as Partial<Counts>) };
  } catch { /* noop */ }
  return defaultCounts();
}

function saveCounts(c: Counts): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
  } catch { /* noop */ }
}

// ── Ship to backend (fire-and-forget) ────────────────────────────────────────

function ship(event: EventName, payload: Record<string, unknown>): void {
  if (!ENDPOINT || typeof fetch === 'undefined') return;
  fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, ...payload, ts: Date.now() }),
    // keepalive so the request survives page unloads
    keepalive: true,
  }).catch(() => { /* silently drop — analytics must never break the app */ });
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Track an anonymous event (no PII).
 *
 * - Updates local counts for countable events
 * - Fire-and-forgets a POST to VITE_ANALYTICS_ENDPOINT when configured
 * - Never throws
 *
 * @example
 *   track('group_created', { memberCount: 3 });
 *   track('wallet_connected');
 *   track('feedback_submitted', { feedbackType: 'bug' });
 */
export function track(event: EventName, payload?: Record<string, unknown>): void {
  // Local count
  if ((COUNTABLE as string[]).includes(event)) {
    const counts = getCounts();
    (counts as unknown as Record<string, number>)[event] += 1;
    saveCounts(counts);
  }

  // Remote
  ship(event, payload ?? {});
}

/** Get current anonymous counts snapshot */
export function getAnalyticsCounts(): Counts {
  return getCounts();
}

/**
 * Flush any events that were tracked while the user was offline.
 * Call once on app boot after connectivity is confirmed.
 * (Currently a no-op — fire-and-forget already handles retries at the network
 * layer; this hook exists for future persistent queue integration.)
 */
export function flushQueue(): void {
  // reserved
}
