/**
 * Savings hook + stats derivation.
 *
 * Wraps `savingsApi.listByGroup` in TanStack Query and projects the raw
 * pool list into the aggregate metrics + contributor leaderboard the
 * redesigned UI needs. See:
 *   - ADR-0001 (hybrid backend-primary source of truth)
 *   - docs/design/savings-redesign.md (component anatomy)
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { savingsApi, type BackendSavingsPool } from '../../lib/api';

export interface SavingsContributorRollup {
  walletAddress: string;
  totalAmount: number;
  /** Share of the group's total contributed amount, in [0, 1]. */
  share: number;
}

export interface SavingsStats {
  totalCurrent: number;
  totalGoal: number;
  /** Aggregate goal completion percentage in [0, 100]. */
  overallPct: number;
  activeCount: number;
  completedCount: number;
  cancelledCount: number;
  contributors: SavingsContributorRollup[];
}

export interface UseSavingsPoolsResult {
  pools: BackendSavingsPool[];
  stats: SavingsStats;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

/** Pure helper exported for testing — no React, no network. */
export function deriveSavingsStats(pools: BackendSavingsPool[]): SavingsStats {
  let totalCurrent = 0;
  let totalGoal = 0;
  let activeCount = 0;
  let completedCount = 0;
  let cancelledCount = 0;
  const rollup = new Map<string, number>();

  for (const pool of pools) {
    if (pool.status === 'ACTIVE') {
      activeCount += 1;
      totalCurrent += parseFloat(pool.currentAmount) || 0;
      totalGoal += parseFloat(pool.goalAmount) || 0;
    } else if (pool.status === 'COMPLETED') {
      completedCount += 1;
    } else if (pool.status === 'CANCELLED') {
      cancelledCount += 1;
    }

    // Roll up contributors across ACTIVE + COMPLETED only — cancelled
    // contributions don't belong on the leaderboard.
    if (pool.status === 'CANCELLED') continue;
    for (const c of pool.contributions ?? []) {
      const wallet = c.user?.walletAddress ?? 'unknown';
      const amount = parseFloat(c.amount) || 0;
      rollup.set(wallet, (rollup.get(wallet) ?? 0) + amount);
    }
  }

  const totalContributed = Array.from(rollup.values()).reduce((s, n) => s + n, 0);
  const contributors: SavingsContributorRollup[] = Array.from(rollup.entries())
    .map(([walletAddress, totalAmount]) => ({
      walletAddress,
      totalAmount,
      share: totalContributed > 0 ? totalAmount / totalContributed : 0,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);

  const overallPct = totalGoal > 0 ? Math.min(100, (totalCurrent / totalGoal) * 100) : 0;

  return {
    totalCurrent,
    totalGoal,
    overallPct,
    activeCount,
    completedCount,
    cancelledCount,
    contributors,
  };
}

export function useSavingsPools(groupId: string): UseSavingsPoolsResult {
  const { data, isLoading, isError, refetch } = useQuery<BackendSavingsPool[]>({
    queryKey: ['savings', groupId],
    queryFn: () => savingsApi.listByGroup(groupId),
    refetchInterval: 30_000,
    enabled: !!groupId,
    // Drop the stale-while-revalidate flicker — savings data isn't
    // expensive enough to keep showing old contributor counts.
    staleTime: 10_000,
  });

  const pools = data ?? [];
  const stats = useMemo(() => deriveSavingsStats(pools), [pools]);

  return { pools, stats, isLoading, isError, refetch: () => void refetch() };
}
