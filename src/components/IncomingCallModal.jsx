import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, PhoneOff } from 'lucide-react'
import { onIncomingCall, acceptCall, rejectCall, getSocket } from '../services/socket'
import { showCallNotification, playNotificationSound } from '../utils/notifications'
import { useAuthStore } from '../store/authStore'

export default function IncomingCallModal() {
  const [incomingCall, setIncomingCall] = useState(null)
  const navigate = useNavigate()
  const { user } = useAuthStore()

  useEffect(() => {
    // Wait a bit for socket to be initialized
    const timer = setTimeout(() => {
      const socket = getSocket()
      if (!socket) {
        console.log('IncomingCallModal: No socket available yet')
        return
      }

      console.log('IncomingCallModal: Setting up incoming call listener on socket:', socket.id)

      const handleIncomingCall = (data) => {
        console.log('🔔 Global incoming call received:', data)
        
        // Only show modal if we're NOT already on the video call page
        const currentPath = window.location.pathname
        const isOnVideoCallPage = currentPath.includes('/video-call/')
        
        if (isOnVideoCallPage) {
          console.log('🔔 Already on video call page, skipping global modal')
          return
        }
        
        // Show the modal
        setIncomingCall({
          roomId: data.roomId,
          caller: data.caller || data.fromUser,
          callerId: data.fromUserId || data.callerId,
        })
        
        // Show browser notification
        const callerName = data.caller?.name || data.fromUser?.name || 'Someone'
        showCallNotification(callerName)
        playNotificationSound()
      }

      socket.on('incomingCall', handleIncomingCall)
      console.log('IncomingCallModal: Listener attached to socket:', socket.id)

      return () => {
        console.log('IncomingCallModal: Removing listener from socket:', socket.id)
        socket.off('incomingCall', handleIncomingCall)
      }
    }, 500) // Wait 500ms for socket to initialize

    return () => clearTimeout(timer)
  }, [user])

  const handleAccept = () => {
    if (incomingCall) {
      // Navigate to video call page with autoStart flag
      navigate(`/video-call/${incomingCall.roomId}?autoStart=true`)
      setIncomingCall(null)
    }
  }

  const handleReject = () => {
    if (incomingCall) {
      const socket = getSocket()
      socket?.emit('callRejected', {
        roomId: incomingCall.roomId,
        fromUserId: user._id,
        toUserId: incomingCall.callerId,
      })
      setIncomingCall(null)
    }
  }

  return (
    <AnimatePresence>
      {incomingCall && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 z-[9999]"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleReject()
            }
          }}
        >
          <motion.div
            initial={{ scale: 0.8, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 20 }}
            className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 text-center shadow-2xl border border-gray-700 max-w-md w-full mx-4"
          >
            {/* Caller Avatar */}
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-24 h-24 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-3xl mx-auto mb-4 shadow-lg"
            >
              {incomingCall.caller?.name?.charAt(0).toUpperCase() || 'U'}
            </motion.div>

            {/* Caller Name */}
            <h2 className="text-white text-2xl font-bold mb-2">
              {incomingCall.caller?.name || 'Unknown User'}
            </h2>

            {/* Call Status */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="w-3 h-3 bg-green-500 rounded-full"
              />
              <p className="text-gray-300 text-lg">Incoming video call...</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleAccept}
                className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-full transition shadow-lg font-medium"
              >
                <Phone size={24} />
                Accept
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleReject}
                className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-full transition shadow-lg font-medium"
              >
                <PhoneOff size={24} />
                Reject
              </motion.button>
            </div>

            {/* Hint Text */}
            <p className="text-gray-500 text-sm mt-6">
              Click outside to reject
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
