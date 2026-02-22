export type VoteOption = 'yes' | 'no';

export interface Proposal {
  id: string;
  creator: string;
  title: string;
  description: string;
  votes: Record<string, VoteOption>;
  status: 'active' | 'passed' | 'rejected';
  createdAt: number;
  endsAt: number;
  threshold: number; // Percent needed to pass (e.g. 50)
}

export function loadProposals(groupId: number): Proposal[] {
  const raw = localStorage.getItem(`stellarsplit_proposals_${groupId}`);
  return raw ? JSON.parse(raw) : [];
}

export function saveProposals(groupId: number, proposals: Proposal[]) {
  localStorage.setItem(`stellarsplit_proposals_${groupId}`, JSON.stringify(proposals));
}

export function calculateProposalMetrics(proposal: Proposal, totalMembers: number) {
  const votes = Object.values(proposal.votes);
  const yesVotes = votes.filter(v => v === 'yes').length;
  const noVotes = votes.filter(v => v === 'no').length;
  const totalVotesCast = votes.length;
  
  const yesPercent = totalMembers > 0 ? (yesVotes / totalMembers) * 100 : 0;
  
  return {
    yesVotes,
    noVotes,
    totalVotesCast,
    yesPercent,
    isPassed: yesPercent >= proposal.threshold
  };
}

export function createProposal(
  creator: string, 
  title: string, 
  description: string, 
  durationDays: number = 3
): Omit<Proposal, 'id' | 'status' | 'createdAt' | 'votes'> {
  return {
    creator,
    title,
    description,
    endsAt: Date.now() + (durationDays * 24 * 60 * 60 * 1000),
    threshold: 51,
  };
}
