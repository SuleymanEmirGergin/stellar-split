import { describe, it, expect } from 'vitest';
import { calculateBadges, BADGES } from './badges';
import { type Expense } from './contract';

const WALLET = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';
const OTHER = 'GAV2XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

function makeExpense(payer: string, amount: number, attachment_url = ''): Expense {
  return {
    id: 1,
    group_id: 1,
    description: 'Test',
    amount,
    payer,
    currency: 'XLM',
    timestamp: Date.now(),
    attachment_url,
  } as Expense;
}

describe('calculateBadges', () => {
  it('returns empty array when no expenses', () => {
    expect(calculateBadges(WALLET, [])).toEqual([]);
  });

  it('awards loyal_payer badge when user has 5+ expenses', () => {
    const expenses = Array.from({ length: 5 }, () => makeExpense(WALLET, 10));
    const badges = calculateBadges(WALLET, expenses);
    expect(badges.some(b => b.id === 'loyal_payer')).toBe(true);
  });

  it('does not award loyal_payer for fewer than 5 expenses', () => {
    const expenses = Array.from({ length: 4 }, () => makeExpense(WALLET, 10));
    const badges = calculateBadges(WALLET, expenses);
    expect(badges.some(b => b.id === 'loyal_payer')).toBe(false);
  });

  it('awards big_spender badge for expense >= 500', () => {
    const expenses = [makeExpense(WALLET, 500)];
    const badges = calculateBadges(WALLET, expenses);
    expect(badges.some(b => b.id === 'big_spender')).toBe(true);
  });

  it('does not award big_spender for expense < 500', () => {
    const expenses = [makeExpense(WALLET, 499)];
    const badges = calculateBadges(WALLET, expenses);
    expect(badges.some(b => b.id === 'big_spender')).toBe(false);
  });

  it('awards ai_explorer badge when expense has attachment_url', () => {
    const expenses = [makeExpense(WALLET, 50, 'https://example.com/receipt.jpg')];
    const badges = calculateBadges(WALLET, expenses);
    expect(badges.some(b => b.id === 'ai_explorer')).toBe(true);
  });

  it('awards frugal badge when user spends less than 80% of average', () => {
    // Total: 100+100+10 = 210, avg per member = 210/3 = 70
    // User total: 10, which is < 70 * 0.8 = 56
    const expenses = [
      makeExpense(OTHER, 100),
      makeExpense(OTHER, 100),
      makeExpense(WALLET, 10),
    ];
    const badges = calculateBadges(WALLET, expenses);
    expect(badges.some(b => b.id === 'frugal')).toBe(true);
  });

  it('does not count expenses by others for loyalty', () => {
    const expenses = Array.from({ length: 10 }, () => makeExpense(OTHER, 50));
    const badges = calculateBadges(WALLET, expenses);
    expect(badges.some(b => b.id === 'loyal_payer')).toBe(false);
  });

  it('can earn multiple badges at once', () => {
    const expenses = [
      ...Array.from({ length: 5 }, () => makeExpense(WALLET, 10)),
      makeExpense(WALLET, 600, 'https://receipt.jpg'),
    ];
    const badges = calculateBadges(WALLET, expenses);
    expect(badges.some(b => b.id === 'loyal_payer')).toBe(true);
    expect(badges.some(b => b.id === 'big_spender')).toBe(true);
    expect(badges.some(b => b.id === 'ai_explorer')).toBe(true);
  });

  it('BADGES constant has 5 defined badges', () => {
    expect(BADGES).toHaveLength(5);
    expect(BADGES.map(b => b.id)).toEqual([
      'loyal_payer', 'settle_master', 'frugal', 'big_spender', 'ai_explorer',
    ]);
  });
});
