import io from 'socket.io-client'
import loadBalancer from '../config/loadBalancer.js'

// Check if we're in development or production
const isLocalDev = import.meta.env.DEV || import.meta.env.VITE_SOCKET_URL?.includes('localhost')

// Use load balancer in production, localhost in development
const SOCKET_URL = isLocalDev
  ? (import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000')
  : loadBalancer.getSocketUrl()

console.log('🔌 Socket Mode:', isLocalDev ? 'Development (localhost)' : 'Production (Load Balanced)')
console.log('🔌 Socket URL:', SOCKET_URL)

let socket = null

export const initSocket = (token, userId, userName = '', userImage = '', userRole = '') => {
  if (socket?.connected) {
    console.log('✅ Socket already connected, userId:', userId)
    return socket
  }

  console.log('🔌 Initializing socket with userId:', userId)

  // In production, get fresh socket URL from load balancer
  const socketUrl = isLocalDev ? SOCKET_URL : loadBalancer.getSocketUrl()

  socket = io(socketUrl, {
    auth: { token, userId, userName, userImage, userRole },
    // Try WebSocket first, fall back to polling if WebSocket is blocked by firewall
    transports: ['websocket', 'polling'],
    upgrade: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 10,
    timeout: 20000,
  })

  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket.id)
    console.log('✅ User ID:', userId)
    console.log('✅ Socket Server:', socketUrl)
    console.log('✅ Auth data sent:', { token: '***', userId, userName, userImage, userRole })
  })

  // Handle reconnection with load balancing
  socket.on('reconnect_attempt', () => {
    if (!isLocalDev) {
      // Try a different server on reconnect
      const newUrl = loadBalancer.getSocketUrl()
      console.log('🔄 Reconnecting to:', newUrl)
      socket.io.uri = newUrl
    }
  })

  // Populate global onlineUsers set on first connect so late-mounting components get it
  socket.on('onlineUsers', ({ userIds }) => {
    console.log('📋 Received online users list from server:', userIds)
    onlineUsers.clear()
    userIds.forEach(id => onlineUsers.add(String(id)))
  })

  // Debug: Listen for userOnline broadcasts
  socket.on('userOnline', ({ userId }) => {
    console.log('🟢 User came online:', userId)
  })

  // Debug: Listen for userOffline broadcasts
  socket.on('userOffline', ({ userId }) => {
    console.log('🔴 User went offline:', userId)
  })

  return socket
}

export const getSocket = () => socket

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

// Chat events
export const joinRoom = (roomId, userId) => {
  socket?.emit('joinRoom', { roomId, userId })
}

export const sendMessage = (roomId, content) => {
  const userId = localStorage.getItem('userId') // Get from auth
  socket?.emit('sendMessage', { roomId, userId, content })
}

export const onMessage = (callback) => {
  socket?.on('messageReceived', callback)
}

export const onTyping = (callback) => {
  socket?.on('userTyping', callback)
}

export const sendTyping = (roomId, userId) => {
  socket?.emit('typing', { roomId, userId })
}

export const leaveRoom = (roomId) => {
  socket?.emit('leaveRoom', { roomId })
}

// Video events
export const initiateCall = (roomId, calleeId) => {
  socket?.emit('initiateCall', { roomId, calleeId })
}

export const onIncomingCall = (callback) => {
  socket?.on('incomingCall', callback)
}

export const acceptCall = (roomId, callerId) => {
  socket?.emit('callAccepted', { roomId, callerId })
}

export const rejectCall = (roomId, callerId) => {
  socket?.emit('callRejected', { roomId, callerId })
}

export const sendOffer = (roomId, recipientId, offer) => {
  socket?.emit('offer', { roomId, recipientId, offer })
}

export const onOffer = (callback) => {
  socket?.on('offer', callback)
}

export const sendAnswer = (roomId, recipientId, answer) => {
  socket?.emit('answer', { roomId, recipientId, answer })
}

export const onAnswer = (callback) => {
  socket?.on('answer', callback)
}

export const sendIceCandidate = (roomId, recipientId, candidate) => {
  socket?.emit('iceCandidate', { roomId, recipientId, candidate })
}

export const onIceCandidate = (callback) => {
  socket?.on('iceCandidate', callback)
}

export const endCall = (roomId) => {
  socket?.emit('callEnded', { roomId })
}

export const onCallEnded = (callback) => {
  socket?.on('callEnded', callback)
}

// Notification events
export const onNotification = (callback) => {
  socket?.on('notification', callback)
}

export const offNotification = () => {
  socket?.off('notification')
}

// Online status tracking
const onlineUsers = new Set()

export const getOnlineUsers = () => onlineUsers

export const setupOnlineTracking = (callback) => {
  if (!socket) return

  // ── Fire immediately with whatever we already have ──────────────────────
  if (onlineUsers.size > 0) {
    callback?.(new Set(onlineUsers))
  }

  // Remove old listeners first to avoid duplicates on re-mount
  socket.off('onlineUsers')
  socket.off('userOnline')
  socket.off('userOffline')

  // Full list from server (sent on connect)
  socket.on('onlineUsers', ({ userIds }) => {
    onlineUsers.clear()
    userIds.forEach(id => onlineUsers.add(String(id)))
    callback?.(new Set(onlineUsers))
  })

  // User came online
  socket.on('userOnline', ({ userId }) => {
    onlineUsers.add(String(userId))
    callback?.(new Set(onlineUsers))
  })

  // User went offline
  socket.on('userOffline', ({ userId }) => {
    onlineUsers.delete(String(userId))
    callback?.(new Set(onlineUsers))
  })

  // If socket already connected and we missed the onlineUsers event, request it again
  if (socket.connected && onlineUsers.size === 0) {
    socket.emit('getOnlineUsers')
  }
}

export const isUserOnline = (userId) => {
  return onlineUsers.has(String(userId))
}
