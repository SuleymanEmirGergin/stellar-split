import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../lib/recurring', () => ({
  loadSubscriptions: vi.fn().mockReturnValue([]),
  saveSubscriptions: vi.fn().mockResolvedValue(undefined),
  isSubscriptionDue: vi.fn().mockReturnValue(false),
}));

vi.mock('./useBackendGroups', () => ({
  useBackendRecurring: vi.fn().mockReturnValue({ data: null, isLoading: false }),
  useCreateRecurringMutation: vi.fn().mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({ id: 'r1' }),
  }),
  useDeleteRecurringMutation: vi.fn().mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({}),
  }),
}));

vi.mock('./useExpenseMutations', () => ({
  useAddExpenseMutation: vi.fn().mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('../lib/analytics', () => ({ track: vi.fn() }));

import { useRecurringData } from './useRecurringData';
import { loadSubscriptions, saveSubscriptions } from '../lib/recurring';
import { useBackendRecurring, useCreateRecurringMutation } from './useBackendGroups';

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
}

const BASE_OPTS = {
  groupIdStr: '1',
  hasJwt: false,
  walletAddress: 'GAAA',
  group: undefined,
  loading: true, // prevent auto-process effect
};

const SAMPLE_SUB = {
  name: 'Netflix',
  amount: 15,
  interval: 'monthly' as const,
  status: 'active' as const,
  members: [],
  category: '',
  nextDue: Date.now() + 86400000,
};

describe('useRecurringData', () => {
  let wrapper: ReturnType<typeof makeWrapper>;

  beforeEach(() => {
    wrapper = makeWrapper();
    vi.clearAllMocks();
    (loadSubscriptions as ReturnType<typeof vi.fn>).mockReturnValue([]);
    (useBackendRecurring as ReturnType<typeof vi.fn>).mockReturnValue({ data: null, isLoading: false });
    (useCreateRecurringMutation as ReturnType<typeof vi.fn>).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ id: 'r1' }),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('handleAddSubscription (hasJwt=false) saves to localStorage and updates subscriptions', async () => {
    const { result } = renderHook(
      () => useRecurringData(1, { ...BASE_OPTS, hasJwt: false }),
      { wrapper },
    );
    await act(async () => {
      await result.current.handleAddSubscription(SAMPLE_SUB);
    });
    expect(saveSubscriptions).toHaveBeenCalledWith(1, expect.arrayContaining([
      expect.objectContaining({ name: 'Netflix', amount: 15 }),
    ]));
    expect(result.current.subscriptions).toHaveLength(1);
    expect(result.current.subscriptions[0].name).toBe('Netflix');
  });

  it('handleAddSubscription (hasJwt=true) calls backend mutation', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({ id: 'r1' });
    (useCreateRecurringMutation as ReturnType<typeof vi.fn>).mockReturnValue({ mutateAsync: mockMutateAsync });
    const { result } = renderHook(
      () => useRecurringData(1, { ...BASE_OPTS, hasJwt: true }),
      { wrapper },
    );
    await act(async () => {
      await result.current.handleAddSubscription(SAMPLE_SUB);
    });
    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Netflix', amount: 15, frequency: 'MONTHLY' }),
    );
  });

  it('handleToggleSubscription flips status from active to paused', () => {
    (loadSubscriptions as ReturnType<typeof vi.fn>).mockReturnValueOnce([
      { ...SAMPLE_SUB, id: 's1', status: 'active', createdAt: Date.now() },
    ]);
    const { result } = renderHook(
      () => useRecurringData(1, { ...BASE_OPTS }),
      { wrapper },
    );
    act(() => { result.current.handleToggleSubscription('s1'); });
    expect(result.current.subscriptions[0].status).toBe('paused');
    // Toggle back
    act(() => { result.current.handleToggleSubscription('s1'); });
    expect(result.current.subscriptions[0].status).toBe('active');
  });

  it('handleDeleteSubscription (hasJwt=false) removes item and saves', async () => {
    (loadSubscriptions as ReturnType<typeof vi.fn>).mockReturnValueOnce([
      { ...SAMPLE_SUB, id: 's1', createdAt: Date.now() },
    ]);
    const { result } = renderHook(
      () => useRecurringData(1, { ...BASE_OPTS, hasJwt: false }),
      { wrapper },
    );
    expect(result.current.subscriptions).toHaveLength(1);
    await act(async () => {
      await result.current.handleDeleteSubscription('s1');
    });
    expect(result.current.subscriptions).toHaveLength(0);
    expect(saveSubscriptions).toHaveBeenCalledWith(1, []);
  });

  it('backend sync effect updates subscriptions when data arrives', async () => {
    (useBackendRecurring as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        data: {
          items: [
            {
              id: 'r1',
              description: 'Spotify',
              amount: 10,
              frequency: 'MONTHLY',
              isActive: true,
              nextDue: new Date(Date.now() + 86400000).toISOString(),
              createdAt: new Date().toISOString(),
            },
          ],
        },
      },
      isLoading: false,
    });
    const { result } = renderHook(
      () => useRecurringData(1, { ...BASE_OPTS, hasJwt: true }),
      { wrapper },
    );
    await waitFor(() => {
      expect(result.current.subscriptions).toHaveLength(1);
      expect(result.current.subscriptions[0].name).toBe('Spotify');
      expect(result.current.subscriptions[0].interval).toBe('monthly');
    });
  });
});
