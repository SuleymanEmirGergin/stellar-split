/**
 * On-Chain Reputation & Identity System
 * Calculates a composite credit score (0–1000) from on-chain behavior signals.
 */

export type ReputationTier = 'Newcomer' | 'Trusted' | 'Elite' | 'Legend';

export interface ReputationFactor {
  label: string;
  score: number;   // 0–100 contribution
  max: number;     // max possible
  description: string;
  icon: string;
}

export interface ReputationProfile {
  score: number;           // 0–1000 total
  tier: ReputationTier;
  tierColor: string;
  factors: ReputationFactor[];
  percentile: number;      // simulated percentile within the network
}

interface GroupData {
  id: number;
  memberCount: number;
  members?: string[];
}

/**
 * Determines the tier based on score
 */
export function getTier(score: number): ReputationTier {
  if (score >= 800) return 'Legend';
  if (score >= 600) return 'Elite';
  if (score >= 350) return 'Trusted';
  return 'Newcomer';
}

export function getTierColor(tier: ReputationTier): string {
  switch (tier) {
    case 'Legend': return '#f59e0b'; // amber
    case 'Elite': return '#8b5cf6';  // violet
    case 'Trusted': return '#3b82f6'; // blue
    default: return '#6b7280';        // gray
  }
}

/**
 * Core scoring function.
 * In a real implementation this would fetch on-chain data.
 * For the hackathon demo, it derives a deterministic score from the wallet address.
 */
export function calculateReputationScore(
  walletAddress: string,
  groups: GroupData[],
  isDemo = false
): ReputationProfile {
  // Deterministic seed from wallet address
  const seed = walletAddress.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const rand = (min: number, max: number, offset = 0) => {
    const v = ((seed + offset) * 9301 + 49297) % 233280;
    return Math.floor(min + (v / 233280) * (max - min));
  };

  // Demo always shows impressive numbers
  const boost = isDemo ? 200 : 0;

  const factors: ReputationFactor[] = [
    {
      label: 'Payment Speed',
      score: Math.min(200, rand(60, 200, 1) + boost * 0.3),
      max: 200,
      description: 'How quickly you settle debts',
      icon: '⚡',
    },
    {
      label: 'Group Reliability',
      score: Math.min(200, rand(40, 200, 2) + groups.length * 15 + boost * 0.2),
      max: 200,
      description: 'Consistent participation in groups',
      icon: '🤝',
    },
    {
      label: 'Dispute-Free Record',
      score: Math.min(150, rand(80, 150, 3) + boost * 0.1),
      max: 150,
      description: 'Clean history with no raised disputes',
      icon: '🛡️',
    },
    {
      label: 'Vault Activity',
      score: Math.min(150, rand(20, 150, 4) + boost * 0.1),
      max: 150,
      description: 'Smart vault usage and yield generation',
      icon: '🏦',
    },
    {
      label: 'Referral Impact',
      score: Math.min(150, rand(0, 120, 5) + boost * 0.1),
      max: 150,
      description: 'Network growth through referrals',
      icon: '🌱',
    },
    {
      label: 'On-Chain History',
      score: Math.min(150, rand(30, 150, 6) + boost * 0.2),
      max: 150,
      description: 'Stellar account age and transaction depth',
      icon: '🔗',
    },
  ];

  const totalScore = Math.min(1000, factors.reduce((s, f) => s + f.score, 0));
  const tier = getTier(totalScore);
  const percentile = Math.min(99, rand(40, 95, 7) + (isDemo ? 25 : 0));

  return {
    score: Math.floor(totalScore),
    tier,
    tierColor: getTierColor(tier),
    factors,
    percentile,
  };
}

/**
 * Determines which visual themes a user has unlocked based on their achievements.
 */
export function evaluateUnlockedThemes(
  score: number,
  groupCount: number,
  ownedBadgeIds: number[]
): string[] {
  const unlocked = ['classic']; // Everyone gets classic

  if (score >= 800) {
    unlocked.push('legendary');
  }

  // Flash badge (usually ID 1) grants Speedster theme
  if (ownedBadgeIds.includes(1)) {
    unlocked.push('speedster');
  }

  if (groupCount >= 5) {
    unlocked.push('veteran');
  }

  return unlocked;
}
