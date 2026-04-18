import { referralApi } from './api';

export interface ReferralRecord {
  code: string;
  invitedBy: string;
  friendsJoined: number;
  totalEarnings: number;
  unclaimedRewards: number;
  tier: 'Starter' | 'Pro' | 'Influencer';
  history: Array<{
    friend: string;
    joinedAt: number;
    reward: number;
  }>;
}

// ─── Backend API ──────────────────────────────────────────────────────────────
// Uses the centralized `api` client (VITE_API_URL, shared JWT + silent refresh).
// Previously had its own fetch wrappers pointing at VITE_BACKEND_URL — that was
// legacy when referral lived in a separate service. Now consolidated.

/** Fetch referral data from backend. Throws if not authenticated. */
export async function fetchReferralData(): Promise<ReferralRecord> {
  const data = await referralApi.me();
  return {
    code: data.code,
    invitedBy: '',
    friendsJoined: data.referralCount,
    totalEarnings: data.totalEarnings,
    unclaimedRewards: 0, // rewards are auto-credited in backend
    tier: data.tier,
    history: data.history,
  };
}

/** Claim a referral code against the backend */
export async function claimReferralCode(code: string): Promise<boolean> {
  try {
    await referralApi.claim(code);
    return true;
  } catch {
    return false;
  }
}

// ─── Legacy localStorage (demo / no-JWT fallback) ────────────────────────────

const REFERRAL_KEY = 'stellarsplit_referrals';

export const getReferralData = (walletAddress: string): ReferralRecord => {
  const saved = localStorage.getItem(`${REFERRAL_KEY}_${walletAddress}`);
  if (saved) return JSON.parse(saved) as ReferralRecord;

  const newRecord: ReferralRecord = {
    code: Math.random().toString(36).substring(2, 8).toUpperCase(),
    invitedBy: '',
    friendsJoined: 0,
    totalEarnings: 0,
    unclaimedRewards: 0,
    tier: 'Starter',
    history: [],
  };
  localStorage.setItem(`${REFERRAL_KEY}_${walletAddress}`, JSON.stringify(newRecord));
  return newRecord;
};

export const processInvite = (code: string, newFriendAddress: string): boolean => {
  const globalStore = JSON.parse(localStorage.getItem('stellarsplit_global_referrals') || '{}') as Record<string, ReferralRecord>;
  const ownerAddress = Object.keys(globalStore).find((addr) => globalStore[addr].code === code);
  if (!ownerAddress) return false;

  const record = globalStore[ownerAddress];
  const reward = 5.0;
  record.friendsJoined += 1;
  record.totalEarnings += reward;
  record.unclaimedRewards += reward;
  record.history.push({ friend: newFriendAddress, joinedAt: Date.now(), reward });
  if (record.friendsJoined >= 10) record.tier = 'Influencer';
  else if (record.friendsJoined >= 3) record.tier = 'Pro';
  globalStore[ownerAddress] = record;
  localStorage.setItem('stellarsplit_global_referrals', JSON.stringify(globalStore));
  localStorage.setItem(`${REFERRAL_KEY}_${ownerAddress}`, JSON.stringify(record));
  return true;
};

export const claimRewards = async (walletAddress: string): Promise<number> => {
  const saved = localStorage.getItem(`${REFERRAL_KEY}_${walletAddress}`);
  if (!saved) return 0;
  const record: ReferralRecord = JSON.parse(saved);
  const amount = record.unclaimedRewards;
  if (amount <= 0) return 0;
  await new Promise((resolve) => setTimeout(resolve, 2000));
  record.unclaimedRewards = 0;
  localStorage.setItem(`${REFERRAL_KEY}_${walletAddress}`, JSON.stringify(record));
  const globalStore = JSON.parse(localStorage.getItem('stellarsplit_global_referrals') || '{}') as Record<string, ReferralRecord>;
  globalStore[walletAddress] = record;
  localStorage.setItem('stellarsplit_global_referrals', JSON.stringify(globalStore));
  return amount;
};
