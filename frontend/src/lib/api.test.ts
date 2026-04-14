import { setAccessToken, getAccessToken } from './api';

// Note: the `request` function and API objects (groupsApi, authApi etc.) all
// depend on the module-level `accessToken` variable and `fetch`. We test the
// public surface: token management and URL building helpers.

beforeEach(() => {
  setAccessToken(null);
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  setAccessToken(null);
});

// ─── Token store ──────────────────────────────────────────────────────────────

describe('setAccessToken / getAccessToken', () => {
  it('returns null initially', () => {
    expect(getAccessToken()).toBeNull();
  });

  it('stores and retrieves a token', () => {
    setAccessToken('tok_abc');
    expect(getAccessToken()).toBe('tok_abc');
  });

  it('can be cleared back to null', () => {
    setAccessToken('tok_abc');
    setAccessToken(null);
    expect(getAccessToken()).toBeNull();
  });
});

// ─── api.get / api.post / api.patch / api.delete ─────────────────────────────

describe('api methods — happy path', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: 'ok' }),
    } as Response);
  });

  it('sends GET with Authorization header when token is set', async () => {
    const { api } = await import('./api');
    setAccessToken('my_token');
    await api.get('/test');
    const [, init] = vi.mocked(fetch).mock.calls[0]!;
    expect((init as RequestInit & { headers: Record<string, string> }).headers['Authorization']).toBe('Bearer my_token');
  });

  it('sends GET without Authorization when skipAuth is true', async () => {
    const { api } = await import('./api');
    await api.get('/test', { skipAuth: true });
    const [, init] = vi.mocked(fetch).mock.calls[0]!;
    expect((init as RequestInit & { headers: Record<string, string> }).headers['Authorization']).toBeUndefined();
  });

  it('includes credentials: include on every request', async () => {
    const { api } = await import('./api');
    await api.get('/test');
    const [, init] = vi.mocked(fetch).mock.calls[0]!;
    expect((init as RequestInit).credentials).toBe('include');
  });

  it('sends POST with JSON body', async () => {
    const { api } = await import('./api');
    await api.post('/test', { foo: 'bar' });
    const [, init] = vi.mocked(fetch).mock.calls[0]!;
    expect((init as RequestInit).method).toBe('POST');
    expect((init as RequestInit).body).toBe(JSON.stringify({ foo: 'bar' }));
  });

  it('sends PATCH with JSON body', async () => {
    const { api } = await import('./api');
    await api.patch('/test', { x: 1 });
    const [, init] = vi.mocked(fetch).mock.calls[0]!;
    expect((init as RequestInit).method).toBe('PATCH');
  });

  it('sends DELETE', async () => {
    const { api } = await import('./api');
    await api.delete('/test');
    const [, init] = vi.mocked(fetch).mock.calls[0]!;
    expect((init as RequestInit).method).toBe('DELETE');
  });

  it('returns undefined for 204 response', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, status: 204 } as Response);
    const { api } = await import('./api');
    const result = await api.delete('/test');
    expect(result).toBeUndefined();
  });
});

// ─── Error handling ───────────────────────────────────────────────────────────

describe('api methods — error handling', () => {
  it('throws on non-ok response', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: { message: 'Forbidden' } }),
    } as Response);
    const { api } = await import('./api');
    await expect(api.get('/test')).rejects.toThrow('Forbidden');
  });

  it('throws API error with status when body lacks message', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response);
    const { api } = await import('./api');
    await expect(api.get('/test')).rejects.toThrow('API error 500');
  });

  it('throws API error with status when response body is not JSON', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => { throw new SyntaxError('Not JSON'); },
    } as unknown as Response);
    const { api } = await import('./api');
    await expect(api.get('/test')).rejects.toThrow('API error 502');
  });
});

// ─── silentRefresh — network error ────────────────────────────────────────────

