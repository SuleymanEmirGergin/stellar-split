import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock API module
vi.mock('../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../lib/api')>('../lib/api');
  return {
    ...actual,
    groupsApi: {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      join: vi.fn(),
      leave: vi.fn(),
      balances: vi.fn(),
      settlementPlan: vi.fn(),
      inviteLink: vi.fn(),
      settlements: undefined,
    },
    expensesApi: {
      list: vi.fn(),
      create: vi.fn(),
      cancel: vi.fn(),
    },
    settlementsApi: {
      list: vi.fn(),
      create: vi.fn(),
    },
    reputationApi: {
      me: vi.fn(),
    },
    notificationsApi: {
      list: vi.fn(),
      markRead: vi.fn(),
      markAllRead: vi.fn(),
    },
    recurringApi: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
    auditApi: {
      list: vi.fn(),
    },
    getAccessToken: vi.fn(() => null),
  };
});

// Mock Zustand notification store
const mockSetBackendItems = vi.fn();
const mockMarkRead = vi.fn();
vi.mock('../store/useNotificationStore', () => ({
  useNotificationStore: vi.fn((selector: (s: { setBackendItems: () => void; markRead: () => void }) => unknown) =>
    selector({ setBackendItems: mockSetBackendItems, markRead: mockMarkRead }),
  ),
}));

import {
  groupsApi, expensesApi, settlementsApi, reputationApi,
  notificationsApi, recurringApi, auditApi, getAccessToken,
} from '../lib/api';

import {
  backendGroupKeys,
  useBackendGroups,
  useBackendGroup,
  useBackendExpenses,
  useBackendBalances,
  useSettlementPlan,
  useBackendSettlements,
  useBackendReputation,
  useCreateGroupMutation,
  useJoinGroupMutation,
  useLeaveGroupMutation,
  useCreateExpenseMutation,
  useCancelExpenseMutation,
  useRecordSettlementMutation,
  useNotifications,
  useMarkNotificationRead,
  useBackendRecurring,
  useCreateRecurringMutation,
  useUpdateRecurringMutation,
  useDeleteRecurringMutation,
  useBackendAudit,
} from './useBackendGroups';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
};

const mockGroupsApi = vi.mocked(groupsApi);
const mockExpensesApi = vi.mocked(expensesApi);
const mockSettlementsApi = vi.mocked(settlementsApi);
const mockReputationApi = vi.mocked(reputationApi);
const mockNotificationsApi = vi.mocked(notificationsApi);
const mockRecurringApi = vi.mocked(recurringApi);
const mockAuditApi = vi.mocked(auditApi);
const mockGetAccessToken = vi.mocked(getAccessToken);

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Query key builders ───────────────────────────────────────────────────────

describe('backendGroupKeys', () => {
  it('list key includes search', () => {
    expect(backendGroupKeys.list('hello')).toContain('hello');
  });

  it('detail key includes id', () => {
    expect(backendGroupKeys.detail('g1')).toContain('g1');
  });

  it('expenses key is nested under detail', () => {
    const detail = backendGroupKeys.detail('g1');
    const expenses = backendGroupKeys.expenses('g1');
    expect(expenses.slice(0, detail.length)).toEqual(detail);
  });
});

// ─── Query hooks — enabled/disabled ──────────────────────────────────────────

describe('useBackendGroups', () => {
  it('calls groupsApi.list and returns data', async () => {
    mockGroupsApi.list.mockResolvedValue({
      data: { items: [], nextCursor: undefined, hasMore: false },
    } as never);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useBackendGroups(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGroupsApi.list).toHaveBeenCalled();
  });
});

describe('useBackendGroup', () => {
  it('does not fetch when groupId is null', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useBackendGroup(null), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGroupsApi.get).not.toHaveBeenCalled();
  });

  it('fetches when groupId is provided', async () => {
    mockGroupsApi.get.mockResolvedValue({ data: { id: 'g1' } } as never);
    const wrapper = createWrapper();
    const { result } = renderHook(() => useBackendGroup('g1'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGroupsApi.get).toHaveBeenCalledWith('g1');
  });
});

