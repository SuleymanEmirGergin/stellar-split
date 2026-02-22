import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  addExpense, 
  cancelLastExpense, 
  addMember, 
  removeMember,
  settleGroup,
  stakeVault,
  withdrawVault,
  donateVaultYield,
  awardBadge
} from '../lib/contract';
import { useAppStore } from '../store/useAppStore';
import { groupKeys } from './useGroupQuery';

export function useAddExpenseMutation(groupId: number) {
  const queryClient = useQueryClient();
  const callerAddress = useAppStore((state) => state.walletAddress);

  return useMutation({
    mutationFn: ({
      payer, amount, splitAmong, description, category, attachmentUrl
    }: {
      payer: string; amount: number; splitAmong: string[]; description: string; category?: string; attachmentUrl?: string;
    }) => {
      return addExpense(callerAddress, groupId, payer, amount, splitAmong, description, category, attachmentUrl);
    },
    onSuccess: () => {
      // Invalidate the group to update expense_count, and expenses to fetch the new list
      queryClient.invalidateQueries({ queryKey: groupKeys.detail(groupId) });
    },
  });
}

export function useCancelExpenseMutation(groupId: number) {
  const queryClient = useQueryClient();
  const callerAddress = useAppStore((state) => state.walletAddress);

  return useMutation({
    mutationFn: () => cancelLastExpense(callerAddress, groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupKeys.detail(groupId) });
    },
  });
}

export function useAddMemberMutation(groupId: number) {
  const queryClient = useQueryClient();
  const callerAddress = useAppStore((state) => state.walletAddress);

  return useMutation({
    mutationFn: (newMemberAddress: string) => addMember(callerAddress, groupId, newMemberAddress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupKeys.detail(groupId) });
    },
  });
}

export function useRemoveMemberMutation(groupId: number) {
  const queryClient = useQueryClient();
  const callerAddress = useAppStore((state) => state.walletAddress);

  return useMutation({
    mutationFn: (memberAddress: string) => removeMember(callerAddress, groupId, memberAddress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupKeys.detail(groupId) });
    },
  });
}

export function useSettleGroupMutation(groupId: number) {
  const queryClient = useQueryClient();
  const callerAddress = useAppStore((state) => state.walletAddress);

  return useMutation({
    mutationFn: () => settleGroup(callerAddress, groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupKeys.detail(groupId) });
    },
  });
}

export function useStakeVaultMutation(groupId: number) {
  const queryClient = useQueryClient();
  const callerAddress = useAppStore((state) => state.walletAddress);

  return useMutation({
    mutationFn: (amountXlm: number) => stakeVault(callerAddress, groupId, amountXlm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupKeys.vault(groupId) });
    },
  });
}

export function useWithdrawVaultMutation(groupId: number) {
  const queryClient = useQueryClient();
  const callerAddress = useAppStore((state) => state.walletAddress);

  return useMutation({
    mutationFn: (amountXlm: number) => withdrawVault(callerAddress, groupId, amountXlm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupKeys.vault(groupId) });
    },
  });
}

export function useDonateVaultMutation(groupId: number) {
  const queryClient = useQueryClient();
  const callerAddress = useAppStore((state) => state.walletAddress);

  return useMutation({
    mutationFn: ({ amountXlm, address }: { amountXlm: number; address: string }) => 
      donateVaultYield(callerAddress, groupId, amountXlm, address),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupKeys.vault(groupId) });
    },
  });
}

export function useAwardBadgeMutation() {
  const queryClient = useQueryClient();
  const callerAddress = useAppStore((state) => state.walletAddress);

  return useMutation({
    mutationFn: ({ userAddress, badgeId }: { userAddress: string; badgeId: number }) => 
      awardBadge(callerAddress, userAddress, badgeId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: groupKeys.badges(variables.userAddress) });
    },
  });
}
