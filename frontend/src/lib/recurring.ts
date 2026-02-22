/**
 * Recurring Expenses Logic for StellarSplit.
 * Handles templates for subscriptions like Netflix, Rent, etc.
 */

export type Interval = 'weekly' | 'monthly';

export interface RecurringTemplate {
  id: string;
  name: string;
  amount: number;
  interval: Interval;
  members: string[];
  category: string;
  lastProcessed?: number; // Timestamp
  createdAt: number;
}

const RECURRING_KEY = (groupId: number) => `stellarsplit_recurring_${groupId}`;
const getApiUrl = () => (import.meta.env.VITE_SUBSCRIPTIONS_API_URL as string)?.trim() || '';

/** Yerel kayıt; VITE_SUBSCRIPTIONS_API_URL varsa aynı veriyi API'ye de gönderir. */
export async function saveSubscriptions(groupId: number, subs: RecurringTemplate[]) {
  localStorage.setItem(RECURRING_KEY(groupId), JSON.stringify(subs));
  const base = getApiUrl();
  if (base && base.startsWith('http')) {
    try {
      await fetch(base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, subscriptions: subs }),
      });
    } catch {
      /* ignore */
    }
  }
}

export function loadSubscriptions(groupId: number): RecurringTemplate[] {
  const raw = localStorage.getItem(RECURRING_KEY(groupId));
  return raw ? JSON.parse(raw) : [];
}

/** VITE_SUBSCRIPTIONS_API_URL tanımlıysa API'den abonelikleri çeker; yoksa null. Gerçek entegrasyon için backend GET /api/subscriptions?groupId= döndürmeli. */
export async function loadSubscriptionsFromApi(groupId: number): Promise<RecurringTemplate[] | null> {
  const base = getApiUrl();
  if (!base || !base.startsWith('http')) return null;
  try {
    const url = base.includes('?') ? `${base}&groupId=${groupId}` : `${base}?groupId=${groupId}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as { subscriptions?: RecurringTemplate[] } | RecurringTemplate[];
    const list = Array.isArray(data) ? data : data?.subscriptions;
    if (Array.isArray(list)) {
      localStorage.setItem(RECURRING_KEY(groupId), JSON.stringify(list));
      return list;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function isSubscriptionDue(sub: RecurringTemplate): boolean {
  const now = Date.now();
  const last = sub.lastProcessed || sub.createdAt;
  
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  const oneMonth = 30 * 24 * 60 * 60 * 1000; // Simplified
  
  const intervalMs = sub.interval === 'weekly' ? oneWeek : oneMonth;
  
  return now - last >= intervalMs;
}

export function getNextPaymentDate(sub: RecurringTemplate): number {
  const last = sub.lastProcessed || sub.createdAt;
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  const oneMonth = 30 * 24 * 60 * 60 * 1000;
  const intervalMs = sub.interval === 'weekly' ? oneWeek : oneMonth;
  
  return last + intervalMs;
}
