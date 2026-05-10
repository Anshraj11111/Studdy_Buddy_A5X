import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import { roomAPI } from '../services/api'
import { joinRoom, sendMessage, onMessage, onTyping, sendTyping, leaveRoom, getSocket } from '../services/socket'
import { showMessageNotification, playNotificationSound, requestNotificationPermission } from '../utils/notifications'
import { Send, Video, ArrowLeft, Loader2 } from 'lucide-react'

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
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)

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
      } finally { setLoading(false) }
    }
    if (user) fetchRoomData()
  }, [roomId, user])

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return
    joinRoom(roomId, user._id)

    const handleMessage = (data) => {
      setMessages(prev => [...prev, data])
      const isOwn = String(data.senderId) === String(user._id) || String(data.senderId?._id) === String(user._id)
      if (!isOwn && !document.hasFocus()) {
        showMessageNotification(otherUser?.name || 'Someone', data.content)
        playNotificationSound()
      }
    }

    const handleTyping = (data) => {
      if (data.userId !== user._id) {
        setTypingUsers(prev => [...new Set([...prev, data.userId])])
        setTimeout(() => setTypingUsers(prev => prev.filter(id => id !== data.userId)), 3000)
      }
    }

    socket.on('messageReceived', handleMessage)
    socket.on('userTyping', handleTyping)
    socket.on('roomJoined', (data) => { if (data.messages?.length > 0) setMessages(data.messages) })

    return () => {
      socket.off('messageReceived', handleMessage)
      socket.off('userTyping', handleTyping)
      socket.off('roomJoined')
      leaveRoom(roomId)
    }
  }, [roomId, user._id, otherUser])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, backgroundImage: 'url(/src/assets/image.png)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
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
    <div className="flex flex-col" style={{ height: '100vh', position: 'relative' }}>
      {/* Background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, backgroundImage: 'url(/src/assets/image.png)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, background: 'rgba(5,3,20,0.88)' }} />

      {/* Chat Header */}
      <div className="relative flex-shrink-0" style={{ zIndex: 10, background: 'rgba(10,8,30,0.9)', borderBottom: '1px solid rgba(99,102,241,0.2)', backdropFilter: 'blur(20px)' }}>
        <div className="h-0.5" style={{ background: 'linear-gradient(90deg,transparent,#6366f1,#8b5cf6,transparent)' }} />
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Link to="/chats">
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                className="p-2 rounded-xl transition flex-shrink-0"
                style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc' }}>
                <ArrowLeft size={18} />
              </motion.button>
            </Link>

            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 0 14px rgba(99,102,241,0.4)' }}>
                  {otherUser?.profileImage
                    ? <img src={otherUser.profileImage} alt={otherUser.name} className="w-full h-full object-cover rounded-full" />
                    : otherUser?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2"
                  style={{ background: '#34d399', borderColor: 'rgba(10,8,30,0.9)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-white text-sm truncate">{otherUser?.name || 'Unknown User'}</h2>
                <p className="text-xs truncate" style={{ color: 'rgba(99,102,241,0.7)', fontFamily: 'monospace' }}>
                  {room?.topic ? `# ${room.topic}` : 'Online'}
                </p>
              </div>
            </div>
          </div>

          {/* Video Call Button - always visible */}
          <Link to={`/video-call/${roomId}`} className="flex-shrink-0">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-4 py-2 text-white text-sm font-semibold rounded-xl transition"
              style={{ background: 'linear-gradient(135deg,#059669,#047857)', boxShadow: '0 2px 10px rgba(5,150,105,0.4)' }}>
              <Video size={16} />
              <span>Video Call</span>
            </motion.button>
          </Link>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 space-y-2" style={{ position: 'relative', zIndex: 5 }}>
        {messages.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-full py-16 gap-3">
            <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity }}
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <Send size={24} style={{ color: 'rgba(99,102,241,0.6)' }} />
            </motion.div>
            <p className="text-sm" style={{ color: 'rgba(148,163,184,0.6)' }}>No messages yet. Start the conversation!</p>
          </motion.div>
        ) : (
          messages.map((msg, index) => {
            const isOwn = String(msg.senderId) === String(user._id) || String(msg.senderId?._id) === String(user._id)
            const showAvatar = index === 0 || messages[index - 1]?.senderId !== msg.senderId
            const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

            return (
              <motion.div key={msg._id || index}
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                {/* Other user avatar */}
                {!isOwn && (
                  <div className="flex-shrink-0 w-7 h-7">
                    {showAvatar ? (
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs"
                        style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                        {otherUser?.profileImage
                          ? <img src={otherUser.profileImage} alt="" className="w-full h-full object-cover rounded-full" />
                          : otherUser?.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    ) : <div />}
                  </div>
                )}

                {/* Bubble */}
                <div className={`max-w-[72%] sm:max-w-sm`}>
                  {!isOwn && showAvatar && (
                    <p className="text-xs font-semibold mb-1 ml-1" style={{ color: '#a5b4fc' }}>
                      {otherUser?.name || 'Unknown'}
                    </p>
                  )}
                  <div className="px-4 py-2.5 rounded-2xl"
                    style={isOwn ? {
                      background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                      borderRadius: '18px 18px 4px 18px',
                      boxShadow: '0 2px 12px rgba(99,102,241,0.35)',
                    } : {
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      backdropFilter: 'blur(12px)',
                      borderRadius: '18px 18px 18px 4px',
                    }}>
                    <p className="text-sm text-white break-words leading-relaxed">{msg.content}</p>
                    <p className="text-xs mt-1" style={{ color: isOwn ? 'rgba(255,255,255,0.6)' : 'rgba(148,163,184,0.5)' }}>
                      {time}
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
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
              className="flex items-end gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                {otherUser?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="px-4 py-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '18px 18px 18px 4px' }}>
                <div className="flex space-x-1 items-center">
                  {[0, 0.15, 0.3].map((delay, i) => (
                    <motion.div key={i} className="w-2 h-2 rounded-full"
                      style={{ background: '#818cf8' }}
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay }} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="relative flex-shrink-0" style={{ zIndex: 10, background: 'rgba(10,8,30,0.9)', borderTop: '1px solid rgba(99,102,241,0.2)', backdropFilter: 'blur(20px)' }}>
        <form onSubmit={handleSendMessage} className="flex gap-3 items-center px-4 py-3">
          <input
            type="text"
            placeholder="Type a message..."
            value={content}
            onChange={handleTypingChange}
            className="flex-1 px-4 py-3 text-sm text-white placeholder-gray-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(99,102,241,0.2)', backdropFilter: 'blur(12px)' }}
            autoComplete="off"
          />
          <motion.button type="submit" disabled={!content.trim()}
            whileHover={{ scale: content.trim() ? 1.08 : 1 }}
            whileTap={{ scale: content.trim() ? 0.92 : 1 }}
            className="w-11 h-11 flex items-center justify-center rounded-xl text-white transition flex-shrink-0 disabled:opacity-40"
            style={{ background: content.trim() ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(99,102,241,0.2)', boxShadow: content.trim() ? '0 2px 12px rgba(99,102,241,0.4)' : 'none' }}>
            <Send size={18} />
          </motion.button>
        </form>
      </div>
    </div>
  )
}
