import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('../lib/api', () => ({
  api: {
    // hook uses `data.publicKey` directly — no `.data` wrapper
    get: vi.fn().mockResolvedValue({ publicKey: 'dGVzdA==' }),
    post: vi.fn().mockResolvedValue({}),
  },
}));

import { usePushSubscription } from './usePushSubscription';
import { api } from '../lib/api';

describe('usePushSubscription', () => {
  beforeEach(() => {
    vi.stubGlobal('Notification', {
      requestPermission: vi.fn().mockResolvedValue('granted'),
      permission: 'default',
    });
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        ready: Promise.resolve({
          pushManager: {
            subscribe: vi.fn().mockResolvedValue({
              toJSON: () => ({
                endpoint: 'https://push.example.com/sub',
                keys: { p256dh: 'p256dhKey', auth: 'authKey' },
              }),
            }),
          },
        }),
      },
      configurable: true,
    });
    vi.stubGlobal('PushManager', class {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('initial isSubscribed is false', () => {
    const { result } = renderHook(() => usePushSubscription());
    expect(result.current.isSubscribed).toBe(false);
  });

  it('subscribe success path sets isSubscribed to true', async () => {
    const { result } = renderHook(() => usePushSubscription());
    await act(async () => {
      await result.current.subscribe();
    });
    await waitFor(() => {
      expect(result.current.isSubscribed).toBe(true);
    });
    expect(api.post).toHaveBeenCalled();
  });

  it('permission denied is a no-op and does not subscribe', async () => {
    (Notification as unknown as { requestPermission: ReturnType<typeof vi.fn> }).requestPermission =
      vi.fn().mockResolvedValue('denied');
    const { result } = renderHook(() => usePushSubscription());
    await act(async () => {
      await result.current.subscribe();
    });
    expect(result.current.isSubscribed).toBe(false);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('isSupported false is a no-op', async () => {
    // 'PushManager' in window stays true even when stubbed to undefined —
    // remove the property entirely so the 'in' check returns false
    const hadPushManager = 'PushManager' in window;
    if (hadPushManager) delete (window as Record<string, unknown>).PushManager;
    const { result } = renderHook(() => usePushSubscription());
    expect(result.current.isSupported).toBe(false);
    await act(async () => {
      await result.current.subscribe();
    });
    expect(result.current.isSubscribed).toBe(false);
    expect(api.post).not.toHaveBeenCalled();
  });
});
