import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the API/hook dependencies
vi.mock('./useBackendGroups', () => ({
  useBackendRecurring: vi.fn(() => ({ data: undefined, isLoading: false })),
  useCreateRecurringMutation: vi.fn(() => ({ mutateAsync: vi.fn().mockResolvedValue({}) })),
  useDeleteRecurringMutation: vi.fn(() => ({ mutateAsync: vi.fn().mockResolvedValue({}) })),
}));

vi.mock('./useExpenseMutations', () => ({
  useAddExpenseMutation: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
  })),
}));

vi.mock('../lib/analytics', () => ({ track: vi.fn() }));

import { useBackendRecurring, useCreateRecurringMutation, useDeleteRecurringMutation } from './useBackendGroups';
import { useAddExpenseMutation } from './useExpenseMutations';
import { useRecurringData } from './useRecurringData';
import { saveSubscriptions } from '../lib/recurring';
import type { Group } from '../lib/contract';

const mockUseBackendRecurring = vi.mocked(useBackendRecurring);
const mockUseCreateRecurring = vi.mocked(useCreateRecurringMutation);
const mockUseDeleteRecurring = vi.mocked(useDeleteRecurringMutation);
const mockUseAddExpense = vi.mocked(useAddExpenseMutation);

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
};

const defaultOpts = {
  groupIdStr: 'g1',
  hasJwt: false,
  walletAddress: 'GA',
  group: undefined,
  loading: false,
};

const mockGroup: Group = {
  id: 1,
  name: 'Test',
  creator: 'GA',
  members: ['GA', 'GB'],
  owner: 'GA',
  expense_count: 0,
  is_settled: false,
  currency: 'XLM',
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mockUseBackendRecurring.mockReturnValue({ data: undefined, isLoading: false } as ReturnType<typeof useBackendRecurring>);
  mockUseCreateRecurring.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue({}) } as unknown as ReturnType<typeof useCreateRecurringMutation>);
  mockUseDeleteRecurring.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue({}) } as unknown as ReturnType<typeof useDeleteRecurringMutation>);
  mockUseAddExpense.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue({}) } as unknown as ReturnType<typeof useAddExpenseMutation>);
});

// ─── Initial state ────────────────────────────────────────────────────────────

describe('useRecurringData — initial state', () => {
  it('returns empty subscriptions when nothing saved', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useRecurringData(1, defaultOpts), { wrapper });
    expect(result.current.subscriptions).toEqual([]);
  });

  it('loads subscriptions from localStorage on init', () => {
    const sub = {
      id: 's1', name: 'Netflix', amount: 15, interval: 'monthly' as const,
      members: ['GA'], category: 'entertainment', createdAt: Date.now(),
    };
    void saveSubscriptions(1, [sub]);
    const wrapper = createWrapper();
    const { result } = renderHook(() => useRecurringData(1, defaultOpts), { wrapper });
    expect(result.current.subscriptions).toHaveLength(1);
    expect(result.current.subscriptions[0]!.name).toBe('Netflix');
  });
});

// ─── Backend sync ─────────────────────────────────────────────────────────────

describe('useRecurringData — backend sync', () => {
  it('syncs subscriptions from backend data when hasJwt=true', async () => {
    const backendItem = {
      id: 'r1', description: 'Spotify', amount: 10, frequency: 'MONTHLY',
      isActive: true, nextDue: '2026-06-01T00:00:00Z', createdAt: '2026-01-01T00:00:00Z',
    };
    mockUseBackendRecurring.mockReturnValue({
      data: { data: { items: [backendItem] } },
      isLoading: false,
    } as ReturnType<typeof useBackendRecurring>);

    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useRecurringData(1, { ...defaultOpts, hasJwt: true }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.subscriptions).toHaveLength(1);
      expect(result.current.subscriptions[0]!.name).toBe('Spotify');
    });
  });

  it('does not sync when hasJwt=false', async () => {
    const backendItem = {
      id: 'r1', description: 'Spotify', amount: 10, frequency: 'MONTHLY',
      isActive: true, nextDue: '2026-06-01T00:00:00Z', createdAt: '2026-01-01T00:00:00Z',
    };
    mockUseBackendRecurring.mockReturnValue({
      data: { data: { items: [backendItem] } },
      isLoading: false,
    } as ReturnType<typeof useBackendRecurring>);

    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useRecurringData(1, { ...defaultOpts, hasJwt: false }),
      { wrapper },
    );

    // No sync without JWT
    expect(result.current.subscriptions).toHaveLength(0);
  });
});

// ─── handleAddSubscription ────────────────────────────────────────────────────

