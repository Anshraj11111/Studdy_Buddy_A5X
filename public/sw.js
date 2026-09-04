// Service Worker for Studdy Buddy PWA
const CACHE_NAME = 'studdy-buddy-v1.0.5'
const RUNTIME_CACHE = 'studdy-buddy-runtime'

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
]

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...')
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching app shell')
        return cache.addAll(PRECACHE_ASSETS)
      })
      .then(() => self.skipWaiting())
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name)
            return caches.delete(name)
          })
      )
    }).then(() => self.clients.claim())
  )
})

// Fetch event - network first, then cache fallback
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return
  }

  // Skip API requests (always fetch fresh)
  if (url.pathname.startsWith('/api/')) {
    return
  }

  // Skip video call pages (WebRTC needs fresh connections)
  if (url.pathname.startsWith('/video-call')) {
    return
  }

  // Skip doubt pages (dynamic content needs fresh data)
  if (url.pathname.startsWith('/doubts/')) {
    return
  }

  // Network first strategy for navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone()
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone)
          })
          return response
        })
        .catch(() => {
          return caches.match(request)
            .then((cached) => cached || caches.match('/'))
        })
    )
    return
  }

  // Cache first strategy for static assets
  event.respondWith(
    caches.match(request)
      .then((cached) => {
        if (cached) {
          // Return cached version and update in background
          fetch(request).then((response) => {
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, response)
            })
          }).catch(() => {})
          return cached
        }

        // Not in cache, fetch from network
        return fetch(request)
          .then((response) => {
            // Cache successful responses
            if (response.status === 200) {
              const responseClone = response.clone()
              caches.open(RUNTIME_CACHE).then((cache) => {
                cache.put(request, responseClone)
              })
            }
            return response
          })
          .catch(() => {
            // Network failed, try to return offline page
            if (request.destination === 'document') {
              return caches.match('/')
            }
          })
      })
  )
})

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received')

  let payload = {
    title: 'Studdy Buddy',
    body: 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    url: '/',
    type: 'general',
  }

  // Parse JSON payload sent from backend webPush.service.js
  if (event.data) {
    try {
      const data = event.data.json()
      payload = { ...payload, ...data }
    } catch {
      payload.body = event.data.text()
    }
  }

  // Use unique tag per message so notifications don't collapse each other
  // For messages: unique per timestamp, for others: per type
  const isMessage = payload.type === 'message'
  const notifTag = isMessage
    ? `message-${payload.timestamp || Date.now()}`
    : payload.type || 'general'

  const options = {
    body: payload.body,
    icon: payload.icon || '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    // Strong vibration pattern — ensures phone vibrates and wakes screen
    vibrate: [300, 100, 300, 100, 300],
    tag: notifTag,
    renotify: true,        // always vibrate + sound even if same tag
    silent: false,         // explicitly enable sound (Android default channel)
    // Keep message notifications on screen until user interacts
    requireInteraction: isMessage,
    data: {
      url: payload.url || '/',
      type: payload.type,
      timestamp: payload.timestamp || Date.now(),
    },
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  )
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action)
  event.notification.close()

  // Dismiss action — just close
  if (event.action === 'dismiss') return

  // Open action or direct click — navigate to the relevant URL
  const targetUrl = event.notification.data?.url || '/'
  const fullUrl = self.location.origin + targetUrl

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If app is already open in a tab, focus it and navigate
      for (const client of windowClients) {
        if ('focus' in client) {
          client.focus()
          // Use postMessage to navigate — more reliable than client.navigate()
          client.postMessage({ type: 'PUSH_NAVIGATE', url: targetUrl })
          return
        }
      }
      // App not open — open a new window to the specific URL
      if (clients.openWindow) {
        return clients.openWindow(fullUrl)
      }
    })
  )
})

// Handle background sync
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag)
  
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages())
  }
})

async function syncMessages() {
  // Placeholder for syncing offline messages
  console.log('[SW] Syncing messages...')
}

// Log service worker messages
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data)
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
