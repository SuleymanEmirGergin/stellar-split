import { track, getAnalyticsCounts } from './analytics';

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('getAnalyticsCounts', () => {
  it('returns zero counts when storage is empty', () => {
    const counts = getAnalyticsCounts();
    expect(counts).toEqual({ group_created: 0, expense_added: 0, group_settled: 0 });
  });

  it('returns persisted counts', () => {
    localStorage.setItem(
      'stellarsplit_analytics',
      JSON.stringify({ group_created: 3, expense_added: 7, group_settled: 1 }),
    );
    expect(getAnalyticsCounts()).toEqual({ group_created: 3, expense_added: 7, group_settled: 1 });
  });

  it('returns zero counts when localStorage value is invalid JSON', () => {
    localStorage.setItem('stellarsplit_analytics', 'not-json');
    expect(getAnalyticsCounts()).toEqual({ group_created: 0, expense_added: 0, group_settled: 0 });
  });
});

describe('track', () => {
  it('increments group_created count', () => {
    track('group_created');
    expect(getAnalyticsCounts().group_created).toBe(1);
  });

  it('increments expense_added count', () => {
    track('expense_added');
    track('expense_added');
    expect(getAnalyticsCounts().expense_added).toBe(2);
  });

  it('increments group_settled count', () => {
    track('group_settled');
    expect(getAnalyticsCounts().group_settled).toBe(1);
  });

  it('accumulates across multiple calls', () => {
    track('group_created');
    track('expense_added');
    track('expense_added');
    track('group_settled');
    const counts = getAnalyticsCounts();
    expect(counts.group_created).toBe(1);
    expect(counts.expense_added).toBe(2);
    expect(counts.group_settled).toBe(1);
  });

  it('does not throw when localStorage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => track('group_created')).not.toThrow();
  });

  it('accepts optional payload without throwing', () => {
    expect(() => track('group_created', { groupName: 'Test' })).not.toThrow();
  });

  it('calls fetch when VITE_ANALYTICS_ENDPOINT is set', async () => {
    vi.stubEnv('VITE_ANALYTICS_ENDPOINT', 'http://analytics.example.com');
    vi.resetModules();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));

    const { track: trackFresh } = await import('./analytics');
    trackFresh('group_created');

    // fetch is called async (fire-and-forget) — give it a tick
    await new Promise((r) => setTimeout(r, 10));
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      'http://analytics.example.com',
      expect.objectContaining({ method: 'POST' }),
    );

    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });
});