describe('handleAddSubscription', () => {
  it('adds subscription to local state when hasJwt=false', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useRecurringData(1, defaultOpts), { wrapper });

    await act(async () => {
      await result.current.handleAddSubscription({
        name: 'YouTube', amount: 12, interval: 'monthly',
        members: ['GA'], category: 'entertainment',
      });
    });

    expect(result.current.subscriptions).toHaveLength(1);
    expect(result.current.subscriptions[0]!.name).toBe('YouTube');
  });

  it('calls createRecurringMutation.mutateAsync when hasJwt=true', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({});
    mockUseCreateRecurring.mockReturnValue({ mutateAsync: mockMutateAsync } as unknown as ReturnType<typeof useCreateRecurringMutation>);

    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useRecurringData(1, { ...defaultOpts, hasJwt: true }),
      { wrapper },
    );

    await act(async () => {
      await result.current.handleAddSubscription({
        name: 'Netflix', amount: 15, interval: 'monthly',
        members: ['GA'], category: 'entertainment',
      });
    });

    expect(mockMutateAsync).toHaveBeenCalled();
  });

  it('sends WEEKLY frequency for weekly interval', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({});
    mockUseCreateRecurring.mockReturnValue({ mutateAsync: mockMutateAsync } as unknown as ReturnType<typeof useCreateRecurringMutation>);

    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useRecurringData(1, { ...defaultOpts, hasJwt: true }),
      { wrapper },
    );

    await act(async () => {
      await result.current.handleAddSubscription({
        name: 'Weekly Clean', amount: 10, interval: 'weekly',
        members: [], category: '',
      });
    });

    expect(mockMutateAsync).toHaveBeenCalledWith(expect.objectContaining({ frequency: 'WEEKLY' }));
  });

  it('sends YEARLY frequency for yearly interval', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({});
    mockUseCreateRecurring.mockReturnValue({ mutateAsync: mockMutateAsync } as unknown as ReturnType<typeof useCreateRecurringMutation>);

    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useRecurringData(1, { ...defaultOpts, hasJwt: true }),
      { wrapper },
    );

    await act(async () => {
      await result.current.handleAddSubscription({
        name: 'Annual Fee', amount: 100, interval: 'yearly',
        members: [], category: '',
        nextDue: '2027-01-01',
      });
    });

    expect(mockMutateAsync).toHaveBeenCalledWith(expect.objectContaining({ frequency: 'YEARLY' }));
  });

  it('sends DAILY frequency for daily interval', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({});
    mockUseCreateRecurring.mockReturnValue({ mutateAsync: mockMutateAsync } as unknown as ReturnType<typeof useCreateRecurringMutation>);

    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useRecurringData(1, { ...defaultOpts, hasJwt: true }),
      { wrapper },
    );

    await act(async () => {
      await result.current.handleAddSubscription({
        name: 'Daily Coffee', amount: 3, interval: 'daily',
        members: [], category: '',
      });
    });

    expect(mockMutateAsync).toHaveBeenCalledWith(expect.objectContaining({ frequency: 'DAILY' }));
  });

  it('falls back to localStorage when createRecurringMutation throws', async () => {
    mockUseCreateRecurring.mockReturnValue({
      mutateAsync: vi.fn().mockRejectedValue(new Error('API error')),
    } as unknown as ReturnType<typeof useCreateRecurringMutation>);

    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useRecurringData(1, { ...defaultOpts, hasJwt: true }),
      { wrapper },
    );

    await act(async () => {
      await result.current.handleAddSubscription({
        name: 'Fallback', amount: 5, interval: 'weekly',
        members: [], category: '',
      });
    });

    expect(result.current.subscriptions).toHaveLength(1);
  });
});

// ─── handleToggleSubscription ─────────────────────────────────────────────────

describe('handleToggleSubscription', () => {
  it('toggles subscription status from active to paused', async () => {
    const sub = {
      id: 's1', name: 'N', amount: 10, interval: 'monthly' as const,
      members: [], category: '', createdAt: Date.now(), status: 'active' as const,
    };
    void saveSubscriptions(1, [sub]);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useRecurringData(1, defaultOpts), { wrapper });

    act(() => {
      result.current.handleToggleSubscription('s1');
    });

    expect(result.current.subscriptions[0]!.status).toBe('paused');
  });

  it('toggles from paused back to active', async () => {
    const sub = {
      id: 's1', name: 'N', amount: 10, interval: 'monthly' as const,
      members: [], category: '', createdAt: Date.now(), status: 'paused' as const,
    };
    void saveSubscriptions(1, [sub]);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useRecurringData(1, defaultOpts), { wrapper });

    act(() => {
      result.current.handleToggleSubscription('s1');
    });

    expect(result.current.subscriptions[0]!.status).toBe('active');
  });

  it('only toggles the matching subscription, leaves others unchanged', async () => {
    const subs = [
      { id: 's1', name: 'A', amount: 10, interval: 'monthly' as const, members: [], category: '', createdAt: Date.now(), status: 'active' as const },
      { id: 's2', name: 'B', amount: 20, interval: 'monthly' as const, members: [], category: '', createdAt: Date.now(), status: 'active' as const },
    ];
    void saveSubscriptions(1, subs);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useRecurringData(1, defaultOpts), { wrapper });

    act(() => {
      result.current.handleToggleSubscription('s1');
    });

    expect(result.current.subscriptions[0]!.status).toBe('paused'); // toggled
    expect(result.current.subscriptions[1]!.status).toBe('active'); // unchanged (: s branch)
  });
});

