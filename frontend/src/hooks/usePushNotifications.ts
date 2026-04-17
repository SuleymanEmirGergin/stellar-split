/**
 * Manages Web Push subscription lifecycle via VAPID.
 * Requires: browser Push API support, JWT auth, HTTPS or localhost.
 */
import { useState, useEffect, useCallback } from 'react';
import { notificationsApi } from '../lib/api';

// Evaluated once at module load — never changes after page load
const IS_PUSH_SUPPORTED =
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

// Cache the ServiceWorkerRegistration so we don't await .ready three times
let swRegistration: ServiceWorkerRegistration | null = null;
async function getSwRegistration(): Promise<ServiceWorkerRegistration> {
  if (!swRegistration) swRegistration = await navigator.serviceWorker.ready;
  return swRegistration;
}

export type PushStatus = 'unsupported' | 'denied' | 'default' | 'subscribed' | 'loading';

export function usePushNotifications(enabled: boolean) {
  const [status, setStatus] = useState<PushStatus>('loading');

  useEffect(() => {
    if (!enabled || !IS_PUSH_SUPPORTED) {
      setStatus(IS_PUSH_SUPPORTED ? 'default' : 'unsupported');
      return;
    }
    if (Notification.permission === 'denied') {
      setStatus('denied');
      return;
    }
    getSwRegistration()
      .then(reg => reg.pushManager.getSubscription())
      .then(sub => setStatus(sub ? 'subscribed' : 'default'))
      .catch(() => setStatus('default'));
  }, [enabled]);

  const subscribe = useCallback(async (): Promise<void> => {
    if (!IS_PUSH_SUPPORTED) throw new Error('Push not supported');
    setStatus('loading');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus('denied');
        return;
      }
      const keyRes = await notificationsApi.getVapidPublicKey();
      const reg = await getSwRegistration();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyRes.data.data.publicKey),
      });
      await notificationsApi.subscribePush(sub.toJSON());
      setStatus('subscribed');
    } catch {
      setStatus('default');
      throw new Error('Push subscription failed');
    }
  }, []);

  const unsubscribe = useCallback(async (): Promise<void> => {
    setStatus('loading');
    try {
      const reg = await getSwRegistration();
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      await notificationsApi.unsubscribePush().catch(() => { /* best-effort */ });
      setStatus('default');
    } catch {
      setStatus('default');
    }
  }, []);

  return { status, subscribe, unsubscribe, isSupported: IS_PUSH_SUPPORTED };
}
