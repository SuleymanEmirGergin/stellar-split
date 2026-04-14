import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  type Proposal,
  loadProposals,
  saveProposals,
  type VoteOption,
  type Dispute,
  loadDisputes,
  saveDisputes,
  initiateDispute,
} from '../lib/governance';
import { governanceApi, type BackendProposal, type BackendDispute } from '../lib/api';

// ─── Mappers — backend shape → frontend Proposal/Dispute types ───────────────

function toFrontendProposal(p: BackendProposal): Proposal {
  const votes: Record<string, VoteOption> = {};
  for (const v of p.votes) {
    votes[v.voter.walletAddress] = v.option as VoteOption;
  }
  return {
    id: p.id,
    creator: p.creator.walletAddress,
    title: p.title,
    description: p.description,
    votes,
    status: p.status.toLowerCase() as 'active' | 'passed' | 'rejected',
    createdAt: new Date(p.createdAt).getTime(),
    endsAt: new Date(p.endsAt).getTime(),
    threshold: p.threshold,
  };
}

function toFrontendDispute(d: BackendDispute): Dispute {
  return {
    id: d.id,
    initiator: d.initiator.walletAddress,
    expenseId: d.expenseId,
    amount: parseFloat(d.amount),
    category: d.category,
    description: d.description,
    votes: {},
    status: d.status.toLowerCase() as 'open' | 'resolved' | 'dismissed',
    createdAt: new Date(d.createdAt).getTime(),
  };
}

// ─── Query keys ──────────────────────────────────────────────────────────────

