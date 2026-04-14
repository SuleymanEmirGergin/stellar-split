import {
  saveSubscriptions,
  loadSubscriptions,
  loadSubscriptionsFromApi,
  isSubscriptionDue,
  getNextPaymentDate,
  type RecurringTemplate,
} from './recurring';

beforeEach(() => {
  localStorage.clear();
  vi.unstubAllEnvs();
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const makeSub = (overrides: Partial<RecurringTemplate> = {}): RecurringTemplate => ({
  id: 's1',
  name: 'Netflix',
  amount: 1500,
  interval: 'monthly',
  members: ['GA', 'GB'],
  category: 'entertainment',
  createdAt: Date.now() - 40 * 24 * 60 * 60 * 1000, // 40 days ago
  ...overrides,
});

// ─── saveSubscriptions / loadSubscriptions ────────────────────────────────────

describe('saveSubscriptions / loadSubscriptions', () => {
  it('returns empty array when nothing saved', () => {
    expect(loadSubscriptions(1)).toEqual([]);
  });

  it('persists and loads subscriptions', async () => {
    const sub = makeSub();
    await saveSubscriptions(1, [sub]);
    expect(loadSubscriptions(1)).toEqual([sub]);
  });

  it('isolates data between groups', async () => {
    await saveSubscriptions(1, [makeSub()]);
    expect(loadSubscriptions(2)).toEqual([]);
  });

  it('does not call fetch when VITE_SUBSCRIPTIONS_API_URL is not set', async () => {
    await saveSubscriptions(1, [makeSub()]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('calls fetch when VITE_SUBSCRIPTIONS_API_URL is an http URL', async () => {
    vi.stubEnv('VITE_SUBSCRIPTIONS_API_URL', 'http://api.example.com/subs');
    vi.mocked(fetch).mockResolvedValue({ ok: true } as Response);
    const sub = makeSub();
    await saveSubscriptions(1, [sub]);
    expect(fetch).toHaveBeenCalledWith('http://api.example.com/subs', expect.objectContaining({
      method: 'POST',
    }));
  });

  it('silently ignores fetch errors', async () => {
    vi.stubEnv('VITE_SUBSCRIPTIONS_API_URL', 'http://api.example.com/subs');
    vi.mocked(fetch).mockRejectedValue(new Error('network'));
    await expect(saveSubscriptions(1, [makeSub()])).resolves.toBeUndefined();
  });
});

// ─── loadSubscriptionsFromApi ─────────────────────────────────────────────────

describe('loadSubscriptionsFromApi', () => {
  it('returns null when no API URL configured', async () => {
    expect(await loadSubscriptionsFromApi(1)).toBeNull();
  });

  it('returns null when API URL is not http', async () => {
    vi.stubEnv('VITE_SUBSCRIPTIONS_API_URL', 'ftp://bad');
    expect(await loadSubscriptionsFromApi(1)).toBeNull();
  });

  it('returns subscriptions from API array response', async () => {
    vi.stubEnv('VITE_SUBSCRIPTIONS_API_URL', 'http://api.example.com/subs');
    const sub = makeSub();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => [sub],
    } as Response);
    const result = await loadSubscriptionsFromApi(1);
    expect(result).toEqual([sub]);
  });

  it('returns subscriptions from API object response', async () => {
    vi.stubEnv('VITE_SUBSCRIPTIONS_API_URL', 'http://api.example.com/subs');
    const sub = makeSub();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ subscriptions: [sub] }),
    } as Response);
    const result = await loadSubscriptionsFromApi(1);
    expect(result).toEqual([sub]);
  });

  it('returns null when response is not ok', async () => {
    vi.stubEnv('VITE_SUBSCRIPTIONS_API_URL', 'http://api.example.com/subs');
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response);
    expect(await loadSubscriptionsFromApi(1)).toBeNull();
  });

  it('returns null on fetch error', async () => {
    vi.stubEnv('VITE_SUBSCRIPTIONS_API_URL', 'http://api.example.com/subs');
    vi.mocked(fetch).mockRejectedValue(new Error('network'));
    expect(await loadSubscriptionsFromApi(1)).toBeNull();
  });

  it('caches result in localStorage', async () => {
    vi.stubEnv('VITE_SUBSCRIPTIONS_API_URL', 'http://api.example.com/subs');
    const sub = makeSub();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => [sub],
    } as Response);
    await loadSubscriptionsFromApi(1);
    expect(loadSubscriptions(1)).toEqual([sub]);
  });
});

// ─── isSubscriptionDue ────────────────────────────────────────────────────────

describe('isSubscriptionDue', () => {
  it('returns true when nextDue is in the past', () => {
    const sub = makeSub({ nextDue: Date.now() - 1000 });
    expect(isSubscriptionDue(sub)).toBe(true);
  });

  it('returns false when nextDue is in the future', () => {
    const sub = makeSub({ nextDue: Date.now() + 1_000_000 });
    expect(isSubscriptionDue(sub)).toBe(false);
  });

  it('returns true for monthly sub created 40 days ago', () => {
    // 40 days > 30 days interval
    const sub = makeSub({ interval: 'monthly' });
    expect(isSubscriptionDue(sub)).toBe(true);
  });

  it('returns false for yearly sub created 40 days ago', () => {
    const sub = makeSub({ interval: 'yearly' });
    expect(isSubscriptionDue(sub)).toBe(false);
  });

  it('uses lastProcessed over createdAt when available', () => {
    const sub = makeSub({
      interval: 'daily',
      lastProcessed: Date.now() - 60 * 60 * 1000, // 1 hour ago — not yet 24 hours
    });
    expect(isSubscriptionDue(sub)).toBe(false);
  });
});

// ─── getNextPaymentDate ───────────────────────────────────────────────────────

describe('getNextPaymentDate', () => {
  it('returns nextDue directly when set', () => {
    const ts = Date.now() + 500_000;
    const sub = makeSub({ nextDue: ts });
    expect(getNextPaymentDate(sub)).toBe(ts);
  });

  it('calculates next date as lastProcessed + interval', () => {
    const last = 1_000_000;
    const sub = makeSub({ interval: 'weekly', lastProcessed: last });
    const expected = last + 7 * 24 * 60 * 60 * 1000;
    expect(getNextPaymentDate(sub)).toBe(expected);
  });

  it('falls back to createdAt when no lastProcessed', () => {
    const created = 1_000_000;
    const sub = makeSub({ interval: 'daily', createdAt: created, lastProcessed: undefined });
    const expected = created + 24 * 60 * 60 * 1000;
    expect(getNextPaymentDate(sub)).toBe(expected);
  });
});
