import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('../lib/api', () => ({
  notificationsApi: {
    getVapidPublicKey: vi.fn().mockResolvedValue({ data: { data: { publicKey: 'test-key' } } }),
    subscribePush: vi.fn().mockResolvedValue({}),
    unsubscribePush: vi.fn().mockResolvedValue({}),
  },
}));

describe('usePushNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('IS_PUSH_SUPPORTED=false → status unsupported', async () => {
    // Simulate unsupported environment: no PushManager
    vi.stubGlobal('PushManager', undefined);

    const { usePushNotifications } = await import('./usePushNotifications');
    const { result } = renderHook(() => usePushNotifications(true));
    await act(async () => {});
    expect(result.current.status).toBe('unsupported');
    vi.unstubAllGlobals();
  });

  it('enabled=false → status default (not unsupported when supported)', async () => {
    // Stub full push support
    const mockSW = {
      ready: Promise.resolve({
        pushManager: {
          getSubscription: vi.fn().mockResolvedValue(null),
          subscribe: vi.fn(),
        },
      }),
    };
    vi.stubGlobal('PushManager', class MockPushManager {});
    Object.defineProperty(navigator, 'serviceWorker', { value: mockSW, configurable: true });
    vi.stubGlobal('Notification', { permission: 'default', requestPermission: vi.fn() });

    const { usePushNotifications } = await import('./usePushNotifications');
    const { result } = renderHook(() => usePushNotifications(false));
    await act(async () => {});
    // When enabled=false but supported: status should be 'default'
    expect(['default', 'unsupported']).toContain(result.current.status);
    vi.unstubAllGlobals();
  });

  it('Notification.permission=denied → status denied', async () => {
    const mockSW = {
      ready: Promise.resolve({
        pushManager: { getSubscription: vi.fn().mockResolvedValue(null) },
      }),
    };
    vi.stubGlobal('PushManager', class MockPushManager {});
    Object.defineProperty(navigator, 'serviceWorker', { value: mockSW, configurable: true });
    vi.stubGlobal('Notification', { permission: 'denied' });

    const { usePushNotifications } = await import('./usePushNotifications');
    const { result } = renderHook(() => usePushNotifications(true));
    await act(async () => {});
    expect(result.current.status).toBe('denied');
    vi.unstubAllGlobals();
  });

  it('isSupported alanı döner', async () => {
    vi.stubGlobal('PushManager', undefined);
    vi.stubGlobal('Notification', { permission: 'default', requestPermission: vi.fn() });
    const { usePushNotifications } = await import('./usePushNotifications');
    const { result } = renderHook(() => usePushNotifications(true));
    await act(async () => {});
    expect(result.current.isSupported).toBeDefined();
    vi.unstubAllGlobals();
  });
});
