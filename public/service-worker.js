const CACHE_NAME = 'studdy-buddy-v3'
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
]

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache)
    })
  )
})

// Fetch event
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return
  }

  // NEVER cache API requests - always go to network
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('onrender.com') ||
      event.request.url.includes('studdybuddy')) {
    event.respondWith(fetch(event.request))
    return
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response
      }

      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response
        }

        const responseToCache = response.clone()
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache)
        })

        return response
      })
    })
    .catch(() => {
      // Return offline page if needed
      return caches.match('/')
    })
  )
})

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
})

// Push notification event
self.addEventListener('push', (event) => {
  if (!event.data) return

  try {
    const data = event.data.json()
    const options = {
      body: data.body || 'You have a new notification',
      icon: data.icon || '/icons/icon-192x192.png',
      badge: '/Neon Study Buddy App Icon.png',
      image: data.image || undefined,
      data: {
        url: data.url || '/',
        type: data.type || 'general',
        timestamp: data.timestamp || Date.now(),
      },
      vibrate: [200, 100, 200],
      tag: data.type || 'notification',
      requireInteraction: false,
    }

    event.waitUntil(
      self.registration.showNotification(data.title || 'Studdy Buddy', options)
    )
  } catch (err) {
    console.error('Push event error:', err)
  }
})

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const notificationData = event.notification.data || {}
  const targetUrl = notificationData.url || '/'
  
  // Build full URL - handle both relative and absolute paths
  const fullUrl = targetUrl.startsWith('http') 
    ? targetUrl 
    : self.registration.scope.replace(/\/$/, '') + targetUrl

  console.log('[SW] Notification clicked! Target URL:', fullUrl)

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      
      // If app is already open in any tab - focus it and navigate
      if (clientList.length > 0) {
        const client = clientList[0]
        // Navigate to the target URL
        client.navigate(fullUrl)
        return client.focus()
      }
      
      // App is not open - open new window with target URL
      if (clients.openWindow) {
        return clients.openWindow(fullUrl)
      }
    })
  )
})
