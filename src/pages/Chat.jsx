import { useEffect, useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import { roomAPI } from '../services/api'
import { joinRoom, sendTyping, leaveRoom, getSocket, setupOnlineTracking } from '../services/socket'
import { showMessageNotification, playNotificationSound, requestNotificationPermission, startCallingTone, stopCallingTone } from '../utils/notifications'
import { Send, Video, ArrowLeft, Loader2, Phone, PhoneOff, X } from 'lucide-react'

export default function Chat() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [room, setRoom] = useState(null)
  const [otherUser, setOtherUser] = useState(null)
  const [messages, setMessages] = useState([])
  const [content, setContent] = useState('')
  const [typing, setTyping] = useState(false)
  const [typingUsers, setTypingUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [blockedWarning, setBlockedWarning] = useState('')
  const [onlineUsers, setOnlineUsers] = useState(new Set())
  // ── Calling state ──────────────────────────────────────────────────────────
  const [callingState, setCallingState] = useState(null) // null | { type: 'audio'|'video', status: 'calling'|'rejected' }
  const callingTimerRef = useRef(null)
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  // Fetch room + messages
  useEffect(() => {
    const fetchRoomData = async () => {
      try {
        setLoading(true)
        const res = await roomAPI.getById(roomId)
        const roomData = res.data.data?.room
        const messagesData = res.data.data?.messages || []
        setRoom(roomData)
        setMessages(messagesData)
        const uid = user._id
        const s1 = roomData.student1?._id || roomData.student1
        const s2 = roomData.student2?._id || roomData.student2
        setOtherUser(String(uid) === String(s1) ? roomData.student2 : roomData.student1)
        requestNotificationPermission()
      } catch (err) {
        console.error('Failed to fetch room data:', err)
      } finally {
        setLoading(false)
      }
    }
    if (user) fetchRoomData()
  }, [roomId, user])

  // Socket events
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return
    joinRoom(roomId, user._id)

    const handleMessage = (data) => {
      setMessages(prev => {
        const exists = prev.find(m => m._id === data._id && !data.temp)
        if (exists) return prev
        return [...prev, data]
      })
      const isOwn = String(data.senderId) === String(user._id) || String(data.senderId?._id) === String(user._id)
      if (!isOwn && !document.hasFocus()) {
        showMessageNotification(otherUser?.name || 'Someone', data.content)
        playNotificationSound()
      }
    }

    const handleConfirmed = (data) => {
      setMessages(prev => prev.map(m => m._id === data.tempId ? { ...data, temp: false } : m))
    }

    const handleBlocked = (data) => {
      setBlockedWarning(data.reason || 'Message blocked: inappropriate content.')
      setTimeout(() => setBlockedWarning(''), 4000)
    }

    const handleTyping = (data) => {
      if (data.userId !== user._id) {
        setTypingUsers(prev => [...new Set([...prev, data.userId])])
        setTimeout(() => setTypingUsers(prev => prev.filter(id => id !== data.userId)), 3000)
      }
    }

    socket.on('messageReceived', handleMessage)
    socket.on('messageConfirmed', handleConfirmed)
    socket.on('messageBLocked', handleBlocked)
    socket.on('userTyping', handleTyping)
    socket.on('roomJoined', (data) => { if (data.messages?.length > 0) setMessages(data.messages) })

    // ── Call rejected by other side ──────────────────────────────────────────
    const handleCallRejected = () => {
      stopCallingTone()
      clearTimeout(callingTimerRef.current)
      setCallingState({ ...callingState, status: 'rejected' })
      setTimeout(() => setCallingState(null), 2500)
    }
    const handleCallAccepted = () => {
      stopCallingTone()
      clearTimeout(callingTimerRef.current)
    }
    socket.on('callRejected', handleCallRejected)
    socket.on('callAccepted', handleCallAccepted)

    return () => {
      socket.off('messageReceived', handleMessage)
      socket.off('messageConfirmed', handleConfirmed)
      socket.off('messageBLocked', handleBlocked)
      socket.off('userTyping', handleTyping)
      socket.off('roomJoined')
      socket.off('callRejected', handleCallRejected)
      socket.off('callAccepted', handleCallAccepted)
      leaveRoom(roomId)
    }
  }, [roomId, user._id, otherUser])

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Online status
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return
    setupOnlineTracking((updatedSet) => setOnlineUsers(new Set(updatedSet)))
  }, [])

  const isOtherOnline = otherUser ? onlineUsers.has(String(otherUser._id || otherUser)) : false

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!content.trim()) return
    const socket = getSocket()
    if (socket) {
      socket.emit('sendMessage', { roomId, userId: user._id, content: content.trim() })
    }
    setContent('')
    setTyping(false)
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  const handleTypingChange = (e) => {
    setContent(e.target.value)
    if (!typing) { setTyping(true); sendTyping(roomId, user._id) }
    clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => setTyping(false), 3000)
  }

  // ── Initiate call ────────────────────────────────────────────────────────
  const initiateCall = (callType) => {
    const socket = getSocket()
    if (!socket || !otherUser || !user) return

    // Emit initiateCall FIRST so receiver gets the ring
    socket.emit('initiateCall', {
      roomId,
      fromUserId: user._id,
      toUserId: otherUser._id || otherUser,
      callType,
    })

    startCallingTone()

    // Navigate with caller=true so VideoCall page doesn't re-emit initiateCall
    const audioParam = callType === 'audio' ? '&audioOnly=true' : ''
    navigate(`/video-call/${roomId}?caller=true${audioParam}`)

    callingTimerRef.current = setTimeout(() => {
      stopCallingTone()
    }, 30000)
  }

  const cancelCall = () => {
    const socket = getSocket()
    socket?.emit('callRejected', {
      roomId,
      fromUserId: user._id,
      toUserId: otherUser?._id || otherUser,
    })
    stopCallingTone()
    clearTimeout(callingTimerRef.current)
    setCallingState(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
            <Loader2 size={36} className="text-indigo-500" />
          </motion.div>
          <p className="mt-3 text-sm text-theme-secondary">Loading chat...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>

      {/* ── Chat Header — sits below navbar (mt-16 = 64px) ── */}
      <div style={{
        position: 'relative',
        zIndex: 20,
        marginTop: '64px',
        flexShrink: 0,
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-primary)',
      }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', gap: 12 }}>

          {/* Left: back + avatar + name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
            <Link to="/chats">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition"
                style={{ color: '#6366f1', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <ArrowLeft size={20} />
              </motion.button>
            </Link>

            {/* Avatar */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: '#6366f1',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 700, fontSize: 16, overflow: 'hidden',
              }}>
                {otherUser?.profileImage
                  ? <img src={otherUser.profileImage} alt={otherUser?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (otherUser?.name?.charAt(0).toUpperCase() || 'U')}
              </div>
              {/* Online dot */}
              <div style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 12, height: 12, borderRadius: '50%',
                background: isOtherOnline ? '#10b981' : '#9ca3af',
                border: '2px solid var(--bg-secondary)',
              }} />
            </div>

            {/* Name + status */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="text-theme-primary font-bold text-sm truncate">
                {otherUser?.name || 'Unknown User'}
              </p>
              <p style={{ fontSize: 12, color: isOtherOnline ? '#10b981' : '#9ca3af', marginTop: 2 }}>
                {isOtherOnline ? 'Online' : 'Offline'}
              </p>
            </div>
          </div>

          {/* Right: call buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => initiateCall('audio')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold transition"
              style={{ background: '#6366f1' }}>
              <Phone size={16} />
              <span>Call</span>
            </motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => initiateCall('video')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold transition"
              style={{ background: '#10b981' }}>
              <Video size={16} />
              <span>Video</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* ── Messages area ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px', position: 'relative' }}>
        {messages.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
            <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity }}
              className="w-16 h-16 rounded-lg flex items-center justify-center"
              style={{ background: '#e0e7ff' }}>
              <Send size={24} className="text-indigo-500" />
            </motion.div>
            <p className="text-theme-secondary text-sm">No messages yet. Start the conversation!</p>
          </motion.div>
        ) : (
          messages.map((msg, index) => {
            const isOwn = String(msg.senderId) === String(user._id) || String(msg.senderId?._id) === String(user._id)
            const prevSender = messages[index - 1]?.senderId
            const showAvatar = index === 0 || String(prevSender) !== String(msg.senderId) && String(prevSender?._id) !== String(msg.senderId)
            const time = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''

            return (
              <motion.div key={msg._id || index}
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                style={{ display: 'flex', alignItems: 'flex-end', gap: 8, justifyContent: isOwn ? 'flex-end' : 'flex-start', marginBottom: 8 }}>

                {/* Other user avatar */}
                {!isOwn && (
                  <div style={{ flexShrink: 0, width: 32, height: 32 }}>
                    {showAvatar ? (
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 12, overflow: 'hidden' }}>
                        {otherUser?.profileImage
                          ? <img src={otherUser.profileImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : otherUser?.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    ) : <div />}
                  </div>
                )}

                {/* Bubble */}
                <div style={{ maxWidth: '70%' }}>
                  <div className={isOwn ? '' : ''} style={isOwn ? {
                    background: '#6366f1',
                    borderRadius: '16px 16px 4px 16px',
                    padding: '10px 14px',
                    opacity: msg.temp ? 0.7 : 1,
                  } : {
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '16px 16px 16px 4px',
                    padding: '10px 14px',
                  }}>
                    <p className={isOwn ? 'text-white' : 'text-theme-primary'} style={{ fontSize: 13, lineHeight: 1.5, wordBreak: 'break-word', margin: 0 }}>{msg.content}</p>
                    <p className={isOwn ? 'text-indigo-100' : 'text-theme-tertiary'} style={{ fontSize: 10, marginTop: 4, textAlign: isOwn ? 'right' : 'left' }}>
                      {time}{msg.temp ? ' ✓' : ''}
                    </p>
                  </div>
                </div>
              </motion.div>
            )
          })
        )}

        {/* Typing indicator */}
        <AnimatePresence>
          {typingUsers.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                {otherUser?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="rounded-2xl px-4 py-2" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  {[0, 0.15, 0.3].map((delay, i) => (
                    <motion.div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#6366f1' }}
                      animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay }} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input area ── */}
      <div style={{ position: 'relative', zIndex: 20, flexShrink: 0, background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-primary)' }}>
        {/* Blocked message warning */}
        {blockedWarning && (
          <div style={{
            padding: '8px 16px',
            background: 'rgba(239,68,68,0.1)',
            borderTop: '1px solid rgba(239,68,68,0.2)',
            color: '#ef4444',
            fontSize: 12,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            🚫 {blockedWarning}
          </div>
        )}
        <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '12px 16px' }}>
          <input
            type="text"
            placeholder="Type a message..."
            value={content}
            onChange={handleTypingChange}
            autoComplete="off"
            className="flex-1 px-4 py-3 text-sm rounded-lg outline-none transition text-theme-primary"
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-primary)',
            }}
            onFocus={e => e.target.style.border = '1px solid #6366f1'}
            onBlur={e => e.target.style.border = '1px solid var(--border-primary)'}
          />
          <motion.button type="submit" disabled={!content.trim()}
            whileHover={{ scale: content.trim() ? 1.05 : 1 }}
            whileTap={{ scale: content.trim() ? 0.95 : 1 }}
            className="w-11 h-11 flex items-center justify-center rounded-lg text-white transition"
            style={{
              cursor: content.trim() ? 'pointer' : 'default',
              background: content.trim() ? '#6366f1' : '#e5e7eb',
              opacity: content.trim() ? 1 : 0.5,
            }}>
            <Send size={18} />
          </motion.button>
        </form>
      </div>
    </div>
  )
}