describe('silentRefresh — network error', () => {
  it('returns session-expired when refresh fetch throws', async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : (input as Request).url ?? String(input);
      if (url.includes('/auth/refresh')) {
        throw new Error('Network offline');
      }
      return { ok: false, status: 401, json: async () => ({}) } as Response;
    });
    const { api } = await import('./api');
    await expect(api.get('/protected')).rejects.toThrow('Session expired');
  });
});

// ─── Silent refresh on 401 ────────────────────────────────────────────────────

describe('silent refresh on 401', () => {
  it('retries request after successful token refresh', async () => {
    let callCount = 0;
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : (input as Request).url ?? String(input);
      if (url.includes('/auth/refresh')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { accessToken: 'new_tok' } }),
        } as Response;
      }
      callCount++;
      if (callCount === 1) {
        return { ok: false, status: 401, json: async () => ({}) } as Response;
      }
      return { ok: true, status: 200, json: async () => ({ data: 'retried' }) } as Response;
    });

    const { api } = await import('./api');
    const result = await api.get('/protected');
    expect(result).toEqual({ data: 'retried' });
  });

  it('throws session-expired when refresh fails', async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : (input as Request).url ?? String(input);
      if (url.includes('/auth/refresh')) {
        return { ok: false, status: 401 } as Response;
      }
      return { ok: false, status: 401, json: async () => ({}) } as Response;
    });

    const { api } = await import('./api');
    await expect(api.get('/protected')).rejects.toThrow('Session expired');
  });
});

// ─── groupsApi URL building ───────────────────────────────────────────────────

describe('groupsApi URL building', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as Response);
  });

  it('list — no params: no query string', async () => {
    const { groupsApi } = await import('./api');
    await groupsApi.list();
    const [url] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url)).toMatch(/\/groups$/);
  });

  it('list — with cursor and limit', async () => {
    const { groupsApi } = await import('./api');
    await groupsApi.list({ cursor: 'abc', limit: 5 });
    const [url] = vi.mocked(fetch).mock.calls[0]!;
    const u = String(url);
    expect(u).toContain('cursor=abc');
    expect(u).toContain('limit=5');
  });

  it('list — with search', async () => {
    const { groupsApi } = await import('./api');
    await groupsApi.list({ search: 'holiday' });
    const [url] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url)).toContain('search=holiday');
  });
});

// ─── notificationsApi ────────────────────────────────────────────────────────

describe('notificationsApi', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as Response);
  });

  it('list — no cursor: no query string', async () => {
    const { notificationsApi } = await import('./api');
    await notificationsApi.list();
    const [url] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url)).toMatch(/\/notifications$/);
  });

  it('list — with cursor appends query string', async () => {
    const { notificationsApi } = await import('./api');
    await notificationsApi.list('cur_123');
    const [url] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url)).toContain('?cursor=cur_123');
  });

  it('markAllRead calls patch for each id', async () => {
    const { notificationsApi } = await import('./api');
    await notificationsApi.markAllRead(['id1', 'id2']);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
  });
});

// ─── authApi ─────────────────────────────────────────────────────────────────

describe('authApi', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true, status: 200, json: async () => ({}),
    } as Response);
  });

  it('challenge calls GET /auth/challenge with skipAuth', async () => {
    const { authApi } = await import('./api');
    await authApi.challenge();
    const [url, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url)).toContain('/auth/challenge');
    expect((init as RequestInit & { headers: Record<string, string> }).headers['Authorization']).toBeUndefined();
  });

  it('verify calls POST /auth/verify with wallet, signature, nonce', async () => {
    const { authApi } = await import('./api');
    await authApi.verify('GA', 'sig', 'nonce123');
    const [url, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url)).toContain('/auth/verify');
    expect(JSON.parse((init as RequestInit).body as string)).toMatchObject({ walletAddress: 'GA', signature: 'sig', nonce: 'nonce123' });
  });

  it('refresh calls POST /auth/refresh with skipAuth', async () => {
    const { authApi } = await import('./api');
    await authApi.refresh();
    const [url] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url)).toContain('/auth/refresh');
  });

  it('logout calls POST /auth/logout', async () => {
    const { authApi } = await import('./api');
    await authApi.logout();
    const [url] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url)).toContain('/auth/logout');
  });
});

