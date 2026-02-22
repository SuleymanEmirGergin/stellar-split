import { useQuery } from '@tanstack/react-query';
import { 
  getGroup, 
  getExpense, 
  getBalances, 
  computeSettlements, 
  isGroupSettled,
  getVault,
  getBadges
} from '../lib/contract';
import { useAppStore } from '../store/useAppStore';

// Query Keys
export const groupKeys = {
  all: ['groups'] as const,
  detail: (groupId: number) => [...groupKeys.all, groupId] as const,
  expenses: (groupId: number) => [...groupKeys.detail(groupId), 'expenses'] as const,
  balances: (groupId: number) => [...groupKeys.detail(groupId), 'balances'] as const,
  settlements: (groupId: number) => [...groupKeys.detail(groupId), 'settlements'] as const,
  isSettled: (groupId: number) => [...groupKeys.detail(groupId), 'isSettled'] as const,
  vault: (groupId: number) => [...groupKeys.detail(groupId), 'vault'] as const,
  badges: (userAddress: string) => ['badges', userAddress] as const,
};

export function useGroup(groupId: number) {
  const callerAddress = useAppStore((state) => state.walletAddress);

  return useQuery({
    queryKey: groupKeys.detail(groupId),
    queryFn: () => getGroup(callerAddress, groupId),
    enabled: !!callerAddress && !!groupId,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
}

const MAX_EXPENSE_PROBE = 200;

// Fetches expenses: uses expense_count when > 0; when 0, probes ids 0,1,2,... until missing (handles old contract or wrong count).
export function useGroupExpenses(groupId: number, expenseCount: number) {
  const callerAddress = useAppStore((state) => state.walletAddress);

  return useQuery({
    queryKey: groupKeys.expenses(groupId),
    queryFn: async () => {
      const count = typeof expenseCount === 'number' && expenseCount >= 0 ? expenseCount : 0;
      if (count > 0) {
        const results = await Promise.allSettled(
          Array.from({ length: count }, (_, i) => getExpense(callerAddress, groupId, i))
        );
        const expenses = results
          .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof getExpense>>> => r.status === 'fulfilled')
          .map((r) => r.value);
        return expenses.sort((a, b) => a.id - b.id);
      }
      // expense_count 0: probe from id 0 until getExpense throws (expense not found / missing)
      const list: Awaited<ReturnType<typeof getExpense>>[] = [];
      for (let i = 0; i < MAX_EXPENSE_PROBE; i++) {
        try {
          const exp = await getExpense(callerAddress, groupId, i);
          list.push(exp);
        } catch {
          break;
        }
      }
      return list.sort((a, b) => a.id - b.id);
    },
    enabled: !!callerAddress && !!groupId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useBalances(groupId: number) {
  const callerAddress = useAppStore((state) => state.walletAddress);

  return useQuery({
    queryKey: groupKeys.balances(groupId),
    queryFn: () => getBalances(callerAddress, groupId),
    enabled: !!callerAddress && !!groupId,
    staleTime: 1000 * 60,
  });
}

export function useGroupSettlements(groupId: number) {
  const callerAddress = useAppStore((state) => state.walletAddress);

  return useQuery({
    queryKey: groupKeys.settlements(groupId),
    queryFn: () => computeSettlements(callerAddress, groupId),
    enabled: !!callerAddress && !!groupId,
    staleTime: 1000 * 60,
  });
}

export function useIsGroupSettled(groupId: number) {
  const callerAddress = useAppStore((state) => state.walletAddress);

  return useQuery({
    queryKey: groupKeys.isSettled(groupId),
    queryFn: () => isGroupSettled(callerAddress, groupId),
    enabled: !!callerAddress && !!groupId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useVault(groupId: number) {
  const callerAddress = useAppStore((state) => state.walletAddress);

  return useQuery({
    queryKey: groupKeys.vault(groupId),
    queryFn: () => getVault(callerAddress, groupId),
    enabled: !!callerAddress && !!groupId,
    staleTime: 1000 * 15, // 15 seconds refresh for vault yield
  });
}

export function useBadges(userAddress: string) {
  const callerAddress = useAppStore((state) => state.walletAddress);

  return useQuery({
    queryKey: groupKeys.badges(userAddress),
    queryFn: () => getBadges(callerAddress, userAddress),
    enabled: !!callerAddress && !!userAddress,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}