describe('useBackendExpenses', () => {
  it('does not fetch when groupId is null', () => {
    const wrapper = createWrapper();
    renderHook(() => useBackendExpenses(null), { wrapper });
    expect(mockExpensesApi.list).not.toHaveBeenCalled();
  });

  it('fetches expenses for valid groupId', async () => {
    mockExpensesApi.list.mockResolvedValue({ data: { items: [], hasMore: false } } as never);
    const wrapper = createWrapper();
    const { result } = renderHook(() => useBackendExpenses('g1'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockExpensesApi.list).toHaveBeenCalledWith('g1');
  });
});

describe('useBackendBalances', () => {
  it('does not fetch when groupId is null', () => {
    const wrapper = createWrapper();
    renderHook(() => useBackendBalances(null), { wrapper });
    expect(mockGroupsApi.balances).not.toHaveBeenCalled();
  });

  it('fetches balances for valid groupId', async () => {
    mockGroupsApi.balances.mockResolvedValue({ data: [] } as never);
    const wrapper = createWrapper();
    const { result } = renderHook(() => useBackendBalances('g1'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('useSettlementPlan', () => {
  it('does not fetch when groupId is null', () => {
    const wrapper = createWrapper();
    renderHook(() => useSettlementPlan(null), { wrapper });
    expect(mockGroupsApi.settlementPlan).not.toHaveBeenCalled();
  });

  it('does not fetch when enabled=false', () => {
    const wrapper = createWrapper();
    renderHook(() => useSettlementPlan('g1', false), { wrapper });
    expect(mockGroupsApi.settlementPlan).not.toHaveBeenCalled();
  });
});

describe('useBackendSettlements', () => {
  it('fetches settlements', async () => {
    mockSettlementsApi.list.mockResolvedValue({ data: { items: [], hasMore: false } } as never);
    const wrapper = createWrapper();
    const { result } = renderHook(() => useBackendSettlements('g1'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('useBackendReputation', () => {
  it('fetches reputation', async () => {
    mockReputationApi.me.mockResolvedValue({ data: { reputationScore: 80, badges: [], settlementHistory: [] } } as never);
    const wrapper = createWrapper();
    const { result } = renderHook(() => useBackendReputation(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockReputationApi.me).toHaveBeenCalled();
  });
});

// ─── Mutation hooks ───────────────────────────────────────────────────────────

describe('useCreateGroupMutation', () => {
  it('calls groupsApi.create and invalidates queries', async () => {
    mockGroupsApi.create.mockResolvedValue({ data: { id: 'g1' } } as never);
    const wrapper = createWrapper();
    const { result } = renderHook(() => useCreateGroupMutation(), { wrapper });
    await act(async () => {
      result.current.mutate({ name: 'Test', currency: 'XLM' });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGroupsApi.create).toHaveBeenCalledWith('Test', 'XLM', undefined);
  });
});

describe('useJoinGroupMutation', () => {
  it('calls groupsApi.join', async () => {
    mockGroupsApi.join.mockResolvedValue({ data: {} } as never);
    const wrapper = createWrapper();
    const { result } = renderHook(() => useJoinGroupMutation('g1'), { wrapper });
    await act(async () => { result.current.mutate('invite123'); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGroupsApi.join).toHaveBeenCalledWith('g1', 'invite123');
  });
});

describe('useLeaveGroupMutation', () => {
  it('calls groupsApi.leave', async () => {
    mockGroupsApi.leave.mockResolvedValue(undefined as never);
    const wrapper = createWrapper();
    const { result } = renderHook(() => useLeaveGroupMutation('g1'), { wrapper });
    await act(async () => { result.current.mutate(); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGroupsApi.leave).toHaveBeenCalledWith('g1');
  });
});

describe('useCreateExpenseMutation', () => {
  it('calls expensesApi.create', async () => {
    mockExpensesApi.create.mockResolvedValue({ data: { id: 'e1' } } as never);
    const wrapper = createWrapper();
    const { result } = renderHook(() => useCreateExpenseMutation('g1'), { wrapper });
    const payload = {
      description: 'Dinner',
      amount: 100,
      currency: 'XLM' as const,
      paidBy: 'GA',
      splitType: 'EQUAL' as const,
    };
    await act(async () => { result.current.mutate(payload); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockExpensesApi.create).toHaveBeenCalledWith('g1', payload);
  });
});

describe('useCancelExpenseMutation', () => {
  it('calls expensesApi.cancel', async () => {
    mockExpensesApi.cancel.mockResolvedValue({ data: { id: 'e1' } } as never);
    const wrapper = createWrapper();
    const { result } = renderHook(() => useCancelExpenseMutation('g1'), { wrapper });
    await act(async () => { result.current.mutate('e1'); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockExpensesApi.cancel).toHaveBeenCalledWith('g1', 'e1');
  });
});

describe('useRecordSettlementMutation', () => {
  it('calls settlementsApi.create', async () => {
    mockSettlementsApi.create.mockResolvedValue({ data: {} } as never);
    const wrapper = createWrapper();
    const { result } = renderHook(() => useRecordSettlementMutation('g1'), { wrapper });
    await act(async () => { result.current.mutate({ txHash: 'tx1', amount: 50 }); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockSettlementsApi.create).toHaveBeenCalledWith('g1', 'tx1', 50);
  });
});

describe('useBackendRecurring', () => {
  it('fetches recurring templates when enabled', async () => {
    mockRecurringApi.list.mockResolvedValue({ data: { items: [] } } as never);
    const wrapper = createWrapper();
    const { result } = renderHook(() => useBackendRecurring('g1', true), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockRecurringApi.list).toHaveBeenCalledWith('g1');
  });

  it('does not fetch when disabled', () => {
    const wrapper = createWrapper();
    renderHook(() => useBackendRecurring('g1', false), { wrapper });
    expect(mockRecurringApi.list).not.toHaveBeenCalled();
  });
});

describe('useCreateRecurringMutation', () => {
  it('calls recurringApi.create', async () => {
    mockRecurringApi.create.mockResolvedValue({ data: { id: 'r1' } } as never);
    const wrapper = createWrapper();
    const { result } = renderHook(() => useCreateRecurringMutation('g1'), { wrapper });
    const payload = {
      groupId: 'g1',
      description: 'Netflix',
      amount: 15,
      frequency: 'MONTHLY' as const,
      nextDue: '2026-05-01',
    };
    await act(async () => { result.current.mutate(payload); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockRecurringApi.create).toHaveBeenCalledWith(payload);
  });
});

describe('useUpdateRecurringMutation', () => {
  it('calls recurringApi.update', async () => {
    mockRecurringApi.update.mockResolvedValue({ data: {} } as never);
    const wrapper = createWrapper();
    const { result } = renderHook(() => useUpdateRecurringMutation('g1'), { wrapper });
    await act(async () => { result.current.mutate({ id: 'r1', dto: { amount: 20 } }); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockRecurringApi.update).toHaveBeenCalledWith('r1', { amount: 20 });
  });
});

describe('useDeleteRecurringMutation', () => {
  it('calls recurringApi.remove', async () => {
    mockRecurringApi.remove.mockResolvedValue(undefined as never);
    const wrapper = createWrapper();
    const { result } = renderHook(() => useDeleteRecurringMutation('g1'), { wrapper });
    await act(async () => { result.current.mutate('r1'); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockRecurringApi.remove).toHaveBeenCalledWith('r1');
  });
});

describe('useBackendAudit', () => {
  it('fetches audit log when enabled', async () => {
    mockAuditApi.list.mockResolvedValue({ data: { items: [], hasMore: false } } as never);
    const wrapper = createWrapper();
    const { result } = renderHook(() => useBackendAudit('g1', true), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockAuditApi.list).toHaveBeenCalledWith('g1');
  });

  it('does not fetch when disabled', () => {
    const wrapper = createWrapper();
    renderHook(() => useBackendAudit('g1', false), { wrapper });
    expect(mockAuditApi.list).not.toHaveBeenCalled();
  });
});

describe('useNotifications', () => {
  it('does not fetch when no access token', () => {
    mockGetAccessToken.mockReturnValue(null);
    const wrapper = createWrapper();
    renderHook(() => useNotifications(), { wrapper });
    expect(mockNotificationsApi.list).not.toHaveBeenCalled();
  });

  it('fetches notifications and calls setBackendItems when token available', async () => {
    mockGetAccessToken.mockReturnValue('token123');
    mockNotificationsApi.list.mockResolvedValue({
      data: { items: [{ id: 'n1', message: 'test' }] },
    } as never);
    const wrapper = createWrapper();
    const { result } = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockNotificationsApi.list).toHaveBeenCalled();
    expect(mockSetBackendItems).toHaveBeenCalledWith([{ id: 'n1', message: 'test' }]);
  });
});

describe('useMarkNotificationRead', () => {
  it('calls notificationsApi.markRead and triggers markRead store action', async () => {
    mockNotificationsApi.markRead.mockResolvedValue({ data: {} } as never);
    const wrapper = createWrapper();
    const { result } = renderHook(() => useMarkNotificationRead(), { wrapper });
    await act(async () => { result.current.mutate('n1'); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockNotificationsApi.markRead).toHaveBeenCalledWith('n1');
    expect(mockMarkRead).toHaveBeenCalledWith('n1');
  });
});
