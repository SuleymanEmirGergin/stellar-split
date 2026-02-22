import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createGroup,
  getGroup,
  getBalances,
  computeSettlements,
  type Settlement,
} from './contract';

const MOCK_CALLER = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';

describe('contract (demo mode)', () => {
  const demoKey = 'stellarsplit_demo_mode';
  const groupsKey = 'stellarsplit_groups';

  beforeEach(() => {
    localStorage.setItem(demoKey, 'true');
    localStorage.setItem(groupsKey, '[]');
  });

  afterEach(() => {
    localStorage.removeItem(demoKey);
    localStorage.removeItem(groupsKey);
  });

  it('createGroup returns a number in demo mode', async () => {
    const id = await createGroup(MOCK_CALLER, 'Test Group', [MOCK_CALLER, 'GBR3DEMO1'], 'XLM');
    expect(typeof id).toBe('number');
    expect(id).toBeGreaterThanOrEqual(100);
    expect(id).toBeLessThanOrEqual(1100);
  });

  it('getGroup returns a valid Group in demo mode', async () => {
    const group = await getGroup(MOCK_CALLER, 1);
    expect(group).toMatchObject({
      id: 1,
      name: 'Grup #1 (Demo)',
      creator: MOCK_CALLER,
      owner: MOCK_CALLER,
      expense_count: 5,
      currency: 'XLM',
    });
    expect(Array.isArray(group.members)).toBe(true);
    expect(group.members.length).toBeGreaterThanOrEqual(1);
  });

  it('getBalances returns a Map in demo mode', async () => {
    const balances = await getBalances(MOCK_CALLER, 1);
    expect(balances instanceof Map).toBe(true);
    expect(balances.get(MOCK_CALLER)).toBe(-150);
  });

  it('computeSettlements returns array of Settlement in demo mode', async () => {
    const settlements = await computeSettlements(MOCK_CALLER, 1);
    expect(Array.isArray(settlements)).toBe(true);
    expect(settlements.length).toBeGreaterThan(0);
    settlements.forEach((s: Settlement) => {
      expect(typeof s.from).toBe('string');
      expect(typeof s.to).toBe('string');
      expect(typeof s.amount).toBe('number');
    });
  });
});
