import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, PhoneOff, Video } from 'lucide-react'
import { getSocket } from '../services/socket'
import { showCallNotification, startRingtone, stopRingtone } from '../utils/notifications'
import { useAuthStore } from '../store/authStore'

export default function IncomingCallModal() {
  const [incomingCall, setIncomingCall] = useState(null)
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const autoRejectTimer = useRef(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      const socket = getSocket()
      if (!socket) return

      const handleIncomingCall = (data) => {
        const currentPath = window.location.pathname
        if (currentPath.includes('/video-call/')) return

        setIncomingCall({
          roomId: data.roomId,
          caller: data.caller || data.fromUser,
          callerId: data.fromUserId || data.callerId,
          callType: data.callType || 'video', // 'audio' or 'video'
        })

        // Start ringtone
        startRingtone()

        // Browser notification
        const callerName = data.caller?.name || data.fromUser?.name || 'Someone'
        showCallNotification(callerName)

        // Vibrate on mobile (only if supported and user has interacted with page)
        try {
          if (navigator.vibrate && typeof navigator.vibrate === 'function' && document.hasFocus()) {
            // Small delay to ensure user has interacted
            setTimeout(() => {
              try { navigator.vibrate([300, 200, 300, 200, 300]) } catch (_) {}
            }, 500)
          }
        } catch (err) {
          // Vibration blocked - safely ignore
        }

        // Auto reject after 30s
        autoRejectTimer.current = setTimeout(() => {
          handleAutoReject(data)
        }, 30000)
      }

      const handleCallRejected = () => {
        setIncomingCall(null)
        stopRingtone()
        clearTimeout(autoRejectTimer.current)
      }

      socket.on('incomingCall', handleIncomingCall)
      socket.on('callEnded', handleCallRejected)

      return () => {
        socket.off('incomingCall', handleIncomingCall)
        socket.off('callEnded', handleCallRejected)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [user])

  const handleAutoReject = (data) => {
    const socket = getSocket()
    socket?.emit('callRejected', {
      roomId: data.roomId,
      fromUserId: user?._id,
      toUserId: data.fromUserId,
    })
    setIncomingCall(null)
    stopRingtone()
  }

  const handleAccept = () => {
    if (!incomingCall) return
    stopRingtone()
    clearTimeout(autoRejectTimer.current)
    navigate(`/video-call/${incomingCall.roomId}?autoStart=true${incomingCall.callType === 'audio' ? '&audioOnly=true' : ''}`)
    setIncomingCall(null)
  }

  const handleReject = () => {
    if (!incomingCall) return
    const socket = getSocket()
    socket?.emit('callRejected', {
      roomId: incomingCall.roomId,
      fromUserId: user?._id,
      toUserId: incomingCall.callerId,
    })
    stopRingtone()
    clearTimeout(autoRejectTimer.current)
    setIncomingCall(null)
  }

  return (
    <AnimatePresence>
      {incomingCall && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {/* Pulsing background rings */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            {[1, 2, 3].map(i => (
              <motion.div key={i}
                style={{
                  position: 'absolute',
                  width: 160, height: 160, borderRadius: '50%',
                  border: '2px solid rgba(99,102,241,0.3)',
                }}
                animate={{ scale: [1, 2.5 + i * 0.5], opacity: [0.4, 0] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.4, ease: 'easeOut' }}
              />
            ))}
          </div>

          {/* Card */}
          <motion.div
            initial={{ scale: 0.85, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.85, y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            style={{
              width: 320, borderRadius: 28,
              background: 'linear-gradient(160deg, #0f0c24 0%, #1a1535 100%)',
              border: '1px solid rgba(99,102,241,0.3)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(99,102,241,0.1)',
              padding: '40px 32px 32px',
              textAlign: 'center',
              position: 'relative', overflow: 'hidden',
            }}
          >
            {/* Top gradient bar */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg,transparent,#6366f1,#8b5cf6,transparent)' }} />

            {/* Call type label */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 24 }}>
              {incomingCall.callType === 'audio'
                ? <Phone size={14} style={{ color: '#818cf8' }} />
                : <Video size={14} style={{ color: '#818cf8' }} />}
              <span style={{ color: '#818cf8', fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Incoming {incomingCall.callType === 'audio' ? 'Voice' : 'Video'} Call
              </span>
            </div>

            {/* Avatar */}
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: 20 }}>
              <motion.div
                animate={{ boxShadow: ['0 0 0px rgba(99,102,241,0)', '0 0 40px rgba(99,102,241,0.6)', '0 0 0px rgba(99,102,241,0)'] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                style={{
                  width: 100, height: 100, borderRadius: '50%',
                  background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', border: '3px solid rgba(99,102,241,0.5)',
                  margin: '0 auto',
                }}>
                {incomingCall.caller?.profileImage
                  ? <img src={incomingCall.caller.profileImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ color: 'white', fontWeight: 700, fontSize: 40 }}>
                      {incomingCall.caller?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                }
              </motion.div>
            </div>

            {/* Name */}
            <h2 style={{ color: 'white', fontSize: 22, fontWeight: 700, margin: '0 0 6px' }}>
              {incomingCall.caller?.name || 'Unknown'}
            </h2>

            {/* Animated calling text */}
            <motion.p
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{ color: 'rgba(148,163,184,0.8)', fontSize: 14, margin: '0 0 40px' }}
            >
              {incomingCall.callType === 'audio' ? '🎙️' : '📹'} Calling you...
            </motion.p>

            {/* Buttons */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 40 }}>
              {/* Reject */}
              <div style={{ textAlign: 'center' }}>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleReject}
                  style={{
                    width: 64, height: 64, borderRadius: '50%',
                    background: 'linear-gradient(135deg,#ef4444,#dc2626)',
                    boxShadow: '0 4px 20px rgba(239,68,68,0.5)',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white',
                  }}
                >
                  <PhoneOff size={26} />
                </motion.button>
                <p style={{ color: 'rgba(148,163,184,0.7)', fontSize: 11, marginTop: 8, fontWeight: 600 }}>Decline</p>
              </div>

              {/* Accept */}
              <div style={{ textAlign: 'center' }}>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  onClick={handleAccept}
                  style={{
                    width: 64, height: 64, borderRadius: '50%',
                    background: 'linear-gradient(135deg,#22c55e,#16a34a)',
                    boxShadow: '0 4px 20px rgba(34,197,94,0.5)',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white',
                  }}
                >
                  <Phone size={26} />
                </motion.button>
                <p style={{ color: 'rgba(148,163,184,0.7)', fontSize: 11, marginTop: 8, fontWeight: 600 }}>Accept</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
