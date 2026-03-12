import io from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

let socket = null

export const initSocket = (token, userId) => {
  if (socket?.connected) return socket

  socket = io(SOCKET_URL, {
    auth: { token, userId },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  })

  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket.id)
    console.log('✅ User ID:', userId)
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
