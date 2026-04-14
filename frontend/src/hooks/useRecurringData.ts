import { useState, useCallback, useEffect } from 'react';
import {
  type RecurringTemplate,
  loadSubscriptions,
  saveSubscriptions,
  isSubscriptionDue,
  type RecurringStatus,
} from '../lib/recurring';
import {
  useBackendRecurring,
  useCreateRecurringMutation,
  useDeleteRecurringMutation,
} from './useBackendGroups';
import { useAddExpenseMutation } from './useExpenseMutations';
import { track } from '../lib/analytics';
import type { Group } from '../lib/contract';

interface UseRecurringDataOptions {
  groupIdStr: string;
  hasJwt: boolean;
  walletAddress: string;
  group: Group | undefined;
  loading: boolean;
}

export function useRecurringData(
  groupId: number,
  { groupIdStr, hasJwt, walletAddress, group, loading }: UseRecurringDataOptions,
) {
  const { data: backendRecurringData, isLoading: recurringLoading } = useBackendRecurring(
    groupIdStr,
    hasJwt,
  );
  const createRecurringMutation = useCreateRecurringMutation(groupIdStr);
  const deleteRecurringMutation = useDeleteRecurringMutation(groupIdStr);
  const addExpenseMutation = useAddExpenseMutation(groupId);

  const [subscriptions, setSubscriptions] = useState<RecurringTemplate[]>(() =>
    loadSubscriptions(groupId),
  );

  // Sync backend recurring templates into local state (backend takes precedence)
  useEffect(() => {
    if (!hasJwt || !backendRecurringData?.data?.items) return;
    const mapped: RecurringTemplate[] = backendRecurringData.data.items.map((bt) => ({
      id: bt.id,
      name: bt.description,
      amount: bt.amount,
      interval:
        (bt.frequency.toLowerCase() as RecurringTemplate['interval']) === 'daily'
          ? 'daily'
          : (bt.frequency.toLowerCase() as RecurringTemplate['interval']) === 'weekly'
            ? 'weekly'
            : (bt.frequency.toLowerCase() as RecurringTemplate['interval']) === 'yearly'
              ? 'yearly'
              : 'monthly',
      status: bt.isActive ? 'active' : ('paused' as const),
      members: (bt as { memberIds?: string[] }).memberIds ?? [],
      category: '',
      nextDue: new Date(bt.nextDue).getTime(),
      createdAt: new Date(bt.createdAt).getTime(),
    }));
    setSubscriptions(mapped);
  }, [hasJwt, backendRecurringData]);

  // Auto-process due subscriptions
  useEffect(() => {
    if (!group || loading) return;
    const processSubscriptions = async () => {
      const due = subscriptions.filter(isSubscriptionDue);
      if (due.length === 0) return;

      const updatedSubs = [...subscriptions];
      for (const sub of due) {
        try {
          await addExpenseMutation.mutateAsync({
            payer: walletAddress,
            amount: sub.amount * 10_000_000,
            splitAmong: group.members,
            description: `${sub.name} (Auto)`,
            category: '',
          });
          track('expense_added');
          const idx = updatedSubs.findIndex((s) => s.id === sub.id);
          updatedSubs[idx] = { ...sub, lastProcessed: Date.now() };
        } catch (err) {
          console.error(`[StellarSplit] Failed to auto-process subscription ${sub.name}:`, err);
        }
      }
      setSubscriptions(updatedSubs);
      await saveSubscriptions(groupId, updatedSubs);
    };
    processSubscriptions();
  }, [group, loading, subscriptions, walletAddress, groupId, addExpenseMutation]);

  const handleAddSubscription = useCallback(
    async (sub: Omit<RecurringTemplate, 'id' | 'createdAt'>) => {
      if (hasJwt) {
        try {
          await createRecurringMutation.mutateAsync({
            groupId: groupIdStr,
            description: sub.name,
            amount: sub.amount,
            frequency:
              sub.interval === 'daily'
                ? 'DAILY'
                : sub.interval === 'weekly'
                  ? 'WEEKLY'
                  : sub.interval === 'yearly'
                    ? 'YEARLY'
                    : 'MONTHLY',
            nextDue: sub.nextDue ? new Date(sub.nextDue).toISOString() : new Date().toISOString(),
          });
          return;
        } catch {
          // fall through to localStorage
        }
      }
      const newSub: RecurringTemplate = {
        ...sub,
        id: Math.random().toString(36).substr(2, 9),
        createdAt: Date.now(),
      };
      const updated = [...subscriptions, newSub];
      setSubscriptions(updated);
      await saveSubscriptions(groupId, updated);
    },
    [hasJwt, groupIdStr, groupId, subscriptions, createRecurringMutation],
  );

  const handleToggleSubscription = useCallback(
    (id: string) => {
      const updated = subscriptions.map((s) =>
        s.id === id
          ? { ...s, status: (s.status === 'active' ? 'paused' : 'active') as RecurringStatus }
          : s,
      );
      setSubscriptions(updated);
      saveSubscriptions(groupId, updated);
    },
    [subscriptions, groupId],
  );

  const handleDeleteSubscription = useCallback(
    async (id: string) => {
      if (hasJwt) {
        await deleteRecurringMutation.mutateAsync(id);
      } else {
        const updated = subscriptions.filter((s) => s.id !== id);
        setSubscriptions(updated);
        saveSubscriptions(groupId, updated);
      }
    },
    [hasJwt, subscriptions, groupId, deleteRecurringMutation],
  );

  return {
    subscriptions,
    recurringLoading,
    handleAddSubscription,
    handleToggleSubscription,
    handleDeleteSubscription,
  };
}
