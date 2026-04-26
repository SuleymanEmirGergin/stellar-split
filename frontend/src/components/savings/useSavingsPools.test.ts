import { describe, it, expect } from 'vitest';
import { deriveSavingsStats } from './useSavingsPools';
import type { BackendSavingsPool } from '../../lib/api';

function pool(overrides: Partial<BackendSavingsPool>): BackendSavingsPool {
  return {
    id: 'p1',
    groupId: 'g1',
    createdById: 'u1',
    title: 'Test pool',
    goalAmount: '100',
    currentAmount: '40',
    currency: 'XLM',
    deadline: null,
    status: 'ACTIVE',
    createdAt: '2026-04-20T00:00:00Z',
    updatedAt: '2026-04-20T00:00:00Z',
    contributions: [],
    ...overrides,
  };
}

describe('deriveSavingsStats', () => {
  it('returns zero stats for an empty list', () => {
    const s = deriveSavingsStats([]);
    expect(s).toEqual({
      totalCurrent: 0,
      totalGoal: 0,
      overallPct: 0,
      activeCount: 0,
      completedCount: 0,
      cancelledCount: 0,
      contributors: [],
    });
  });

  it('sums totalCurrent and totalGoal across ACTIVE pools only', () => {
    const s = deriveSavingsStats([
      pool({ id: 'a', currentAmount: '40', goalAmount: '100', status: 'ACTIVE' }),
      pool({ id: 'b', currentAmount: '30', goalAmount: '50', status: 'ACTIVE' }),
      pool({ id: 'c', currentAmount: '999', goalAmount: '999', status: 'COMPLETED' }), // ignored
      pool({ id: 'd', currentAmount: '999', goalAmount: '999', status: 'CANCELLED' }), // ignored
    ]);
    expect(s.totalCurrent).toBe(70);
    expect(s.totalGoal).toBe(150);
    expect(s.activeCount).toBe(2);
    expect(s.completedCount).toBe(1);
    expect(s.cancelledCount).toBe(1);
  });

  it('computes overallPct correctly and clamps at 100', () => {
    expect(deriveSavingsStats([pool({ currentAmount: '50', goalAmount: '100' })]).overallPct).toBe(50);
    expect(deriveSavingsStats([pool({ currentAmount: '200', goalAmount: '100' })]).overallPct).toBe(100);
    expect(deriveSavingsStats([pool({ currentAmount: '0', goalAmount: '0' })]).overallPct).toBe(0);
  });

  it('rolls up contributors across all non-cancelled pools', () => {
    const s = deriveSavingsStats([
      pool({
        id: 'a',
        status: 'ACTIVE',
        contributions: [
          { id: 'c1', userId: 'u1', amount: '20', note: null, createdAt: '', user: { walletAddress: 'GALICE...AAA' } },
          { id: 'c2', userId: 'u2', amount: '10', note: null, createdAt: '', user: { walletAddress: 'GBOB...BBB' } },
        ],
      }),
      pool({
        id: 'b',
        status: 'COMPLETED',
        contributions: [
          { id: 'c3', userId: 'u1', amount: '15', note: null, createdAt: '', user: { walletAddress: 'GALICE...AAA' } },
        ],
      }),
      pool({
        id: 'c',
        status: 'CANCELLED',
        contributions: [
          { id: 'c4', userId: 'u3', amount: '999', note: null, createdAt: '', user: { walletAddress: 'GCHARLIE...CCC' } },
        ],
      }),
    ]);

    // Cancelled contributions excluded.
    expect(s.contributors).toHaveLength(2);

    // Sorted by totalAmount descending — Alice (35) > Bob (10).
    expect(s.contributors[0]).toEqual({
      walletAddress: 'GALICE...AAA',
      totalAmount: 35,
      share: 35 / 45,
    });
    expect(s.contributors[1]).toEqual({
      walletAddress: 'GBOB...BBB',
      totalAmount: 10,
      share: 10 / 45,
    });
  });

  it('handles missing contributions array gracefully', () => {
    const s = deriveSavingsStats([pool({ contributions: undefined })]);
    expect(s.contributors).toEqual([]);
  });

  it('handles non-numeric amounts as 0 (defensive)', () => {
    const s = deriveSavingsStats([
      pool({
        currentAmount: 'not-a-number' as unknown as string,
        goalAmount: '100',
        contributions: [
          { id: 'c1', userId: 'u1', amount: 'NaN', note: null, createdAt: '', user: { walletAddress: 'GW' } },
        ],
      }),
    ]);
    // currentAmount and the contribution amount both parse to NaN → coerced
    // to 0 so the totals don't poison downstream rendering with NaN.
    expect(s.totalCurrent).toBe(0);
    // The contributor still appears in the rollup but with totalAmount=0
    // and share=0. Filtering zero-amount contributors is the leaderboard's
    // job, not the stat derivation's.
    expect(s.contributors).toEqual([{ walletAddress: 'GW', totalAmount: 0, share: 0 }]);
  });

  it('share sums to 1 across non-empty contributors', () => {
    const s = deriveSavingsStats([
      pool({
        contributions: [
          { id: 'c1', userId: 'u1', amount: '30', note: null, createdAt: '', user: { walletAddress: 'GA' } },
          { id: 'c2', userId: 'u2', amount: '70', note: null, createdAt: '', user: { walletAddress: 'GB' } },
        ],
      }),
    ]);
    const totalShare = s.contributors.reduce((acc, c) => acc + c.share, 0);
    expect(totalShare).toBeCloseTo(1, 6);
  });
});
