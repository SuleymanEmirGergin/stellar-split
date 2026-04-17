import { getAccessToken } from './api';

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

const BASE_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3000';

async function apiGet<T>(path: string): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json() as Promise<T>;
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json() as Promise<T>;
}

interface BackendReferral {
  code: string;
  referralCount: number;
  totalEarnings: number;
  tier: 'Starter' | 'Pro' | 'Influencer';
  history: Array<{ friend: string; joinedAt: number; reward: number }>;
}

/** Fetch referral data from backend. Throws if not authenticated. */
export async function fetchReferralData(): Promise<ReferralRecord> {
  const data = await apiGet<BackendReferral>('/referral/me');
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
    await apiPost('/referral/claim', { code });
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
