import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import { roomAPI } from '../services/api'
import { joinRoom, sendTyping, leaveRoom, getSocket, setupOnlineTracking } from '../services/socket'
import { showMessageNotification, playNotificationSound, requestNotificationPermission } from '../utils/notifications'
import { Send, Video, ArrowLeft, Loader2, Phone } from 'lucide-react'

export default function Chat() {
  const { roomId } = useParams()
  const { user } = useAuthStore()
  const [room, setRoom] = useState(null)
  const [otherUser, setOtherUser] = useState(null)
  const [messages, setMessages] = useState([])
  const [content, setContent] = useState('')
  const [typing, setTyping] = useState(false)
  const [typingUsers, setTypingUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [onlineUsers, setOnlineUsers] = useState(new Set())
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

    const handleTyping = (data) => {
      if (data.userId !== user._id) {
        setTypingUsers(prev => [...new Set([...prev, data.userId])])
        setTimeout(() => setTypingUsers(prev => prev.filter(id => id !== data.userId)), 3000)
      }
    }

    socket.on('messageReceived', handleMessage)
    socket.on('messageConfirmed', handleConfirmed)
    socket.on('userTyping', handleTyping)
    socket.on('roomJoined', (data) => { if (data.messages?.length > 0) setMessages(data.messages) })

    return () => {
      socket.off('messageReceived', handleMessage)
      socket.off('messageConfirmed', handleConfirmed)
      socket.off('userTyping', handleTyping)
      socket.off('roomJoined')
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ position: 'relative' }}>
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, backgroundImage: 'url(/image.png)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div style={{ position: 'fixed', inset: 0, zIndex: 1, background: 'rgba(5,3,20,0.85)' }} />
        <div className="text-center" style={{ position: 'relative', zIndex: 2 }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
            <Loader2 size={36} style={{ color: '#818cf8' }} />
          </motion.div>
          <p className="mt-3 text-sm" style={{ color: 'rgba(148,163,184,0.6)', fontFamily: 'monospace' }}>Loading chat...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>

      {/* Background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, backgroundImage: 'url(/image.png)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, background: 'rgba(5,3,20,0.88)' }} />

      {/* ── Chat Header — sits below navbar (mt-16 = 64px) ── */}
      <div style={{
        position: 'relative',
        zIndex: 20,
        marginTop: '64px',           // below the app navbar
        flexShrink: 0,
        background: 'rgba(10,8,30,0.95)',
        borderBottom: '1px solid rgba(99,102,241,0.25)',
        backdropFilter: 'blur(20px)',
      }}>
        {/* top accent line */}
        <div style={{ height: 2, background: 'linear-gradient(90deg,transparent,#6366f1,#8b5cf6,transparent)' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', gap: 12 }}>

          {/* Left: back + avatar + name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
            <Link to="/chats">
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                style={{ padding: '8px', borderRadius: 10, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <ArrowLeft size={18} />
              </motion.button>
            </Link>

            {/* Avatar */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                boxShadow: '0 0 14px rgba(99,102,241,0.45)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 700, fontSize: 16, overflow: 'hidden',
              }}>
                {otherUser?.profileImage
                  ? <img src={otherUser.profileImage} alt={otherUser?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (otherUser?.name?.charAt(0).toUpperCase() || 'U')}
              </div>
              {/* Online dot */}
              <div style={{
                position: 'absolute', bottom: 1, right: 1,
                width: 11, height: 11, borderRadius: '50%',
                background: isOtherOnline ? '#34d399' : '#6b7280',
                border: '2px solid rgba(10,8,30,0.95)',
              }} />
            </div>

            {/* Name + status */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: 'white', fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {otherUser?.name || 'Unknown User'}
              </p>
              <p style={{ fontSize: 11, fontFamily: 'monospace', color: isOtherOnline ? '#34d399' : 'rgba(148,163,184,0.5)', marginTop: 1 }}>
                {isOtherOnline ? '● Online' : '○ Offline'}
              </p>
            </div>
          </div>

          {/* Right: call buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <Link to={`/video-call/${roomId}?audio=true`}>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.35)', color: '#a5b4fc', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                <Phone size={14} />
                <span>Call</span>
              </motion.button>
            </Link>
            <Link to={`/video-call/${roomId}`}>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, background: 'linear-gradient(135deg,#059669,#047857)', boxShadow: '0 2px 10px rgba(5,150,105,0.4)', color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                <Video size={14} />
                <span>Video</span>
              </motion.button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Messages area ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px', position: 'relative', zIndex: 5 }}>
        {messages.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
            <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity }}
              style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Send size={24} style={{ color: 'rgba(99,102,241,0.6)' }} />
            </motion.div>
            <p style={{ color: 'rgba(148,163,184,0.6)', fontSize: 13 }}>No messages yet. Start the conversation!</p>
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
                style={{ display: 'flex', alignItems: 'flex-end', gap: 8, justifyContent: isOwn ? 'flex-end' : 'flex-start', marginBottom: 6 }}>

                {/* Other user avatar */}
                {!isOwn && (
                  <div style={{ flexShrink: 0, width: 28, height: 28 }}>
                    {showAvatar ? (
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 11, overflow: 'hidden' }}>
                        {otherUser?.profileImage
                          ? <img src={otherUser.profileImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : otherUser?.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    ) : <div />}
                  </div>
                )}

                {/* Bubble */}
                <div style={{ maxWidth: '70%' }}>
                  {!isOwn && showAvatar && (
                    <p style={{ color: '#a5b4fc', fontSize: 11, fontWeight: 600, marginBottom: 3, marginLeft: 4 }}>
                      {otherUser?.name || 'Unknown'}
                    </p>
                  )}
                  <div style={isOwn ? {
                    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                    borderRadius: '18px 18px 4px 18px',
                    padding: '10px 14px',
                    boxShadow: '0 2px 12px rgba(99,102,241,0.35)',
                    opacity: msg.temp ? 0.7 : 1,
                  } : {
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(12px)',
                    borderRadius: '18px 18px 18px 4px',
                    padding: '10px 14px',
                  }}>
                    <p style={{ color: 'white', fontSize: 13, lineHeight: 1.5, wordBreak: 'break-word', margin: 0 }}>{msg.content}</p>
                    <p style={{ color: isOwn ? 'rgba(255,255,255,0.55)' : 'rgba(148,163,184,0.45)', fontSize: 10, marginTop: 4, textAlign: isOwn ? 'right' : 'left' }}>
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
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
                {otherUser?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '18px 18px 18px 4px', padding: '10px 16px' }}>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  {[0, 0.15, 0.3].map((delay, i) => (
                    <motion.div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#818cf8' }}
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
      <div style={{ position: 'relative', zIndex: 20, flexShrink: 0, background: 'rgba(10,8,30,0.95)', borderTop: '1px solid rgba(99,102,241,0.2)', backdropFilter: 'blur(20px)' }}>
        <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 16px' }}>
          <input
            type="text"
            placeholder="Type a message..."
            value={content}
            onChange={handleTypingChange}
            autoComplete="off"
            style={{
              flex: 1, padding: '10px 16px', fontSize: 13, color: 'white',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: 12, outline: 'none',
            }}
            onFocus={e => e.target.style.border = '1px solid rgba(99,102,241,0.5)'}
            onBlur={e => e.target.style.border = '1px solid rgba(99,102,241,0.2)'}
          />
          <motion.button type="submit" disabled={!content.trim()}
            whileHover={{ scale: content.trim() ? 1.08 : 1 }}
            whileTap={{ scale: content.trim() ? 0.92 : 1 }}
            style={{
              width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 12, color: 'white', border: 'none', cursor: content.trim() ? 'pointer' : 'default',
              background: content.trim() ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(99,102,241,0.2)',
              boxShadow: content.trim() ? '0 2px 12px rgba(99,102,241,0.4)' : 'none',
              opacity: content.trim() ? 1 : 0.4, flexShrink: 0,
            }}>
            <Send size={18} />
          </motion.button>
        </form>
      </div>
    </div>
  )
}
