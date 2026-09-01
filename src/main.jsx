import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { Analytics } from '@vercel/analytics/react'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <>
    <App />
    <Analytics />
  </>
)

// Register Service Worker for PWA functionality
if ('serviceWorker' in navigator) {
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
              // New service worker available, prompt user to refresh
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
  })
}

// Handle offline/online events
window.addEventListener('online', () => {
  console.log('🟢 Back online!')
  // Optional: Show notification to user
})

window.addEventListener('offline', () => {
  console.log('🔴 You are offline')
  // Optional: Show offline indicator
})

