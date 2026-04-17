import { describe, it, expect, vi, afterEach } from 'vitest';
import { predictBestSettlementTime, getAIPredictiveInsight } from './predictive_ai';

describe('predictBestSettlementTime', () => {
  afterEach(() => vi.useRealTimers());

  it('recommends settling now when balance is > 3x debt (high liquidity)', () => {
    const result = predictBestSettlementTime([], 1000, 100);
    expect(result.confidence).toBe(0.95);
    expect(result.recommendedDate).toContain('Şimdi');
  });

  it('recommends waiting until month start when day > 24 and liquidity is low', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-28'));
    const result = predictBestSettlementTime([], 100, 200);
    expect(result.confidence).toBe(0.82);
    expect(result.recommendedDate).toContain('Gelecek Hafta');
    vi.useRealTimers();
  });

  it('recommends settling in 2 days for balanced mid-month scenario', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15'));
    const result = predictBestSettlementTime([], 100, 200);
    expect(result.confidence).toBe(0.75);
    expect(result.recommendedDate).toContain('2 Gün');
    vi.useRealTimers();
  });

  it('returns a projectedLiquidity field in all cases', () => {
    const result = predictBestSettlementTime([], 500, 50);
    expect(typeof result.projectedLiquidity).toBe('number');
  });

  it('handles empty expenses array without throwing', () => {
    expect(() => predictBestSettlementTime([], 0, 0)).not.toThrow();
  });

  it('uses last 10 expenses for average calculation', () => {
    const expenses = Array.from({ length: 15 }, (_, i) => ({ amount: String((i + 1) * 10_000_000) }));
    const result = predictBestSettlementTime(expenses, 5000, 100);
    expect(result).toBeDefined();
  });
});

describe('getAIPredictiveInsight', () => {
  it('returns a congratulatory message when debt is 0', () => {
    const msg = getAIPredictiveInsight('Alice', 0);
    expect(msg).toContain('Alice');
    expect(msg.toLowerCase()).toMatch(/harika/i);
  });

  it('returns a warning message when debt is over 1000', () => {
    const msg = getAIPredictiveInsight('Bob', 1500);
    expect(msg).toContain('Bob');
    expect(msg).toContain('yüksek');
  });

  it('returns a moderate message for manageable debt', () => {
    const msg = getAIPredictiveInsight('Carol', 500);
    expect(msg).toContain('yönetilebilir');
  });

  it('includes the user name in every message variant', () => {
    expect(getAIPredictiveInsight('Dave', 0)).toContain('Dave');
    expect(getAIPredictiveInsight('Dave', 2000)).toContain('Dave');
    expect(getAIPredictiveInsight('Dave', 300)).toBeDefined();
  });
});
