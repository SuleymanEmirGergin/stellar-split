/**
 * Recurring Expenses Logic for Birik.
 * Handles templates for subscriptions like Netflix, Rent, etc.
 */

export type Interval = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type RecurringStatus = 'active' | 'paused';

export interface RecurringTemplate {
  id: string;
  name: string;
  amount: number;
  interval: Interval;
  members: string[];
  category: string;
  status?: RecurringStatus;
  nextDue?: number;       // Unix timestamp ms — used for backend API
  lastProcessed?: number; // Unix timestamp ms
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

const INTERVAL_MS: Record<Interval, number> = {
  daily:   1 * 24 * 60 * 60 * 1000,
  weekly:  7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
  yearly:  365 * 24 * 60 * 60 * 1000,
};

export function isSubscriptionDue(sub: RecurringTemplate): boolean {
  if (sub.nextDue) return Date.now() >= sub.nextDue;
  const last = sub.lastProcessed || sub.createdAt;
  return Date.now() - last >= INTERVAL_MS[sub.interval];
}

export function getNextPaymentDate(sub: RecurringTemplate): number {
  if (sub.nextDue) return sub.nextDue;
  const last = sub.lastProcessed || sub.createdAt;
  return last + INTERVAL_MS[sub.interval];
}
