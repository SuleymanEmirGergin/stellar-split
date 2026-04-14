import { formatXlmWithUsd, formatStroopsWithUsd } from './xlmPrice';

// fetchXlmPriceAndChange uses module-level cache; import dynamically per describe block
// to get a fresh module with cleared cache state.

describe('formatXlmWithUsd', () => {
  it('formats with USD when price is provided', () => {
    expect(formatXlmWithUsd(10, 0.2)).toBe('10.00 XLM ≈ $2.00');
  });

  it('returns XLM only when price is null', () => {
    expect(formatXlmWithUsd(5, null)).toBe('5.00 XLM');
  });

  it('returns XLM only when price is 0', () => {
    expect(formatXlmWithUsd(5, 0)).toBe('5.00 XLM');
  });

  it('uses 4 decimal places for small USD amounts (< $1)', () => {
    expect(formatXlmWithUsd(1, 0.1)).toBe('1.00 XLM ≈ $0.1000');
  });

  it('uses 2 decimal places for USD amounts >= $1', () => {
    expect(formatXlmWithUsd(100, 0.5)).toBe('100.00 XLM ≈ $50.00');
  });

  it('formats zero XLM', () => {
    expect(formatXlmWithUsd(0, 0.5)).toBe('0.00 XLM ≈ $0.0000');
  });
});

describe('formatStroopsWithUsd', () => {
  it('converts stroops to XLM then formats', () => {
    // 10_000_000 stroops = 1 XLM
    expect(formatStroopsWithUsd(10_000_000, 0.2)).toBe('1.00 XLM ≈ $0.2000');
  });

  it('returns XLM only when price is null', () => {
    expect(formatStroopsWithUsd(10_000_000, null)).toBe('1.00 XLM');
  });

  it('handles fractional XLM', () => {
    // 5_000_000 stroops = 0.5 XLM
    const result = formatStroopsWithUsd(5_000_000, null);
    expect(result).toBe('0.50 XLM');
  });
});

describe('fetchXlmPriceAndChange', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('returns price and change on successful fetch', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200,
      json: () => Promise.resolve({ stellar: { usd: 0.25, usd_24h_change: 1.5 } }),
    }));
    const { fetchXlmPriceAndChange } = await import('./xlmPrice');
    const result = await fetchXlmPriceAndChange();
    expect(result?.price).toBe(0.25);
    expect(result?.change).toBe(1.5);
    vi.unstubAllGlobals();
  });

  it('returns null when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    const { fetchXlmPriceAndChange } = await import('./xlmPrice');
    const result = await fetchXlmPriceAndChange();
    expect(result).toBeNull();
    vi.unstubAllGlobals();
  });

  it('returns null on 429 with no cache', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 429 }));
    const { fetchXlmPriceAndChange } = await import('./xlmPrice');
    const result = await fetchXlmPriceAndChange();
    expect(result).toBeNull();
    vi.unstubAllGlobals();
  });

  it('returns null when price is missing in response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200,
      json: () => Promise.resolve({ stellar: {} }),
    }));
    const { fetchXlmPriceAndChange } = await import('./xlmPrice');
    const result = await fetchXlmPriceAndChange();
    expect(result).toBeNull();
    vi.unstubAllGlobals();
  });

  it('fetchXlmUsd returns just the price', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200,
      json: () => Promise.resolve({ stellar: { usd: 0.3, usd_24h_change: -0.5 } }),
    }));
    const { fetchXlmUsd } = await import('./xlmPrice');
    const price = await fetchXlmUsd();
    expect(price).toBe(0.3);
    vi.unstubAllGlobals();
  });
});
