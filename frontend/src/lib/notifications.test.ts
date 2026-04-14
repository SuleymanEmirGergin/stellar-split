import {
  sendWebhookNotification,
  sendSettlementReadyNotification,
  generateTelegramShareUrl,
  requestNotificationPermission,
  sendLocalNotification,
} from './notifications';

vi.mock('./webhook-proxy', () => ({
  forwardToWebhookProxy: vi.fn(),
}));

import { forwardToWebhookProxy } from './webhook-proxy';
const mockForward = vi.mocked(forwardToWebhookProxy);

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── sendWebhookNotification ──────────────────────────────────────────────────

describe('sendWebhookNotification', () => {
  const expenseData = { description: 'Dinner', amount: 50_000_000, payer: 'GA', groupName: 'Friends' };

  it('returns false for empty url', async () => {
    expect(await sendWebhookNotification('', expenseData)).toBe(false);
  });

  it('returns false for non-http url', async () => {
    expect(await sendWebhookNotification('ftp://bad.com', expenseData)).toBe(false);
  });

  it('calls forwardToWebhookProxy and returns its result', async () => {
    mockForward.mockResolvedValue(true);
    const ok = await sendWebhookNotification('http://hook.example.com', expenseData);
    expect(ok).toBe(true);
    expect(mockForward).toHaveBeenCalledOnce();
  });

  it('converts amount from stroops (divides by 10^7)', async () => {
    mockForward.mockResolvedValue(true);
    await sendWebhookNotification('http://hook.example.com', expenseData);
    const [, payload] = mockForward.mock.calls[0]!;
    expect((payload as { content: string }).content).toContain('5.00 XLM');
  });

  it('returns true (not re-throws) when forwardToWebhookProxy throws', async () => {
    mockForward.mockRejectedValue(new Error('network'));
    const ok = await sendWebhookNotification('http://hook.example.com', expenseData);
    expect(ok).toBe(true);
  });
});

// ─── sendSettlementReadyNotification ─────────────────────────────────────────

describe('sendSettlementReadyNotification', () => {
  it('returns false for empty url', async () => {
    expect(await sendSettlementReadyNotification('', { groupName: 'G', transactionCount: 2 })).toBe(false);
  });

  it('calls forwardToWebhookProxy for valid url', async () => {
    mockForward.mockResolvedValue(true);
    await sendSettlementReadyNotification('http://hook.example.com', { groupName: 'G', transactionCount: 3 });
    expect(mockForward).toHaveBeenCalledOnce();
  });

  it('returns true on proxy error', async () => {
    mockForward.mockRejectedValue(new Error('fail'));
    const ok = await sendSettlementReadyNotification('http://hook.example.com', { groupName: 'G', transactionCount: 1 });
    expect(ok).toBe(true);
  });
});

// ─── generateTelegramShareUrl ─────────────────────────────────────────────────

describe('generateTelegramShareUrl', () => {
  it('starts with https://t.me/msg', () => {
    const url = generateTelegramShareUrl(42, 'My Group');
    expect(url).toMatch(/^https:\/\/t\.me\/msg/);
  });

  it('includes encoded groupId and groupName', () => {
    const url = generateTelegramShareUrl(42, 'Test Group');
    expect(decodeURIComponent(url)).toContain('42');
    expect(decodeURIComponent(url)).toContain('Test Group');
  });

  it('includes the join link protocol', () => {
    const url = generateTelegramShareUrl(7, 'X');
    expect(decodeURIComponent(url)).toContain('stellarsplit:join:7');
  });
});

// ─── requestNotificationPermission ───────────────────────────────────────────

describe('requestNotificationPermission', () => {
  it('returns false when Notification API is absent', async () => {
    const original = (window as { Notification?: unknown }).Notification;
    delete (window as { Notification?: unknown }).Notification;
    expect(await requestNotificationPermission()).toBe(false);
    (window as { Notification?: unknown }).Notification = original;
  });

  it('returns true when permission is already granted', async () => {
    vi.stubGlobal('Notification', { permission: 'granted', requestPermission: vi.fn() });
    expect(await requestNotificationPermission()).toBe(true);
    vi.unstubAllGlobals();
  });

  it('returns false when permission is denied', async () => {
    vi.stubGlobal('Notification', { permission: 'denied', requestPermission: vi.fn() });
    expect(await requestNotificationPermission()).toBe(false);
    vi.unstubAllGlobals();
  });

  it('requests permission and returns true when granted', async () => {
    vi.stubGlobal('Notification', {
      permission: 'default',
      requestPermission: vi.fn().mockResolvedValue('granted'),
    });
    expect(await requestNotificationPermission()).toBe(true);
    vi.unstubAllGlobals();
  });

  it('requests permission and returns false when denied', async () => {
    vi.stubGlobal('Notification', {
      permission: 'default',
      requestPermission: vi.fn().mockResolvedValue('denied'),
    });
    expect(await requestNotificationPermission()).toBe(false);
    vi.unstubAllGlobals();
  });
});

// ─── sendLocalNotification ────────────────────────────────────────────────────

describe('sendLocalNotification', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('does nothing when Notification API is absent', () => {
    const original = (window as { Notification?: unknown }).Notification;
    delete (window as { Notification?: unknown }).Notification;
    expect(() => sendLocalNotification('Title', 'Body')).not.toThrow();
    (window as { Notification?: unknown }).Notification = original;
  });

  it('does nothing when permission is not granted', () => {
    vi.stubGlobal('Notification', { permission: 'denied' });
    expect(() => sendLocalNotification('Title', 'Body')).not.toThrow();
  });

  it('creates a Notification when permission is granted', () => {
    const mockClose = vi.fn();
    const MockNotification = vi.fn().mockReturnValue({ close: mockClose });
    Object.defineProperty(MockNotification, 'permission', { value: 'granted', configurable: true });
    vi.stubGlobal('Notification', MockNotification);
    vi.useFakeTimers();

    sendLocalNotification('Hello', 'World');
    expect(MockNotification).toHaveBeenCalledWith('Hello', expect.objectContaining({ body: 'World' }));

    vi.runAllTimers();
    expect(mockClose).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('falls back to serviceWorker when Notification constructor throws', async () => {
    const mockShowNotification = vi.fn();
    const mockReg = { showNotification: mockShowNotification };
    vi.stubGlobal('navigator', {
      ...navigator,
      serviceWorker: { ready: Promise.resolve(mockReg) },
    });

    const MockNotification = vi.fn().mockImplementation(() => {
      throw new Error('SecurityError');
    });
    Object.defineProperty(MockNotification, 'permission', { value: 'granted', configurable: true });
    vi.stubGlobal('Notification', MockNotification);

    sendLocalNotification('SW Title', 'SW Body');
    // Wait for the serviceWorker.ready promise to resolve
    await new Promise((r) => setTimeout(r, 20));
    expect(mockShowNotification).toHaveBeenCalledWith('SW Title', expect.objectContaining({ body: 'SW Body' }));
  });
});
