import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../lib/contract', () => ({
  addExpense: vi.fn().mockResolvedValue(undefined),
  cancelLastExpense: vi.fn().mockResolvedValue(undefined),
  addMember: vi.fn().mockResolvedValue(undefined),
  removeMember: vi.fn().mockResolvedValue(undefined),
  settleGroup: vi.fn().mockResolvedValue(undefined),
  stakeVault: vi.fn().mockResolvedValue(undefined),
  withdrawVault: vi.fn().mockResolvedValue(undefined),
  donateVaultYield: vi.fn().mockResolvedValue(undefined),
  awardBadge: vi.fn().mockResolvedValue(undefined),
  isDemoMode: vi.fn().mockReturnValue(false),
}));

vi.mock('../store/useAppStore', () => ({
  useAppStore: (selector: (s: { walletAddress: string }) => unknown) =>
    selector({ walletAddress: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF' }),
}));

// ─── Imports after mocks ──────────────────────────────────────────────────────

import {
  useAddExpenseMutation,
  useCancelExpenseMutation,
  useAddMemberMutation,
  useSettleGroupMutation,
  useAwardBadgeMutation,
} from './useExpenseMutations';
import {
  addExpense,
  cancelLastExpense,
  addMember,
  settleGroup,
  awardBadge,
} from '../lib/contract';

// ─── Wrapper ──────────────────────────────────────────────────────────────────

const createWrapper = () => {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useExpenseMutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useAddExpenseMutation calls addExpense', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useAddExpenseMutation(1), { wrapper });

    await result.current.mutateAsync({
      payer: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      amount: 100,
      splitAmong: ['GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF'],
      description: 'Test expense',
      category: 'food',
    });

    await waitFor(() => {
      expect(addExpense).toHaveBeenCalledTimes(1);
    });
  });

  it('useCancelExpenseMutation calls cancelLastExpense', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useCancelExpenseMutation(1), { wrapper });

    await result.current.mutateAsync();

    await waitFor(() => {
      expect(cancelLastExpense).toHaveBeenCalledTimes(1);
    });
  });

  it('useAddMemberMutation calls addMember', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useAddMemberMutation(1), { wrapper });

    await result.current.mutateAsync('GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB');

    await waitFor(() => {
      expect(addMember).toHaveBeenCalledTimes(1);
    });
  });

  it('useSettleGroupMutation calls settleGroup', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useSettleGroupMutation(1), { wrapper });

    await result.current.mutateAsync();

    await waitFor(() => {
      expect(settleGroup).toHaveBeenCalledTimes(1);
    });
  });

  it('useAwardBadgeMutation calls awardBadge', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useAwardBadgeMutation(), { wrapper });

    await result.current.mutateAsync({
      userAddress: 'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
      badgeId: 1,
    });

    await waitFor(() => {
      expect(awardBadge).toHaveBeenCalledTimes(1);
    });
  });
});
