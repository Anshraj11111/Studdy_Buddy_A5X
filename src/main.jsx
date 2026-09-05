import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)

// In dev: unregister any existing SW so it doesn't serve stale React bundles
// (stale SW causes "useState is null" / "Invalid hook call" errors)
if ('serviceWorker' in navigator && import.meta.env.DEV) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(r => r.unregister())
  })
}

// Register Service Worker for PWA — production only
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker registered successfully:', registration.scope)

        // Check for updates periodically
        setInterval(() => {
          registration.update()
        }, 60000) // Check every minute

        // Handle service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              if (confirm('New version available! Refresh to update?')) {
                newWorker.postMessage({ type: 'SKIP_WAITING' })
                window.location.reload()
              }
            }
          })
        })
      })
      .catch((error) => {
        console.error('❌ Service Worker registration failed:', error)
      })

    // Handle PUSH_NAVIGATE messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'PUSH_NAVIGATE' && event.data?.url) {
        window.location.href = event.data.url
      }
    })
  })
}

// Handle offline/online events
window.addEventListener('online', () => {
  console.log('🟢 Back online!')
})

window.addEventListener('offline', () => {
  console.log('🔴 You are offline')
})
