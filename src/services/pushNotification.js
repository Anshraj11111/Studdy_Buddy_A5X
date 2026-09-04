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

// Guard: prevent concurrent setup calls
let _setupInProgress = false
let _setupDone = false

/**
 * Full flow: get VAPID key → request permission → subscribe → save to backend
 * Call this after user logs in. Safe to call multiple times — idempotent.
 * @returns {boolean} true if successfully subscribed
 */
export async function setupPushNotifications() {
  // Already set up this session — skip
  if (_setupDone) return true
  // Another call already in progress — skip
  if (_setupInProgress) return false

  _setupInProgress = true

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
      _setupDone = true
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
      userVisibleOnly: true,
      applicationServerKey,
    })

    // 7. Save subscription to backend
    await saveSubscriptionToBackend(subscription)

    _setupDone = true
    console.log('[Push] Successfully subscribed to push notifications')
    return true
  } catch (err) {
    console.warn('[Push] Setup failed:', err.message)
    return false
  } finally {
    _setupInProgress = false
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
      await api.delete('/push/unsubscribe', {
        data: { endpoint: subscription.endpoint },
      })
      await subscription.unsubscribe()
      console.log('[Push] Unsubscribed from push notifications')
    }
  } catch (err) {
    console.warn('[Push] Teardown failed:', err.message)
  } finally {
    // Reset flags so next login can re-subscribe
    _setupDone = false
    _setupInProgress = false
  }
}
