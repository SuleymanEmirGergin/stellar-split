import { type Badge } from './badges';

export interface Proposal {
  id: string;
  title: string;
  description: string;
  category: 'Rule' | 'Feature' | 'Community' | 'Finance';
  voteCount: { yes: number; no: number; abstain: number };
  status: 'Active' | 'Passed' | 'Rejected' | 'Expired';
  endTime: number;
  proposer: string;
}

export type CreditTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';

export interface SocialCreditProfile {
  karma: number;
  tier: CreditTier;
  votingPower: number;
  benefits: string[];
  nextTierProgress: number; // 0-100
}

/**
 * Calculates Social Credit standing based on Karma and Badges.
 */
export function calculateSocialCredit(karma: number, badges: Badge[]): SocialCreditProfile {
  let tier: CreditTier = 'Bronze';
  const benefits = ['Core Access', 'Standard Fees'];
  
  // Power is Karma + 5 per badge
  const votingPower = karma + (badges.length * 5);
  
  if (karma >= 1000) {
    tier = 'Diamond';
    benefits.push('Zero Interest Micro-loans', 'Protocol Fee Waived', 'Priority Support');
  } else if (karma >= 500) {
    tier = 'Platinum';
    benefits.push('50% Fee Discount', 'Early Access to Yield Vaults');
  } else if (karma >= 250) {
    tier = 'Gold';
    benefits.push('20% Fee Discount');
  } else if (karma >= 100) {
    tier = 'Silver';
    benefits.push('10% Fee Discount');
  }

  // Calculate progress to next tier (simplified)
  let progress = 0;
  if (tier === 'Bronze') progress = Math.min(100, (karma / 100) * 100);
  else if (tier === 'Silver') progress = Math.min(100, ((karma - 100) / 150) * 100);
  else if (tier === 'Gold') progress = Math.min(100, ((karma - 250) / 250) * 100);
  else if (tier === 'Platinum') progress = Math.min(100, ((karma - 500) / 500) * 100);
  else progress = 100;

  return { karma, tier, votingPower, benefits, nextTierProgress: progress };
}

/**
 * Mock proposals for the DAO dashboard
 */
export const MOCK_PROPOSALS: Proposal[] = [
  {
    id: 'PROP-001',
    title: 'Increase Early Settlement Karma',
    description: 'Proposed: Users who settle their debt in under 1 hour should receive 2x Karma points to incentivize fast liquidity.',
    category: 'Rule',
    voteCount: { yes: 1250, no: 120, abstain: 45 },
    status: 'Active',
    endTime: Date.now() + 1000 * 60 * 60 * 48, // 48 hours
    proposer: 'GD...V3R'
  },
  {
    id: 'PROP-002',
    title: 'Lower Bridge Fees for Diamond Tier',
    description: 'Proposed: Users in the Diamond Social Credit tier should pay 0% fees for cross-chain bridging.',
    category: 'Finance',
    voteCount: { yes: 890, no: 400, abstain: 100 },
    status: 'Active',
    endTime: Date.now() + 1000 * 60 * 60 * 72, // 72 hours
    proposer: 'GB...X9M'
  },
  {
    id: 'PROP-003',
    title: 'Community Fund allocation for Marketing',
    description: 'Allocate 5000 XLM from the DAO treasury for community-led educational workshops.',
    category: 'Community',
    voteCount: { yes: 2100, no: 50, abstain: 10 },
    status: 'Passed',
    endTime: Date.now() - 1000 * 60 * 60 * 24, // Ended yesterday
    proposer: 'GC...L2K'
  }
];