// ─── expensesApi ──────────────────────────────────────────────────────────────

describe('expensesApi', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, status: 200, json: async () => ({}) } as Response);
  });

  it('list calls GET /groups/:id/expenses', async () => {
    const { expensesApi } = await import('./api');
    await expensesApi.list('g1');
    const [url] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url)).toContain('/groups/g1/expenses');
  });

  it('list includes cursor and limit as query params when provided', async () => {
    const { expensesApi } = await import('./api');
    await expensesApi.list('g1', 'cursor123', 20);
    const [url] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url)).toContain('cursor=cursor123');
    expect(String(url)).toContain('limit=20');
  });

  it('create calls POST /groups/:id/expenses', async () => {
    const { expensesApi } = await import('./api');
    await expensesApi.create('g1', { description: 'D', amount: 10, currency: 'XLM', paidBy: 'GA', splitType: 'EQUAL' });
    const [url, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url)).toContain('/groups/g1/expenses');
    expect((init as RequestInit).method).toBe('POST');
  });

  it('cancel calls PATCH /groups/:id/expenses/:expId/cancel', async () => {
    const { expensesApi } = await import('./api');
    await expensesApi.cancel('g1', 'e1');
    const [url] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url)).toContain('/groups/g1/expenses/e1/cancel');
  });
});

// ─── settlementsApi ───────────────────────────────────────────────────────────

describe('settlementsApi', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, status: 200, json: async () => ({}) } as Response);
  });

  it('list calls GET /groups/:id/settlements', async () => {
    const { settlementsApi } = await import('./api');
    await settlementsApi.list('g1');
    const [url] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url)).toContain('/groups/g1/settlements');
  });

  it('create calls POST /groups/:id/settlements', async () => {
    const { settlementsApi } = await import('./api');
    await settlementsApi.create('g1', 'txHash', 50);
    const [url] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url)).toContain('/groups/g1/settlements');
  });
});

// ─── recurringApi ─────────────────────────────────────────────────────────────

describe('recurringApi', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, status: 200, json: async () => ({}) } as Response);
  });

  it('list calls GET /groups/:id/recurring', async () => {
    const { recurringApi } = await import('./api');
    await recurringApi.list('g1');
    const [url] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url)).toContain('/groups/g1/recurring');
  });

  it('create calls POST /recurring', async () => {
    const { recurringApi } = await import('./api');
    await recurringApi.create({ groupId: 'g1', description: 'D', amount: 10, frequency: 'MONTHLY', nextDue: '2026-05-01' });
    const [url] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url)).toContain('/recurring');
  });

  it('update calls PATCH /recurring/:id', async () => {
    const { recurringApi } = await import('./api');
    await recurringApi.update('r1', { amount: 20 });
    const [url, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url)).toContain('/recurring/r1');
    expect((init as RequestInit).method).toBe('PATCH');
  });

  it('remove calls DELETE /recurring/:id', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, status: 204 } as Response);
    const { recurringApi } = await import('./api');
    await recurringApi.remove('r1');
    const [url, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url)).toContain('/recurring/r1');
    expect((init as RequestInit).method).toBe('DELETE');
  });
});

// ─── governanceApi ────────────────────────────────────────────────────────────

