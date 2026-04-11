import { simplifyDebts, type NetBalance } from './debt-simplification';

describe('simplifyDebts()', () => {
  // ─── basic cases ─────────────────────────────────────────────────────────────

  it('returns empty array when all balances are zero', () => {
    const balances: NetBalance[] = [
      { userId: 'a', balance: 0 },
      { userId: 'b', balance: 0 },
    ];
    expect(simplifyDebts(balances)).toEqual([]);
  });

  it('returns empty array for empty input', () => {
    expect(simplifyDebts([])).toEqual([]);
  });

  it('handles single creditor and single debtor', () => {
    const balances: NetBalance[] = [
      { userId: 'a', balance: 100 },
      { userId: 'b', balance: -100 },
    ];

    const result = simplifyDebts(balances);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ fromUserId: 'b', toUserId: 'a', amount: 100 });
  });

  // ─── 3-member classic case ────────────────────────────────────────────────────

  it('compresses 3-member debts into 2 transfers', () => {
    // A paid for everything: owes +60+20 = +80
    // B owes -60, C owes -20
    const balances: NetBalance[] = [
      { userId: 'A', balance: 80 },
      { userId: 'B', balance: -60 },
      { userId: 'C', balance: -20 },
    ];

    const result = simplifyDebts(balances);

    expect(result).toHaveLength(2);
    // Total transferred must equal total debt
    const totalTransferred = result.reduce((sum, t) => sum + t.amount, 0);
    expect(totalTransferred).toBeCloseTo(80, 5);
  });

  // ─── multiple creditors ───────────────────────────────────────────────────────

  it('2 creditors + 1 debtor → 2 transfers', () => {
    const balances: NetBalance[] = [
      { userId: 'A', balance: 60 },  // creditor
      { userId: 'B', balance: 40 },  // creditor
      { userId: 'C', balance: -100 }, // debtor
    ];

    const result = simplifyDebts(balances);

    expect(result).toHaveLength(2);
    const toA = result.find(t => t.toUserId === 'A');
    const toB = result.find(t => t.toUserId === 'B');
    expect(toA?.amount).toBeCloseTo(60, 5);
    expect(toB?.amount).toBeCloseTo(40, 5);
  });

  // ─── chain simplification ─────────────────────────────────────────────────────

  it('eliminates pass-through debts: A→B→C→A chain becomes 0 transfers', () => {
    // Circular: everyone owes everyone else the same amount → net zero
    const balances: NetBalance[] = [
      { userId: 'A', balance: 0 },
      { userId: 'B', balance: 0 },
      { userId: 'C', balance: 0 },
    ];

    const result = simplifyDebts(balances);
    expect(result).toHaveLength(0);
  });

  // ─── total amount conservation ────────────────────────────────────────────────

  it('sum of all transfers equals sum of positive balances', () => {
    const balances: NetBalance[] = [
      { userId: 'A', balance: 150 },
      { userId: 'B', balance: -90 },
      { userId: 'C', balance: -60 },
      { userId: 'D', balance: 30 },
      { userId: 'E', balance: -30 },
    ];

    const result = simplifyDebts(balances);
    const totalPositive = balances.filter(b => b.balance > 0).reduce((sum, b) => sum + b.balance, 0);
    const totalTransferred = result.reduce((sum, t) => sum + t.amount, 0);

    expect(totalTransferred).toBeCloseTo(totalPositive, 4);
  });

  // ─── net zero invariant ───────────────────────────────────────────────────────

  it('all fromUserId and toUserId are unique per resolved balance', () => {
    const balances: NetBalance[] = [
      { userId: 'A', balance: 50 },
      { userId: 'B', balance: -20 },
      { userId: 'C', balance: -30 },
    ];

    const result = simplifyDebts(balances);

    // Every transfer must have different from/to
    for (const t of result) {
      expect(t.fromUserId).not.toBe(t.toUserId);
    }
  });

  // ─── float rounding ───────────────────────────────────────────────────────────

  it('rounds amounts to 7 decimal places (XLM stroops precision)', () => {
    const balances: NetBalance[] = [
      { userId: 'A', balance: 100 / 3 },   // 33.333...
      { userId: 'B', balance: 100 / 3 },   // 33.333...
      { userId: 'C', balance: -(200 / 3) }, // -66.666...
    ];

    const result = simplifyDebts(balances);

    for (const t of result) {
      const decimals = t.amount.toString().split('.')[1]?.length ?? 0;
      expect(decimals).toBeLessThanOrEqual(7);
    }
  });

  // ─── large group ─────────────────────────────────────────────────────────────

  it('handles 10-member group and transfers.length < member count', () => {
    // 5 creditors owed 20 each, 5 debtors owing 20 each
    const balances: NetBalance[] = [
      ...Array.from({ length: 5 }, (_, i) => ({ userId: `creditor-${i}`, balance: 20 })),
      ...Array.from({ length: 5 }, (_, i) => ({ userId: `debtor-${i}`, balance: -20 })),
    ];

    const result = simplifyDebts(balances);

    // With equal amounts this should be exactly 5 transfers (each debtor pays one creditor)
    expect(result).toHaveLength(5);
    for (const t of result) {
      expect(t.amount).toBe(20);
    }
  });
});