export const governanceKeys = {
  proposals: (groupId: string) => ['governance', 'proposals', groupId] as const,
  disputes: (groupId: string) => ['governance', 'disputes', groupId] as const,
};

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useGovernanceData(
  groupId: number,
  walletAddress: string,
  opts: { hasJwt?: boolean; groupIdStr?: string } = {},
) {
  const { hasJwt = false, groupIdStr } = opts;
  const queryClient = useQueryClient();

  // ─── Form state (shared between both modes) ────────────────────────────────
  const [showAddPropose, setShowAddPropose] = useState(false);
  const [newPropTitle, setNewPropTitle] = useState('');
  const [newPropDesc, setNewPropDesc] = useState('');

  // ─── Backend mode — React Query ───────────────────────────────────────────
  const proposalsQuery = useQuery({
    queryKey: governanceKeys.proposals(groupIdStr ?? String(groupId)),
    queryFn: () => governanceApi.listProposals(groupIdStr!),
    enabled: hasJwt && !!groupIdStr,
    select: (data) => data.map(toFrontendProposal),
    staleTime: 30_000,
  });

  const disputesQuery = useQuery({
    queryKey: governanceKeys.disputes(groupIdStr ?? String(groupId)),
    queryFn: () => governanceApi.listDisputes(groupIdStr!),
    enabled: hasJwt && !!groupIdStr,
    select: (data) => data.map(toFrontendDispute),
    staleTime: 30_000,
  });

  const createProposalMutation = useMutation({
    mutationFn: (payload: Parameters<typeof governanceApi.createProposal>[0]) =>
      governanceApi.createProposal(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: governanceKeys.proposals(groupIdStr ?? String(groupId)) });
    },
  });

  const castVoteMutation = useMutation({
    mutationFn: ({ proposalId, option }: { proposalId: string; option: 'yes' | 'no' }) =>
      governanceApi.castVote(proposalId, option),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: governanceKeys.proposals(groupIdStr ?? String(groupId)) });
    },
  });

  const createDisputeMutation = useMutation({
    mutationFn: (payload: Parameters<typeof governanceApi.createDispute>[0]) =>
      governanceApi.createDispute(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: governanceKeys.disputes(groupIdStr ?? String(groupId)) });
    },
  });

  // ─── Local-storage mode state (for demo / unauthenticated) ────────────────
  const [localProposals, setLocalProposals] = useState<Proposal[]>(() => loadProposals(groupId));
  const [localDisputes, setLocalDisputes] = useState<Dispute[]>(() => loadDisputes(groupId));

  // ─── Unified data ─────────────────────────────────────────────────────────
  const proposals = hasJwt ? (proposalsQuery.data ?? []) : localProposals;
  const disputes = hasJwt ? (disputesQuery.data ?? []) : localDisputes;

  // ─── setDisputes passthrough (used by GroupDetail for dispute initiation) ──
  const setDisputes = useCallback(
    (updated: Dispute[]) => {
      if (!hasJwt) {
        setLocalDisputes(updated);
        saveDisputes(groupId, updated);
      }
      // In backend mode, invalidate query to refetch
      else {
        queryClient.invalidateQueries({ queryKey: governanceKeys.disputes(groupIdStr ?? String(groupId)) });
      }
    },
    [hasJwt, groupId, groupIdStr, queryClient],
  );

  // ─── Action handlers ──────────────────────────────────────────────────────

  const handleAddProposal = useCallback(() => {
    if (!newPropTitle.trim()) return;

    if (hasJwt && groupIdStr) {
      createProposalMutation.mutate({
        groupId: groupIdStr,
        title: newPropTitle,
        description: newPropDesc,
        endsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      });
    } else {
      const newProp: Proposal = {
        id: Math.random().toString(36).substr(2, 9),
        creator: walletAddress,
        title: newPropTitle,
        description: newPropDesc,
        votes: {},
        status: 'active',
        createdAt: Date.now(),
        endsAt: Date.now() + 3 * 24 * 60 * 60 * 1000,
        threshold: 51,
      };
      const updated = [newProp, ...localProposals];
      setLocalProposals(updated);
      saveProposals(groupId, updated);
    }

    setShowAddPropose(false);
    setNewPropTitle('');
    setNewPropDesc('');
  }, [
    hasJwt, groupIdStr, walletAddress, newPropTitle, newPropDesc,
    localProposals, groupId, createProposalMutation,
  ]);

  const handleVote = useCallback(
    (proposalId: string, option: VoteOption) => {
      if (hasJwt) {
        castVoteMutation.mutate({ proposalId, option });
      } else {
        const updated = localProposals.map((p) =>
          p.id === proposalId ? { ...p, votes: { ...p.votes, [walletAddress]: option } } : p,
        );
        setLocalProposals(updated);
        saveProposals(groupId, updated);
      }
    },
    [hasJwt, castVoteMutation, localProposals, walletAddress, groupId],
  );

  const handleInitiateDispute = useCallback(
    (expId: string, amount: number, category: string, description: string) => {
      if (hasJwt && groupIdStr) {
        createDisputeMutation.mutate({ groupId: groupIdStr, expenseId: expId, amount, category, description });
        // Return a placeholder — GroupDetail only uses this for toast
        return { id: 'pending', initiator: walletAddress, expenseId: expId, amount, category, description, votes: {}, status: 'open' as const, createdAt: Date.now() };
      }
      const newDispute = initiateDispute(walletAddress, expId, amount, category, description);
      const updated = [...localDisputes, newDispute];
      setLocalDisputes(updated);
      saveDisputes(groupId, updated);
      return newDispute;
    },
    [hasJwt, groupIdStr, walletAddress, localDisputes, groupId, createDisputeMutation],
  );

  return useMemo(() => ({
    proposals,
    disputes,
    setDisputes,
    showAddPropose,
    setShowAddPropose,
    newPropTitle,
    setNewPropTitle,
    newPropDesc,
    setNewPropDesc,
    handleAddProposal,
    handleVote,
    handleInitiateDispute,
  }), [
    proposals, disputes, setDisputes,
    showAddPropose, setShowAddPropose, newPropTitle, newPropDesc,
    handleAddProposal, handleVote, handleInitiateDispute,
  ]);
}
