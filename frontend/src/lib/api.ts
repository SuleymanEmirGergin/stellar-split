/**
 * StellarSplit Backend API client.
 *
 * - Base URL: VITE_API_URL (defaults to http://localhost:3001)
 * - Auth: Bearer JWT (access token) + HttpOnly refresh cookie
 * - Auto-refresh: on 401, attempts one silent token refresh then retries
 */

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001';

// ─── Token store (in-memory only — never persist access token) ───────────────
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

async function request<T>(path: string, init: RequestOptions = {}): Promise<T> {
  const { skipAuth = false, ...fetchInit } = init;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchInit.headers as Record<string, string> | undefined),
  };

  if (!skipAuth && accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...fetchInit,
    headers,
    credentials: 'include', // send HttpOnly refresh cookie
  });

  // Silent refresh on 401
  if (res.status === 401 && !skipAuth) {
    const refreshed = await silentRefresh();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${accessToken!}`;
      const retry = await fetch(`${BASE_URL}${path}`, { ...fetchInit, headers, credentials: 'include' });
      if (!retry.ok) throw await toApiError(retry);
      return retry.json() as Promise<T>;
    }
    throw new Error('Session expired. Please reconnect your wallet.');
  }

  if (!res.ok) throw await toApiError(res);

  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

async function toApiError(res: Response): Promise<Error> {
  try {
    const body = (await res.json()) as { error?: { message?: string } };
    return new Error(body?.error?.message ?? `API error ${res.status}`);
  } catch {
    return new Error(`API error ${res.status}`);
  }
}

async function silentRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return false;
    const body = (await res.json()) as { data: { accessToken: string } };
    setAccessToken(body.data.accessToken);
    return true;
  } catch {
    return false;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const api = {
  get: <T>(path: string, init?: RequestOptions) =>
    request<T>(path, { method: 'GET', ...init }),

  post: <T>(path: string, body?: unknown, init?: RequestOptions) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body), ...init }),

  patch: <T>(path: string, body?: unknown, init?: RequestOptions) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body), ...init }),

  delete: <T>(path: string, init?: RequestOptions) =>
    request<T>(path, { method: 'DELETE', ...init }),
};

// ─── Auth endpoints ───────────────────────────────────────────────────────────

export interface ChallengeResponse {
  data: { nonce: string; message: string; expiresAt: number };
}

export interface AuthUser {
  id: string;
  walletAddress: string;
  reputationScore: number;
}

export interface VerifyResponse {
  data: { accessToken: string; user: AuthUser };
}

export const authApi = {
  challenge: () => api.get<ChallengeResponse>('/auth/challenge', { skipAuth: true }),
  verify: (walletAddress: string, signature: string, nonce: string) =>
    api.post<VerifyResponse>('/auth/verify', { walletAddress, signature, nonce }, { skipAuth: true }),
  refresh: () => api.post<{ data: { accessToken: string } }>('/auth/refresh', undefined, { skipAuth: true }),
  logout: () => api.post<void>('/auth/logout'),
};

// ─── Groups endpoints ─────────────────────────────────────────────────────────

export interface BackendGroup {
  id: string;
  name: string;
  currency: 'XLM' | 'USDC';
  isSettled: boolean;
  inviteCode: string;
  createdAt: string;
  _count: { members: number };
}

export interface BackendGroupDetail extends BackendGroup {
  creator: { id: string; walletAddress: string };
  members: Array<{ id: string; role: string; user: { id: string; walletAddress: string; reputationScore: number } }>;
}

export const groupsApi = {
  list: (params?: { cursor?: string; limit?: number; search?: string }) => {
    const qs = new URLSearchParams();
    if (params?.cursor) qs.set('cursor', params.cursor);
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.search) qs.set('search', params.search);
    return api.get<{ data: { items: BackendGroup[]; nextCursor?: string; hasMore: boolean } }>(
      `/groups${qs.toString() ? `?${qs}` : ''}`,
    );
  },
  get: (groupId: string) =>
    api.get<{ data: BackendGroupDetail }>(`/groups/${groupId}`),
  create: (name: string, currency: 'XLM' | 'USDC', members?: string[]) =>
    api.post<{ data: BackendGroup }>('/groups', { name, currency, members }),
  join: (groupId: string, inviteCode?: string) =>
    api.post<{ data: unknown }>(`/groups/${groupId}/join`, { inviteCode }),
  leave: (groupId: string) =>
    api.delete<void>(`/groups/${groupId}/leave`),
  balances: (groupId: string) =>
    api.get<{ data: Array<{ userId: string; balance: number }> }>(`/groups/${groupId}/balances`),
  settlementPlan: (groupId: string) =>
    api.get<{ transfers: Array<{ fromUserId: string; toUserId: string; amount: number }>; totalTransfers: number; savedTransfers: number }>(`/groups/${groupId}/settlement-plan`),
  inviteLink: (groupId: string) =>
    api.get<{ data: { inviteCode: string; groupId: string } }>(`/groups/${groupId}/invite`),
};

// ─── Expenses endpoints ───────────────────────────────────────────────────────

export type SplitType = 'EQUAL' | 'CUSTOM' | 'PERCENTAGE';

export interface ExpenseSplitInput {
  walletAddress: string;
  amount: number;
  percentage?: number;
}

export interface BackendExpense {
  id: string;
  groupId: string;
  description: string;
  amount: string;
  currency: 'XLM' | 'USDC';
  splitType: SplitType;
  status: 'ACTIVE' | 'CANCELLED';
  receiptUrl?: string;
  createdAt: string;
  paidBy: { id: string; walletAddress: string };
  splits: Array<{ userId: string; amount: string; percentage?: string }>;
}

export const expensesApi = {
  list: (groupId: string, cursor?: string, limit?: number) => {
    const qs = new URLSearchParams();
    if (cursor) qs.set('cursor', cursor);
    if (limit) qs.set('limit', String(limit));
    return api.get<{ data: { items: BackendExpense[]; nextCursor?: string; hasMore: boolean } }>(
      `/groups/${groupId}/expenses${qs.toString() ? `?${qs}` : ''}`,
    );
  },
  create: (groupId: string, payload: {
    description: string; amount: number; currency: 'XLM' | 'USDC';
    paidBy: string; splitType: SplitType; splits?: ExpenseSplitInput[]; receiptUrl?: string;
  }) => api.post<{ data: BackendExpense }>(`/groups/${groupId}/expenses`, payload),
  cancel: (groupId: string, expenseId: string) =>
    api.patch<{ data: BackendExpense }>(`/groups/${groupId}/expenses/${expenseId}/cancel`),
};

// ─── Settlements endpoints ────────────────────────────────────────────────────

export const settlementsApi = {
  list: (groupId: string) =>
    api.get<{ data: { items: unknown[]; hasMore: boolean } }>(`/groups/${groupId}/settlements`),
  create: (groupId: string, txHash: string, amount: number) =>
    api.post<{ data: unknown }>(`/groups/${groupId}/settlements`, { groupId, txHash, amount }),
};

// ─── Notifications endpoints ──────────────────────────────────────────────────

export interface BackendNotification {
  id: string;
  type: 'EXPENSE_ADDED' | 'EXPENSE_CANCELLED' | 'SETTLEMENT_CONFIRMED' | 'SETTLEMENT_FAILED' | 'MEMBER_JOINED' | 'MEMBER_LEFT' | 'RECURRING_TRIGGERED' | 'SYSTEM';
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export const notificationsApi = {
  list: (cursor?: string) => {
    const qs = cursor ? `?cursor=${cursor}` : '';
    return api.get<{ data: { items: BackendNotification[]; hasMore: boolean } }>(`/notifications${qs}`);
  },
  markRead: (id: string) => api.patch<void>(`/notifications/${id}/read`),
  markAllRead: (ids: string[]) =>
    Promise.allSettled(ids.map((id) => api.patch<void>(`/notifications/${id}/read`))),
};

// ─── Recurring endpoints ──────────────────────────────────────────────────────

export type RecurringFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface BackendRecurringTemplate {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  currency: 'XLM' | 'USDC';
  frequency: RecurringFrequency;
  nextDue: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateRecurringPayload {
  groupId: string;
  description: string;
  amount: number;
  currency?: 'XLM' | 'USDC';
  frequency: RecurringFrequency;
  nextDue: string;
}

export const recurringApi = {
  list: (groupId: string) =>
    api.get<{ data: { items: BackendRecurringTemplate[] } }>(`/groups/${groupId}/recurring`),
  create: (payload: CreateRecurringPayload) =>
    api.post<{ data: BackendRecurringTemplate }>('/recurring', payload),
  update: (id: string, dto: Partial<CreateRecurringPayload>) =>
    api.patch<{ data: BackendRecurringTemplate }>(`/recurring/${id}`, dto),
  remove: (id: string) =>
    api.delete<void>(`/recurring/${id}`),
};

// ─── Audit Log endpoints ──────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  actorType: string;
  actorId: string | null;
  actorWallet: string | null;
  groupId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export const auditApi = {
  list: (
    groupId: string,
    params?: { cursor?: string; limit?: number; entityType?: string; action?: string },
  ) => {
    const qs = new URLSearchParams();
    if (params?.cursor) qs.set('cursor', params.cursor);
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.entityType) qs.set('entityType', params.entityType);
    if (params?.action) qs.set('action', params.action);
    return api.get<{ data: { items: AuditLogEntry[]; hasMore: boolean; nextCursor?: string } }>(
      `/groups/${groupId}/audit${qs.toString() ? `?${qs}` : ''}`,
    );
  },
};

// ─── Governance endpoints ─────────────────────────────────────────────────────

export interface BackendProposal {
  id: string;
  groupId: string;
  title: string;
  description: string;
  status: 'ACTIVE' | 'PASSED' | 'REJECTED';
  threshold: number;
  endsAt: string;
  createdAt: string;
  creator: { id: string; walletAddress: string };
  votes: Array<{ id: string; option: string; voter: { id: string; walletAddress: string } }>;
}

export interface BackendDispute {
  id: string;
  groupId: string;
  expenseId: string;
  amount: string;
  category: string;
  description: string;
  status: 'OPEN' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
  initiator: { id: string; walletAddress: string };
}

export const governanceApi = {
  listProposals: (groupId: string) =>
    api.get<BackendProposal[]>(`/governance/proposals?groupId=${encodeURIComponent(groupId)}`),

  createProposal: (payload: {
    groupId: string;
    title: string;
    description: string;
    threshold?: number;
    endsAt: string;
  }) => api.post<BackendProposal>('/governance/proposals', payload),

  castVote: (proposalId: string, option: 'yes' | 'no') =>
    api.post<{ id: string; option: string }>(`/governance/proposals/${proposalId}/vote`, { option }),

  listDisputes: (groupId: string) =>
    api.get<BackendDispute[]>(`/governance/disputes?groupId=${encodeURIComponent(groupId)}`),

  createDispute: (payload: {
    groupId: string;
    expenseId: string;
    amount: number;
    category: string;
    description: string;
  }) => api.post<BackendDispute>('/governance/disputes', payload),
};

// ─── Users / GDPR endpoints ───────────────────────────────────────────────────

export const usersApi = {
  deleteAccount: () => api.delete<void>('/users/me'),
};

/** GDPR Art. 20 — triggers browser download of the user's data as JSON. */
export async function downloadGdprExport(): Promise<void> {
  const token = accessToken;
  const res = await fetch(`${BASE_URL}/users/me/export`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Export failed: ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `stellarsplit-export-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Reputation endpoints ─────────────────────────────────────────────────────

export const reputationApi = {
  me: () => api.get<{ data: { reputationScore: number; badges: unknown[]; settlementHistory: unknown[] } }>('/reputation/me'),
};

// ─── Uploads ──────────────────────────────────────────────────────────────────

export async function uploadReceipt(
  file: File,
  groupId: string,
  expenseId: string,
): Promise<{ url: string; signedUrl: string }> {
  const form = new FormData();
  form.append('file', file);
  form.append('groupId', groupId);
  form.append('expenseId', expenseId);

  const res = await fetch(`${BASE_URL}/uploads/receipt`, {
    method: 'POST',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    credentials: 'include',
    body: form,
  });
  if (!res.ok) throw await toApiError(res);
  const body = (await res.json()) as { data: { url: string; signedUrl: string } };
  return body.data;
}
