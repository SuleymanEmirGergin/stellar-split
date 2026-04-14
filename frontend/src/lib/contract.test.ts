import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createGroup,
  getGroup,
  getBalances,
  computeSettlements,
  type Settlement,
} from './contract';
import { useAppStore } from '../store/useAppStore';

const MOCK_CALLER = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';

describe('contract (demo mode)', () => {
  const demoKey = 'stellarsplit_demo_mode';
  const groupsKey = 'stellarsplit_groups';

  beforeEach(() => {
    localStorage.setItem(demoKey, 'true');
    localStorage.setItem(groupsKey, '[]');
    useAppStore.getState().setDemoMode(true);
  });

  afterEach(() => {
    useAppStore.getState().setDemoMode(false);
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

  it('getGroup in demo returns consistent shape for any group id', async () => {
    const g = await getGroup(MOCK_CALLER, 999);
    expect(g.id).toBe(999);
    expect(g.name).toContain('999');
    expect(Array.isArray(g.members)).toBe(true);
    expect(g.members.length).toBeGreaterThanOrEqual(1);
    expect(typeof g.creator).toBe('string');
    expect(typeof g.expense_count).toBe('number');
  });
});

describe('contract (validation)', () => {
  const demoKey = 'stellarsplit_demo_mode';

  afterEach(() => {
    useAppStore.getState().setDemoMode(false);
    localStorage.removeItem(demoKey);
  });

  it('createGroup throws when fewer than 2 unique members (non-demo path)', async () => {
    useAppStore.getState().setDemoMode(false);
    await expect(
      createGroup(MOCK_CALLER, 'Solo', [MOCK_CALLER], 'XLM')
    ).rejects.toThrow(/En az 2 üye|at least 2/i);
  });
});
