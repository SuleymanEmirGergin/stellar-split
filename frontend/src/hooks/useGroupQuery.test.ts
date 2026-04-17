import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const MOCK_GROUP = {
  id: 1,
  name: 'Test Group',
  members: ['GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF'],
  expense_count: 0,
  is_settled: false,
};

const MOCK_BALANCES = [
  { address: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', balance: 0 },
];

const MOCK_BADGES = [{ id: 1, name: 'First Expense' }];

vi.mock('../lib/contract', () => ({
  getGroup: vi.fn().mockResolvedValue({
    id: 1,
    name: 'Test Group',
    members: ['GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF'],
    expense_count: 0,
    is_settled: false,
  }),
  getExpense: vi.fn().mockRejectedValue(new Error('not found')),
  getBalances: vi.fn().mockResolvedValue([
    { address: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', balance: 0 },
  ]),
  computeSettlements: vi.fn().mockResolvedValue([]),
  isGroupSettled: vi.fn().mockResolvedValue(false),
  getVault: vi.fn().mockResolvedValue({ balance: 0 }),
  getBadges: vi.fn().mockResolvedValue([{ id: 1, name: 'First Expense' }]),
  isDemoMode: vi.fn().mockReturnValue(false),
}));

vi.mock('../store/useAppStore', () => ({
  useAppStore: (selector: (s: { walletAddress: string }) => unknown) =>
    selector({ walletAddress: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF' }),
}));

// ─── Imports after mocks ──────────────────────────────────────────────────────

import {
  groupKeys,
  useGroup,
  useGroupExpenses,
  useBalances,
  useBadges,
} from './useGroupQuery';
import { getGroup, getBalances, getBadges } from '../lib/contract';

// ─── Wrapper ──────────────────────────────────────────────────────────────────

const createWrapper = () => {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useGroupQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('groupKeys.detail(1) returns expected key structure', () => {
    expect(groupKeys.detail(1)).toEqual(['groups', 1]);
  });

  it('useGroup(1) calls getGroup with groupId and returns data', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useGroup(1), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(getGroup).toHaveBeenCalledWith(
      'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      1,
    );
    expect(result.current.data).not.toBeUndefined();
    expect(result.current.data).toEqual(MOCK_GROUP);
  });

  it('useGroupExpenses(1, 3) calls getExpense for each index', async () => {
    const { getExpense } = await import('../lib/contract');
    // Make getExpense resolve for indices 0..2
    vi.mocked(getExpense)
      .mockResolvedValueOnce({ id: 0, description: 'A', amount: 10, payer: 'G', splitAmong: [], category: '' } as never)
      .mockResolvedValueOnce({ id: 1, description: 'B', amount: 20, payer: 'G', splitAmong: [], category: '' } as never)
      .mockResolvedValueOnce({ id: 2, description: 'C', amount: 30, payer: 'G', splitAmong: [], category: '' } as never);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useGroupExpenses(1, 3), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(getExpense).toHaveBeenCalledTimes(3);
  });

  it('useBalances(1) calls getBalances with groupId', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useBalances(1), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(getBalances).toHaveBeenCalledWith(
      'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      1,
    );
    expect(result.current.data).toEqual(MOCK_BALANCES);
  });

  it('useBadges calls getBadges with the user address', async () => {
    const address = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
    const wrapper = createWrapper();
    const { result } = renderHook(() => useBadges(address), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(getBadges).toHaveBeenCalledWith(
      'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      address,
    );
    expect(result.current.data).toEqual(MOCK_BADGES);
  });
});