describe('governanceApi', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, status: 200, json: async () => ([]) } as Response);
  });

  it('listProposals calls GET /governance/proposals?groupId=...', async () => {
    const { governanceApi } = await import('./api');
    await governanceApi.listProposals('g1');
    const [url] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url)).toContain('/governance/proposals');
    expect(String(url)).toContain('groupId=g1');
  });

  it('createProposal calls POST /governance/proposals', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, status: 200, json: async () => ({}) } as Response);
    const { governanceApi } = await import('./api');
    await governanceApi.createProposal({ groupId: 'g1', title: 'T', description: 'D', endsAt: '2026-12-31' });
    const [url, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url)).toContain('/governance/proposals');
    expect((init as RequestInit).method).toBe('POST');
  });

  it('castVote calls POST /governance/proposals/:id/vote', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, status: 200, json: async () => ({}) } as Response);
    const { governanceApi } = await import('./api');
    await governanceApi.castVote('p1', 'yes');
    const [url] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url)).toContain('/governance/proposals/p1/vote');
  });

  it('listDisputes calls GET /governance/disputes?groupId=...', async () => {
    const { governanceApi } = await import('./api');
    await governanceApi.listDisputes('g1');
    const [url] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url)).toContain('/governance/disputes');
  });

  it('createDispute calls POST /governance/disputes', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, status: 200, json: async () => ({}) } as Response);
    const { governanceApi } = await import('./api');
    await governanceApi.createDispute({ groupId: 'g1', expenseId: 'e1', amount: 10, category: 'food', description: 'D' });
    const [url] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url)).toContain('/governance/disputes');
  });
});

// ─── auditApi ─────────────────────────────────────────────────────────────────

describe('auditApi', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, status: 200, json: async () => ({}) } as Response);
  });

  it('list calls GET /groups/:id/audit', async () => {
    const { auditApi } = await import('./api');
    await auditApi.list('g1');
    const [url] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url)).toContain('/groups/g1/audit');
  });

  it('list passes filter params as query string', async () => {
    const { auditApi } = await import('./api');
    await auditApi.list('g1', { entityType: 'expense', action: 'create', limit: 10, cursor: 'c1' });
    const [url] = vi.mocked(fetch).mock.calls[0]!;
    const u = String(url);
    expect(u).toContain('entityType=expense');
    expect(u).toContain('action=create');
    expect(u).toContain('limit=10');
    expect(u).toContain('cursor=c1');
  });
});

// ─── usersApi & reputationApi ─────────────────────────────────────────────────

describe('usersApi', () => {
  it('deleteAccount calls DELETE /users/me', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, status: 204 } as Response);
    const { usersApi } = await import('./api');
    await usersApi.deleteAccount();
    const [url, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url)).toContain('/users/me');
    expect((init as RequestInit).method).toBe('DELETE');
  });
});

describe('reputationApi', () => {
  it('me calls GET /reputation/me', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, status: 200, json: async () => ({}) } as Response);
    const { reputationApi } = await import('./api');
    await reputationApi.me();
    const [url] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url)).toContain('/reputation/me');
  });
});

// ─── uploadReceipt ────────────────────────────────────────────────────────────

describe('uploadReceipt (standalone)', () => {
  it('calls POST /uploads/receipt with FormData', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { url: 'https://cdn.example.com/r.jpg', signedUrl: 'https://signed.example.com/r.jpg' } }),
    } as Response);
    const file = new File(['data'], 'receipt.jpg', { type: 'image/jpeg' });
    const { uploadReceipt } = await import('./api');
    const result = await uploadReceipt(file, 'g1', 'e1');
    expect(result.url).toContain('cdn.example.com');
    const [url, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url)).toContain('/uploads/receipt');
    expect((init as RequestInit).method).toBe('POST');
  });

  it('includes Authorization header when token is set during upload', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { url: 'https://cdn.example.com/r.jpg', signedUrl: 'https://s.com/r.jpg' } }),
    } as Response);
    setAccessToken('upload-token');
    const file = new File(['data'], 'r.jpg', { type: 'image/jpeg' });
    const { uploadReceipt } = await import('./api');
    await uploadReceipt(file, 'g1', 'e1');
    const [, init] = vi.mocked(fetch).mock.calls[0]!;
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer upload-token' });
    setAccessToken(null);
  });

  it('throws when upload returns non-ok', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 413,
      json: async () => ({ error: { message: 'Too large' } }),
    } as Response);
    const file = new File(['data'], 'r.jpg', { type: 'image/jpeg' });
    const { uploadReceipt } = await import('./api');
    await expect(uploadReceipt(file, 'g1', 'e1')).rejects.toThrow('Too large');
  });
});

