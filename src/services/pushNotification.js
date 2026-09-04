import api from './api'

/**
 * Convert a base64 VAPID public key to Uint8Array
 * (required by browser's pushManager.subscribe)
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

/**
 * Full flow: get VAPID key → request permission → subscribe → save to backend
 * Call this after user logs in.
 * @returns {boolean} true if successfully subscribed
 */
export async function setupPushNotifications() {
  try {
    // 1. Check browser support
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('[Push] Browser does not support push notifications')
      return false
    }

    // 2. Wait for service worker to be ready
    const registration = await navigator.serviceWorker.ready

    // 3. Check existing subscription — avoid re-subscribing if already done
    const existing = await registration.pushManager.getSubscription()
    if (existing) {
      // Already subscribed — just make sure backend has it saved (idempotent)
      await saveSubscriptionToBackend(existing)
      console.log('[Push] Already subscribed, subscription refreshed on backend')
      return true
    }

    // 4. Request notification permission
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.log('[Push] Notification permission denied')
      return false
    }

    // 5. Fetch VAPID public key from backend
    const { data } = await api.get('/push/vapid-public-key')
    const vapidPublicKey = data.data.publicKey
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey)

    // 6. Subscribe via PushManager
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true, // required — must show notification for every push
      applicationServerKey,
    })

    // 7. Save subscription to backend
    await saveSubscriptionToBackend(subscription)

    console.log('[Push] Successfully subscribed to push notifications')
    return true
  } catch (err) {
    // Don't crash the app — push is a nice-to-have
    console.warn('[Push] Setup failed:', err.message)
    return false
  }
}

/**
 * Save (or refresh) the push subscription on the backend.
 * Uses upsert on backend so safe to call multiple times.
 */
async function saveSubscriptionToBackend(subscription) {
  const subJson = subscription.toJSON()
  await api.post('/push/subscribe', {
    endpoint: subJson.endpoint,
    keys: {
      p256dh: subJson.keys.p256dh,
      auth: subJson.keys.auth,
    },
  })
}

/**
 * Unsubscribe from push notifications and remove from backend.
 * Call this on logout.
 */
export async function teardownPushNotifications() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      // Tell backend to remove this subscription first
      await api.delete('/push/unsubscribe', {
        data: { endpoint: subscription.endpoint },
      })
      // Then unsubscribe in browser
      await subscription.unsubscribe()
      console.log('[Push] Unsubscribed from push notifications')
    }
  } catch (err) {
    console.warn('[Push] Teardown failed:', err.message)
  }
}