// ─── handleDeleteSubscription ─────────────────────────────────────────────────

describe('handleDeleteSubscription', () => {
  it('removes subscription locally when hasJwt=false', async () => {
    const sub = {
      id: 's1', name: 'N', amount: 10, interval: 'monthly' as const,
      members: [], category: '', createdAt: Date.now(),
    };
    void saveSubscriptions(1, [sub]);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useRecurringData(1, defaultOpts), { wrapper });

    await act(async () => {
      await result.current.handleDeleteSubscription('s1');
    });

    expect(result.current.subscriptions).toHaveLength(0);
  });

  it('calls deleteRecurringMutation when hasJwt=true', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({});
    mockUseDeleteRecurring.mockReturnValue({ mutateAsync: mockMutateAsync } as unknown as ReturnType<typeof useDeleteRecurringMutation>);

    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useRecurringData(1, { ...defaultOpts, hasJwt: true }),
      { wrapper },
    );

    await act(async () => {
      await result.current.handleDeleteSubscription('s1');
    });

    expect(mockMutateAsync).toHaveBeenCalledWith('s1');
  });
});

// ─── Auto-process due subscriptions ──────────────────────────────────────────

describe('auto-process due subscriptions', () => {
  it('calls addExpenseMutation for due subscriptions when group is available', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({});
    mockUseAddExpense.mockReturnValue({ mutateAsync: mockMutateAsync } as unknown as ReturnType<typeof useAddExpenseMutation>);

    const dueSub = {
      id: 's1', name: 'Netflix', amount: 15, interval: 'monthly' as const,
      members: ['GA'], category: 'entertainment',
      createdAt: Date.now() - 40 * 24 * 60 * 60 * 1000, // 40 days ago
    };
    void saveSubscriptions(1, [dueSub]);

    const wrapper = createWrapper();
    renderHook(
      () => useRecurringData(1, { ...defaultOpts, group: mockGroup }),
      { wrapper },
    );

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled();
    });
  });

  it('does not auto-process when group is undefined', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({});
    mockUseAddExpense.mockReturnValue({ mutateAsync: mockMutateAsync } as unknown as ReturnType<typeof useAddExpenseMutation>);

    const wrapper = createWrapper();
    renderHook(
      () => useRecurringData(1, { ...defaultOpts, group: undefined }),
      { wrapper },
    );

    await new Promise((r) => setTimeout(r, 50));
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('logs error and continues when addExpenseMutation throws', async () => {
    const mockMutateAsync = vi.fn().mockRejectedValue(new Error('Expense failed'));
    mockUseAddExpense.mockReturnValue({ mutateAsync: mockMutateAsync } as unknown as ReturnType<typeof useAddExpenseMutation>);

    const dueSub = {
      id: 's1', name: 'Failing Sub', amount: 5, interval: 'monthly' as const,
      members: ['GA'], category: 'food',
      createdAt: Date.now() - 40 * 24 * 60 * 60 * 1000,
    };
    void saveSubscriptions(1, [dueSub]);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const wrapper = createWrapper();
    renderHook(() => useRecurringData(1, { ...defaultOpts, group: mockGroup }), { wrapper });

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled();
    });
    consoleSpy.mockRestore();
  });
});

// ─── Backend sync — interval mapping ─────────────────────────────────────────

describe('useRecurringData — backend interval mapping', () => {
  it.each([
    ['DAILY', 'daily'],
    ['WEEKLY', 'weekly'],
    ['YEARLY', 'yearly'],
    ['MONTHLY', 'monthly'],
  ])('maps %s frequency to %s interval', async (frequency, expected) => {
    const backendItem = {
      id: 'r1', description: 'Sub', amount: 5, frequency,
      isActive: true, nextDue: '2026-06-01T00:00:00Z', createdAt: '2026-01-01T00:00:00Z',
    };
    mockUseBackendRecurring.mockReturnValue({
      data: { data: { items: [backendItem] } },
      isLoading: false,
    } as ReturnType<typeof useBackendRecurring>);

    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useRecurringData(1, { ...defaultOpts, hasJwt: true }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.subscriptions).toHaveLength(1);
    });
    expect(result.current.subscriptions[0]!.interval).toBe(expected);
  });
});
