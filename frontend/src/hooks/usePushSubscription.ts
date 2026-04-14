import { useState, useCallback } from 'react'
import { api } from '../lib/api'

export function usePushSubscription() {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isSupported] = useState(() =>
    'serviceWorker' in navigator && 'PushManager' in window
  )

  const subscribe = useCallback(async () => {
    if (!isSupported) return
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return

    // Get VAPID public key from backend
    const data = await api.get<{ publicKey: string }>('/notifications/vapid-public-key')
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.publicKey),
    })

    const { endpoint, keys } = subscription.toJSON() as {
      endpoint: string
      keys: { p256dh: string; auth: string }
    }
    await api.post('/notifications/push-subscriptions', {
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    })
    setIsSubscribed(true)
  }, [isSupported])

  return { isSubscribed, isSupported, subscribe }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}
