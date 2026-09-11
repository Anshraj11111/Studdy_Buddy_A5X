import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, BellOff } from 'lucide-react';
import { setupPushNotifications } from '../services/pushNotification';

export default function NotificationPermissionPrompt() {
  const [show, setShow] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    // Check if notification permission is needed
    const checkPermission = async () => {
      if (!('Notification' in window)) {
        return; // Browser doesn't support notifications
      }

      const permission = Notification.permission;
      
      // Show prompt if permission is default (not asked yet)
      if (permission === 'default') {
        // Wait a bit before showing (better UX)
        setTimeout(() => {
          setShow(true);
        }, 2000);
      }
    };

    checkPermission();
  }, []);

  const handleEnable = async () => {
    setRequesting(true);
    try {
      const success = await setupPushNotifications();
      
      if (success) {
        setShow(false);
      } else {
        alert('Could not enable notifications. Please check your browser settings.');
      }
    } catch (err) {
      console.error('Error enabling notifications:', err);
      alert('Failed to enable notifications: ' + err.message);
    } finally {
      setRequesting(false);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    // Remember dismissal for this session
    sessionStorage.setItem('notification_prompt_dismissed', 'true');
  };

  // Don't show if already dismissed this session
  useEffect(() => {
    if (sessionStorage.getItem('notification_prompt_dismissed') === 'true') {
      setShow(false);
    }
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-20 right-4 z-[9999] max-w-sm"
        >
          <div
            className="rounded-2xl p-5 shadow-2xl border"
            style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-primary)',
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'rgba(99,102,241,0.1)' }}
              >
                <Bell className="text-indigo-500" size={20} />
              </div>

              <div className="flex-1">
                <h3
                  className="font-bold mb-1"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Enable Notifications
                </h3>
                <p
                  className="text-sm mb-4"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Get notified when students post doubts or when you receive new messages.
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={handleEnable}
                    disabled={requesting}
                    className="flex-1 px-4 py-2 rounded-lg font-semibold text-white text-sm transition disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
                  >
                    {requesting ? (
                      <>
                        <div className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Enabling...
                      </>
                    ) : (
                      'Enable'
                    )}
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="px-4 py-2 rounded-lg font-semibold text-sm transition"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-primary)',
                    }}
                  >
                    Later
                  </button>
                </div>
              </div>

              <button
                onClick={handleDismiss}
                className="p-1 rounded-lg transition hover:bg-white/10"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
