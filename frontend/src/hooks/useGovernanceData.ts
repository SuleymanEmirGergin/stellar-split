import { useState, useCallback } from 'react';
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

export function useGovernanceData(groupId: number, walletAddress: string) {
  const [proposals, setProposals] = useState<Proposal[]>(() => loadProposals(groupId));
  const [disputes, setDisputes] = useState<Dispute[]>(() => loadDisputes(groupId));
  const [showAddPropose, setShowAddPropose] = useState(false);
  const [newPropTitle, setNewPropTitle] = useState('');
  const [newPropDesc, setNewPropDesc] = useState('');

  const handleAddProposal = useCallback(() => {
    if (!newPropTitle.trim()) return;
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
    const updated = [newProp, ...proposals];
    setProposals(updated);
    saveProposals(groupId, updated);
    setShowAddPropose(false);
    setNewPropTitle('');
    setNewPropDesc('');
  }, [walletAddress, newPropTitle, newPropDesc, proposals, groupId]);

  const handleVote = useCallback(
    (proposalId: string, option: VoteOption) => {
      const updated = proposals.map((p) =>
        p.id === proposalId ? { ...p, votes: { ...p.votes, [walletAddress]: option } } : p,
      );
      setProposals(updated);
      saveProposals(groupId, updated);
    },
    [proposals, walletAddress, groupId],
  );

  const handleInitiateDispute = useCallback(
    (expId: string, amount: number, category: string, description: string) => {
      const newDispute = initiateDispute(walletAddress, expId, amount, category, description);
      const updated = [...disputes, newDispute];
      setDisputes(updated);
      saveDisputes(groupId, updated);
      return newDispute;
    },
    [walletAddress, disputes, groupId],
  );

  return {
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
  };
}