// ─── groupsApi additional methods ─────────────────────────────────────────────

describe('groupsApi additional', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, status: 200, json: async () => ({}) } as Response);
  });

  it('get calls GET /groups/:id', async () => {
    const { groupsApi } = await import('./api');
    await groupsApi.get('g1');
    const [url] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url)).toContain('/groups/g1');
  });

  it('create calls POST /groups', async () => {
    const { groupsApi } = await import('./api');
    await groupsApi.create('Test', 'XLM', ['GA', 'GB']);
    const [url, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url)).toContain('/groups');
    expect((init as RequestInit).method).toBe('POST');
  });

  it('join calls POST /groups/:id/join', async () => {
    const { groupsApi } = await import('./api');
    await groupsApi.join('g1', 'inv123');
    const [url] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url)).toContain('/groups/g1/join');
  });

  it('leave calls DELETE /groups/:id/leave', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, status: 204 } as Response);
    const { groupsApi } = await import('./api');
    await groupsApi.leave('g1');
    const [url, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url)).toContain('/groups/g1/leave');
    expect((init as RequestInit).method).toBe('DELETE');
  });

  it('balances calls GET /groups/:id/balances', async () => {
    const { groupsApi } = await import('./api');
    await groupsApi.balances('g1');
    const [url] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url)).toContain('/groups/g1/balances');
  });

  it('settlementPlan calls GET /groups/:id/settlement-plan', async () => {
    const { groupsApi } = await import('./api');
    await groupsApi.settlementPlan('g1');
    const [url] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url)).toContain('/groups/g1/settlement-plan');
  });

  it('inviteLink calls GET /groups/:id/invite', async () => {
    const { groupsApi } = await import('./api');
    await groupsApi.inviteLink('g1');
    const [url] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url)).toContain('/groups/g1/invite');
  });
});

// ─── downloadGdprExport ───────────────────────────────────────────────────────

describe('downloadGdprExport', () => {
  it('triggers a download anchor click', async () => {
    const mockBlob = new Blob(['{}'], { type: 'application/json' });
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      blob: async () => mockBlob,
    } as unknown as Response);

    const mockUrl = 'blob:http://localhost/fake';
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn().mockReturnValue(mockUrl),
      revokeObjectURL: vi.fn(),
    });

    const clickSpy = vi.fn();
    const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((el) => {
      (el as HTMLAnchorElement).click = clickSpy;
      return el;
    });
    const removeSpy = vi.spyOn(document.body, 'removeChild').mockImplementation((el) => el);

    const { downloadGdprExport } = await import('./api');
    await downloadGdprExport();

    expect(clickSpy).toHaveBeenCalled();
    appendSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('throws when response is not ok', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 403 } as Response);
    const { downloadGdprExport } = await import('./api');
    await expect(downloadGdprExport()).rejects.toThrow('Export failed: 403');
  });

  it('includes Authorization header when token is set', async () => {
    const mockBlob = new Blob(['{}']);
    vi.mocked(fetch).mockResolvedValue({ ok: true, blob: async () => mockBlob } as unknown as Response);
    vi.stubGlobal('URL', { createObjectURL: vi.fn().mockReturnValue('blob:x'), revokeObjectURL: vi.fn() });
    vi.spyOn(document.body, 'appendChild').mockImplementation((el) => { (el as HTMLAnchorElement).click = vi.fn(); return el; });
    vi.spyOn(document.body, 'removeChild').mockImplementation((el) => el);

    setAccessToken('bearer-token');
    const { downloadGdprExport } = await import('./api');
    await downloadGdprExport();

    const [, init] = vi.mocked(fetch).mock.calls[0]!;
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer bearer-token' });
    setAccessToken(null);
  });
});
