import {
  MOCK_APY,
  calculateYield,
  saveVault,
  loadVault,
  updateVaultYield,
  type VaultState,
} from './defi';

beforeEach(() => {
  localStorage.clear();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// ─── calculateYield ───────────────────────────────────────────────────────────

describe('calculateYield', () => {
  it('returns 0 for zero balance', () => {
    expect(calculateYield(0, 365 * 24 * 60 * 60 * 1000)).toBe(0);
  });

  it('returns 0 for negative balance', () => {
    expect(calculateYield(-100, 365 * 24 * 60 * 60 * 1000)).toBe(0);
  });

  it('returns full APY for 1 year', () => {
    const yearMs = 365 * 24 * 60 * 60 * 1000;
    const result = calculateYield(1000, yearMs, 10);
    expect(result).toBeCloseTo(100); // 10% of 1000
  });

  it('returns half APY for 6 months', () => {
    const halfYearMs = (365 / 2) * 24 * 60 * 60 * 1000;
    const result = calculateYield(1000, halfYearMs, 10);
    expect(result).toBeCloseTo(50);
  });

  it('uses MOCK_APY by default', () => {
    const yearMs = 365 * 24 * 60 * 60 * 1000;
    const result = calculateYield(1000, yearMs);
    expect(result).toBeCloseTo(MOCK_APY * 10); // MOCK_APY% of 1000
  });
});

// ─── saveVault / loadVault ────────────────────────────────────────────────────

describe('saveVault / loadVault', () => {
  const state: VaultState = {
    totalStaked: 500,
    yieldEarned: 12.5,
    lastUpdate: 1000000,
    active: true,
  };

  it('returns default state when nothing saved', () => {
    const v = loadVault(1);
    expect(v.totalStaked).toBe(0);
    expect(v.yieldEarned).toBe(0);
    expect(v.active).toBe(false);
  });

  it('persists and loads vault state', () => {
    saveVault(1, state);
    expect(loadVault(1)).toEqual(state);
  });

  it('isolates data between groups', () => {
    saveVault(1, state);
    expect(loadVault(2).totalStaked).toBe(0);
  });
});

// ─── updateVaultYield ─────────────────────────────────────────────────────────

describe('updateVaultYield', () => {
  it('returns unchanged state when not active', () => {
    const state: VaultState = { totalStaked: 1000, yieldEarned: 0, lastUpdate: Date.now() - 1000, active: false };
    const updated = updateVaultYield(state);
    expect(updated).toBe(state); // same reference
  });

  it('returns unchanged state when totalStaked is 0', () => {
    const state: VaultState = { totalStaked: 0, yieldEarned: 0, lastUpdate: Date.now() - 1000, active: true };
    const updated = updateVaultYield(state);
    expect(updated).toBe(state);
  });

  it('accrues yield for active vault with balance', () => {
    const now = Date.now();
    const state: VaultState = {
      totalStaked: 1000,
      yieldEarned: 0,
      lastUpdate: now - 365 * 24 * 60 * 60 * 1000, // 1 year ago
      active: true,
    };
    const updated = updateVaultYield(state, 10); // 10% APY
    expect(updated.yieldEarned).toBeCloseTo(100, 0); // ~10% of 1000
    expect(updated.totalStaked).toBe(1000); // unchanged
    expect(updated.active).toBe(true);
  });

  it('updates lastUpdate to now', () => {
    const before = Date.now();
    const state: VaultState = {
      totalStaked: 500,
      yieldEarned: 0,
      lastUpdate: before - 1000,
      active: true,
    };
    const updated = updateVaultYield(state);
    expect(updated.lastUpdate).toBeGreaterThanOrEqual(before);
  });
});

// ─── getLiveApy — cache and fallback logic ────────────────────────────────────

describe('getLiveApy', () => {
  it('returns MOCK_APY when no env or fetch available', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    // Need fresh module to reset in-memory cache
    vi.resetModules();
    const { getLiveApy, MOCK_APY: mockApy } = await import('./defi');
    const apy = await getLiveApy();
    expect(apy).toBe(mockApy);
  });

  it('returns env APY when VITE_DEFI_APY set and fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    vi.stubEnv('VITE_DEFI_APY', '12.5');
    vi.resetModules();
    const { getLiveApy } = await import('./defi');
    const apy = await getLiveApy();
    expect(apy).toBe(12.5);
  });

  it('returns custom URL APY when VITE_DEFI_APY_URL set', async () => {
    vi.stubEnv('VITE_DEFI_APY_URL', 'http://apy.example.com');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ apy: 9.9 }),
    }));
    vi.resetModules();
    const { getLiveApy } = await import('./defi');
    const apy = await getLiveApy();
    expect(apy).toBe(9.9);
  });

  it('returns Stellar AMM APY when fetch succeeds with pool data', async () => {
    // No VITE_DEFI_APY_URL — goes directly to fetchStellarAmmApy
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        _embedded: {
          records: [{ fee_bp: 30 }], // fee=0.3%, estimatedApy = 0.003 * 182.5 * 100 = 54.75
        },
      }),
    }));
    vi.resetModules();
    const { getLiveApy } = await import('./defi');
    const apy = await getLiveApy();
    expect(apy).toBeGreaterThan(0);
    expect(apy).toBeLessThan(100);
    vi.unstubAllGlobals();
  });

  it('falls back to MOCK_APY when pool data is empty', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ _embedded: { records: [] } }),
    }));
    vi.resetModules();
    const { getLiveApy, MOCK_APY: mockApy } = await import('./defi');
    const apy = await getLiveApy();
    expect(apy).toBe(mockApy);
    vi.unstubAllGlobals();
  });

  it('falls back to MOCK_APY when horizon fetch returns non-ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    vi.resetModules();
    const { getLiveApy, MOCK_APY: mockApy } = await import('./defi');
    const apy = await getLiveApy();
    expect(apy).toBe(mockApy);
    vi.unstubAllGlobals();
  });

  it('returns cached value on second call within TTL', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ _embedded: { records: [{ fee_bp: 30 }] } }),
    }));
    vi.resetModules();
    const { getLiveApy } = await import('./defi');
    const first = await getLiveApy();
    const second = await getLiveApy();
    // fetch called only once
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
    vi.unstubAllGlobals();
  });

  it('falls back to MOCK_APY when AMM APY is out of valid range (>100%)', async () => {
    // fee_bp=1000 → feeRate=0.1 → estimatedApy=1825 → > 100 → null → MOCK_APY
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ _embedded: { records: [{ fee_bp: 1000 }] } }),
    }));
    vi.resetModules();
    const { getLiveApy, MOCK_APY: mockApy } = await import('./defi');
    const apy = await getLiveApy();
    expect(apy).toBe(mockApy);
    vi.unstubAllGlobals();
  });

  it('uses VITE_HORIZON_URL when set', async () => {
    vi.stubEnv('VITE_HORIZON_URL', 'https://custom-horizon.example.com');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ _embedded: { records: [{ fee_bp: 30 }] } }),
    }));
    vi.resetModules();
    const { getLiveApy } = await import('./defi');
    const apy = await getLiveApy();
    expect(apy).toBeGreaterThan(0);
    // verify the custom URL was used
    const fetchCalls = vi.mocked(fetch).mock.calls;
    expect(fetchCalls.some(([url]) => typeof url === 'string' && url.includes('custom-horizon.example.com'))).toBe(true);
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
});
