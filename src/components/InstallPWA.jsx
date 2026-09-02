import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X } from 'lucide-react'

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return // Already installed, don't show prompt
    }

    // Check if user previously dismissed - only skip for 3 days
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    const dismissedTime = localStorage.getItem('pwa-install-dismissed-time')
    if (dismissed && dismissedTime) {
      const threeDays = 3 * 24 * 60 * 60 * 1000
      if (Date.now() - parseInt(dismissedTime) < threeDays) {
        return // Dismissed within 3 days, don't show
      }
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      
      // Show install prompt after 3 seconds (was 30 seconds)
      setTimeout(() => {
        setShowInstallPrompt(true)
      }, 3000)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    console.log(`User ${outcome === 'accepted' ? 'accepted' : 'dismissed'} the install prompt`)
    
    setDeferredPrompt(null)
    setShowInstallPrompt(false)
  }

  const handleDismiss = () => {
    setShowInstallPrompt(false)
    localStorage.setItem('pwa-install-dismissed', 'true')
    localStorage.setItem('pwa-install-dismissed-time', Date.now().toString())
  }

  return (
    <AnimatePresence>
      {showInstallPrompt && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-primary)',
            borderRadius: '16px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
          }}>
          
          <div className="p-4">
            {/* Close Button */}
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 p-1 rounded-lg hover:bg-white/10 transition">
              <X size={18} className="text-theme-tertiary" />
            </button>

            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                   style={{ background: '#6366f1' }}>
                <Download size={24} className="text-white" />
              </div>

              {/* Content */}
              <div className="flex-1">
                <h3 className="font-bold text-theme-primary mb-1">
                  Install Studdy Buddy
                </h3>
                <p className="text-sm text-theme-secondary mb-3">
                  Install our app for quick access and offline features!
                </p>

                {/* Buttons */}
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleInstall}
                    className="flex-1 px-4 py-2 rounded-lg text-white text-sm font-semibold"
                    style={{ background: '#6366f1' }}>
                    Install App
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleDismiss}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-theme-secondary hover:bg-white/5">
                    Not Now
                  </motion.button>
                </div>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="px-4 pb-4 pt-2 border-t" style={{ borderColor: 'var(--border-primary)' }}>
            <div className="grid grid-cols-3 gap-2 text-xs text-theme-tertiary">
              <div className="text-center">
                <div className="font-semibold text-theme-primary">⚡ Fast</div>
                Instant loading
              </div>
              <div className="text-center">
                <div className="font-semibold text-theme-primary">📴 Offline</div>
                Works offline
              </div>
              <div className="text-center">
                <div className="font-semibold text-theme-primary">🔔 Alerts</div>
                Push notifications
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
