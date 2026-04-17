/**
 * Backend-backed React Query hooks for groups, expenses, balances, settlements.
 *
 * These are the REST API equivalents of the Soroban-based hooks in useGroupQuery.ts.
 * Use these when VITE_API_URL is configured and the user is authenticated via SIWS.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  groupsApi,
  expensesApi,
  settlementsApi,
  guardiansApi,
  reputationApi,
  notificationsApi,
  recurringApi,
  auditApi,
  getAccessToken,
  type SplitType,
  type ExpenseSplitInput,
  type CreateRecurringPayload,
  type GroupAnalytics,
} from '../lib/api';
import { useNotificationStore } from '../store/useNotificationStore';

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const backendGroupKeys = {
  all: ['backend', 'groups'] as const,
  list: (search?: string) => [...backendGroupKeys.all, 'list', search ?? ''] as const,
  detail: (id: string) => [...backendGroupKeys.all, id] as const,
  expenses: (id: string) => [...backendGroupKeys.detail(id), 'expenses'] as const,
  balances: (id: string) => [...backendGroupKeys.detail(id), 'balances'] as const,
  settlementPlan: (id: string) => [...backendGroupKeys.detail(id), 'settlement-plan'] as const,
  settlements: (id: string) => [...backendGroupKeys.detail(id), 'settlements'] as const,
  recurring: (id: string) => [...backendGroupKeys.detail(id), 'recurring'] as const,
  audit: (id: string) => [...backendGroupKeys.detail(id), 'audit'] as const,
  analytics: (id: string) => [...backendGroupKeys.detail(id), 'analytics'] as const,
  reputation: () => ['backend', 'reputation'] as const,
  notifications: () => ['backend', 'notifications'] as const,
};

// ─── Query Hooks ──────────────────────────────────────────────────────────────

export function useBackendGroups(search?: string) {
  return useQuery({
    queryKey: backendGroupKeys.list(search),
    queryFn: () => groupsApi.list({ search }),
    staleTime: 30_000,
  });
}

export function useBackendGroup(groupId: string | null) {
  return useQuery({
    queryKey: backendGroupKeys.detail(groupId ?? ''),
    queryFn: () => groupsApi.get(groupId!),
    enabled: !!groupId,
    staleTime: 60_000,
  });
}

export function useBackendExpenses(groupId: string | null) {
  return useQuery({
    queryKey: backendGroupKeys.expenses(groupId ?? ''),
    queryFn: () => expensesApi.list(groupId!),
    enabled: !!groupId,
    staleTime: 30_000,
  });
}

export function useBackendBalances(groupId: string | null) {
  return useQuery({
    queryKey: backendGroupKeys.balances(groupId ?? ''),
    queryFn: () => groupsApi.balances(groupId!),
    enabled: !!groupId,
    staleTime: 30_000,
  });
}

export function useSettlementPlan(groupId: string | null, enabled = true) {
  return useQuery({
    queryKey: backendGroupKeys.settlementPlan(groupId ?? ''),
    queryFn: () => groupsApi.settlementPlan(groupId!),
    enabled: !!groupId && enabled,
    staleTime: 30_000,
  });
}

export function useBackendSettlements(groupId: string | null) {
  return useQuery({
    queryKey: backendGroupKeys.settlements(groupId ?? ''),
    queryFn: () => settlementsApi.list(groupId!),
    enabled: !!groupId,
    staleTime: 30_000,
  });
}

export function useBackendReputation() {
  return useQuery({
    queryKey: backendGroupKeys.reputation(),
    queryFn: () => reputationApi.me(),
    staleTime: 60_000,
  });
}

// ─── Mutation Hooks ───────────────────────────────────────────────────────────

export function useCreateGroupMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, currency, members }: { name: string; currency: 'XLM' | 'USDC'; members?: string[] }) =>
      groupsApi.create(name, currency, members),
    onSuccess: () => qc.invalidateQueries({ queryKey: backendGroupKeys.all }),
  });
}

export function useJoinGroupMutation(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteCode?: string) => groupsApi.join(groupId, inviteCode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: backendGroupKeys.all });
      qc.invalidateQueries({ queryKey: backendGroupKeys.detail(groupId) });
    },
  });
}

export function useLeaveGroupMutation(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => groupsApi.leave(groupId),
    onSuccess: () => qc.invalidateQueries({ queryKey: backendGroupKeys.all }),
  });
}

export function useCreateExpenseMutation(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      description: string;
      amount: number;
      currency: 'XLM' | 'USDC';
      paidBy: string;
      splitType: SplitType;
      splits?: ExpenseSplitInput[];
      receiptUrl?: string;
    }) => expensesApi.create(groupId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: backendGroupKeys.expenses(groupId) });
      qc.invalidateQueries({ queryKey: backendGroupKeys.balances(groupId) });
    },
  });
}

export function useCancelExpenseMutation(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (expenseId: string) => expensesApi.cancel(groupId, expenseId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: backendGroupKeys.expenses(groupId) });
      qc.invalidateQueries({ queryKey: backendGroupKeys.balances(groupId) });
    },
  });
}

export function useRecordSettlementMutation(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ txHash, amount }: { txHash: string; amount: number }) =>
      settlementsApi.create(groupId, txHash, amount),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: backendGroupKeys.settlements(groupId) });
      qc.invalidateQueries({ queryKey: backendGroupKeys.detail(groupId) });
    },
  });
}

// ─── Notifications ────────────────────────────────────────────────────────────

export function useNotifications() {
  const setBackendItems = useNotificationStore((s) => s.setBackendItems);
  const enabled = !!getAccessToken();
  return useQuery({
    queryKey: backendGroupKeys.notifications(),
    queryFn: async () => {
      const res = await notificationsApi.list();
      setBackendItems(res.data.items);
      return res.data.items;
    },
    enabled,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  const markRead = useNotificationStore((s) => s.markRead);
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onMutate: (id) => markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: backendGroupKeys.notifications() }),
  });
}

// ─── Recurring Templates ──────────────────────────────────────────────────────

export function useBackendRecurring(groupId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: backendGroupKeys.recurring(groupId ?? ''),
    queryFn: () => recurringApi.list(groupId!),
    enabled: !!groupId && enabled,
    staleTime: 60_000,
  });
}

export function useCreateRecurringMutation(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRecurringPayload) => recurringApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: backendGroupKeys.recurring(groupId) }),
  });
}

export function useUpdateRecurringMutation(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<CreateRecurringPayload> }) =>
      recurringApi.update(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: backendGroupKeys.recurring(groupId) }),
  });
}

export function useDeleteRecurringMutation(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => recurringApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: backendGroupKeys.recurring(groupId) }),
  });
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export function useBackendAudit(groupId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: backendGroupKeys.audit(groupId ?? ''),
    queryFn: () => auditApi.list(groupId!),
    enabled: !!groupId && enabled,
    staleTime: 30_000,
  });
}

export function useGroupAnalytics(groupId: string | null, enabled = true) {
  return useQuery<GroupAnalytics>({
    queryKey: backendGroupKeys.analytics(groupId ?? ''),
    queryFn: () => groupsApi.analytics(groupId!),
    enabled: !!groupId && enabled,
    staleTime: 60_000,
  });
}

// ─── Transfer Ownership ───────────────────────────────────────────────────────

export function useTransferOwnershipMutation(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (newOwnerId: string) =>
      groupsApi.transferOwnership(groupId, newOwnerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: backendGroupKeys.detail(groupId) });
      qc.invalidateQueries({ queryKey: backendGroupKeys.all });
    },
  });
}

// ─── Settlement Status ────────────────────────────────────────────────────────

export function useUpdateSettlementStatusMutation(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'CONFIRMED' | 'FAILED' }) =>
      settlementsApi.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: backendGroupKeys.settlements(groupId) });
      qc.invalidateQueries({ queryKey: backendGroupKeys.detail(groupId) });
    },
  });
}

// ─── Social Recovery Requests ─────────────────────────────────────────────────

const recoveryKeys = {
  pending: () => ['guardians', 'recovery-requests'] as const,
};

export function usePendingRecoveryRequests(enabled = true) {
  return useQuery({
    queryKey: recoveryKeys.pending(),
    queryFn: () => guardiansApi.listRecoveryRequests(),
    enabled: enabled && !!getAccessToken(),
    staleTime: 30_000,
  });
}

export function useInitiateRecoveryMutation(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => guardiansApi.initiateRecoveryRequest(groupId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recoveryKeys.pending() });
    },
  });
}

export function useApproveRecoveryMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => guardiansApi.approveRecoveryRequest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recoveryKeys.pending() });
    },
  });
}

export function useRejectRecoveryMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => guardiansApi.rejectRecoveryRequest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recoveryKeys.pending() });
    },
  });
}

// ─── Invite Link ──────────────────────────────────────────────────────────────

export function useInviteLink(groupId: string | null, enabled = false) {
  return useQuery({
    queryKey: [...backendGroupKeys.detail(groupId ?? ''), 'invite'] as const,
    queryFn: () => groupsApi.inviteLink(groupId!),
    enabled: !!groupId && enabled,
    staleTime: 300_000, // 5 min — invite codes change rarely
  });
}
