import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import { broadcastAPI } from '../services/api'
import { getSocket } from '../services/socket'
import { Send, Trash2, Users, X, Smile, Info, Zap, Cpu, Radio, Leaf, ArrowLeft } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'

// ── Channel config ────────────────────────────────────────────────────────────
const CHANNELS = [
  {
    id: 'robotics',
    name: 'Robotics',
    desc: 'Automation, sensors, servo motors & robot building',
    icon: '🤖',
    color: '#6366f1',
    gradient: 'linear-gradient(135deg,#6366f1,#4f46e5)',
    LucideIcon: Cpu,
  },
  {
    id: 'aiml',
    name: 'AI & ML',
    desc: 'Machine learning, neural networks & data science',
    icon: '🧠',
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg,#8b5cf6,#7c3aed)',
    LucideIcon: Zap,
  },
  {
    id: 'electronics',
    name: 'Electronics',
    desc: 'Circuit design, IoT, microcontrollers & PCB',
    icon: '⚡',
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg,#3b82f6,#2563eb)',
    LucideIcon: Radio,
  },
  {
    id: 'renewable_energy',
    name: 'Renewable Energy',
    desc: 'Solar, wind, hydro & sustainable engineering',
    icon: '🌱',
    color: '#10b981',
    gradient: 'linear-gradient(135deg,#10b981,#059669)',
    LucideIcon: Leaf,
  },
]

const ADMIN_EMAIL = 'admin@studdybuddy.com'

const fmt = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
const fmtDate = (iso) => {
  const d = new Date(iso); const today = new Date()
  if (d.toDateString() === today.toDateString()) return 'Today'
  const y = new Date(today); y.setDate(today.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' })
}

function Avatar({ user, size = 36 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
      background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 700, color: 'white',
      border: '2px solid rgba(99,102,241,0.3)',
    }}>
      {user?.profileImage
        ? <img src={user.profileImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : (user?.name?.charAt(0)?.toUpperCase() || '?')}
    </div>
  )
}

// ── Join Form Modal ────────────────────────────────────────────────────────────
function JoinForm({ channel, onClose, onSuccess, isRequest = false }) {
  const [school, setSchool] = useState('')
  const [cls, setCls] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const ch = CHANNELS.find(c => c.id === channel)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!school.trim() || !cls.trim() || !code.trim()) {
      setError('All fields are required'); return
    }
    setLoading(true); setError('')
    try {
      if (isRequest) {
        await broadcastAPI.requestJoin({ channel, school, class: cls, code })
        onSuccess('request', channel)
      } else {
        // First call the API
        await broadcastAPI.joinChannel({ channel, school, class: cls, code })
        
        // Pass the form data along with success callback so parent can create temp enrollment
        onSuccess('joined', channel, { school: school.trim(), class: cls.trim() })
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed. Check your code.')
    } finally { setLoading(false) }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', padding: 20,
      }}>
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
        style={{
          width: '100%', maxWidth: 420, borderRadius: 20,
          background: 'rgba(10,8,30,0.97)', border: '1px solid rgba(99,102,241,0.3)',
          padding: 28, backdropFilter: 'blur(24px)',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 26 }}>{ch?.icon}</span>
            <div>
              <h3 style={{ color: 'white', fontWeight: 700, fontSize: 16, margin: 0 }}>
                {isRequest ? 'Request to join' : 'Join'} {ch?.name}
              </h3>
              <p style={{ color: 'rgba(148,163,184,0.55)', fontSize: 11, margin: 0 }}>
                {isRequest ? 'Admin will review your request' : 'Enter your details & access code'}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(148,163,184,0.6)', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { label: 'School / Institution Name', value: school, set: setSchool, placeholder: 'e.g. Delhi Public School' },
            { label: 'Class / Grade', value: cls, set: setCls, placeholder: 'e.g. Class 10 / Grade 11' },
            { label: ch?.name + ' Access Code', value: code, set: setCode, placeholder: 'Enter code provided by your institute' },
          ].map(({ label, value, set, placeholder }) => (
            <div key={label}>
              <label style={{ color: 'rgba(148,163,184,0.7)', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 5 }}>{label}</label>
              <input value={value} onChange={e => set(e.target.value)} placeholder={placeholder}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 10, boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(99,102,241,0.2)',
                  color: 'white', fontSize: 13, outline: 'none',
                }} />
            </div>
          ))}
          {error && <p style={{ color: '#f87171', fontSize: 12, margin: 0 }}>{error}</p>}
      <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
        disabled={loading}
        style={{
          padding: '12px', borderRadius: 12, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
          background: ch?.gradient, color: 'white', fontWeight: 700, fontSize: 14,
          opacity: loading ? 0.7 : 1, marginTop: 4,
        }}>
        {loading ? 'Submitting...' : isRequest ? 'Send Request' : 'Join Channel'}
      </motion.button>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ── Message Bubble ─────────────────────────────────────────────────────────────
function MessageBubble({ msg, isOwn, isMentor, onDelete, channelColor }) {
  const [hover, setHover] = useState(false)
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: 'flex', flexDirection: isOwn ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8, marginBottom: 6 }}>
      {!isOwn && <Avatar user={msg.sender} size={32} />}
      <div style={{ maxWidth: '72%' }}>
        {!isOwn && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, paddingLeft: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: msg.sender?.role === 'mentor' ? '#a5b4fc' : '#94a3b8' }}>
              {msg.sender?.name}
            </span>
            {msg.sender?.role === 'mentor' && (
              <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 5, background: `${channelColor}22`, color: channelColor, border: `1px solid ${channelColor}44` }}>MENTOR</span>
            )}
          </div>
        )}
        <div style={{
          position: 'relative', padding: '9px 13px',
          background: isOwn ? `linear-gradient(135deg,${channelColor},${channelColor}cc)` : 'rgba(255,255,255,0.07)',
          border: isOwn ? 'none' : `1px solid ${channelColor}22`,
          borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          opacity: msg.temp ? 0.7 : 1,
        }}>
          <p style={{ color: 'white', fontSize: 13, lineHeight: 1.6, margin: 0, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{msg.content}</p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 3 }}>
            <span style={{ fontSize: 10, color: isOwn ? 'rgba(255,255,255,0.5)' : 'rgba(148,163,184,0.4)' }}>
              {msg.temp ? '🕐' : fmt(msg.createdAt)}
            </span>
          </div>
          <AnimatePresence>
            {hover && (isOwn || isMentor) && !msg.temp && (
              <motion.button initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}
                onClick={() => onDelete(msg._id)}
                style={{
                  position: 'absolute', top: -10, right: isOwn ? 'auto' : -10, left: isOwn ? -10 : 'auto',
                  width: 22, height: 22, borderRadius: '50%', border: 'none', background: '#ef4444',
                  color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                <Trash2 size={10} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

// ── Already enrolled popup ─────────────────────────────────────────────────────
function AlreadyEnrolledPopup({ currentChannel, targetChannel, onClose, onRequest }) {
  const current = CHANNELS.find(c => c.id === currentChannel)
  const target  = CHANNELS.find(c => c.id === targetChannel)
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', padding: 20 }}>
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
        style={{ width: '100%', maxWidth: 440, borderRadius: 20, background: 'rgba(10,8,30,0.97)', border: '1px solid rgba(99,102,241,0.3)', padding: 28 }}>
        
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 32 }}>{current?.icon}</span>
            <span style={{ fontSize: 20, color: 'rgba(148,163,184,0.4)' }}>→</span>
            <span style={{ fontSize: 32 }}>{target?.icon}</span>
          </div>
          
          <h3 style={{ color: 'white', fontWeight: 700, fontSize: 18, margin: '0 0 8px' }}>Request Channel Switch</h3>
          <p style={{ color: 'rgba(148,163,184,0.7)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
            You are currently enrolled in <strong style={{ color: current?.color }}>{current?.name}</strong>.
          </p>
          <p style={{ color: 'rgba(148,163,184,0.7)', fontSize: 14, lineHeight: 1.6, margin: '8px 0 0' }}>
            Send a request to join <strong style={{ color: target?.color }}>{target?.name}</strong> for admin approval.
          </p>
        </div>

        {/* User details that will be sent */}
        <div style={{ 
          background: 'rgba(255,255,255,0.04)', 
          border: '1px solid rgba(99,102,241,0.15)',
          borderRadius: 12, padding: 16, marginBottom: 20 
        }}>
          <p style={{ color: 'rgba(148,163,184,0.6)', fontSize: 11, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase' }}>
            Your details will be sent automatically:
          </p>
          <div style={{ display: 'grid', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'rgba(148,163,184,0.5)', fontSize: 12 }}>Current Channel:</span>
              <span style={{ color: current?.color, fontSize: 12, fontWeight: 600 }}>{current?.name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'rgba(148,163,184,0.5)', fontSize: 12 }}>Requested Channel:</span>
              <span style={{ color: target?.color, fontSize: 12, fontWeight: 600 }}>{target?.name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'rgba(148,163,184,0.5)', fontSize: 12 }}>Admin Contact:</span>
              <span style={{ color: '#818cf8', fontSize: 12 }}>{ADMIN_EMAIL}</span>
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onClose}
            style={{ 
              flex: 1, padding: '12px', borderRadius: 12, 
              border: '1px solid rgba(99,102,241,0.2)', 
              background: 'rgba(255,255,255,0.05)', 
              color: 'rgba(148,163,184,0.7)', cursor: 'pointer', 
              fontWeight: 600, fontSize: 14 
            }}>
            Cancel
          </button>
          <motion.button 
            whileHover={{ scale: 1.02 }} 
            whileTap={{ scale: 0.98 }} 
            onClick={onRequest}
            style={{ 
              flex: 2, padding: '12px', borderRadius: 12, border: 'none', 
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', 
              color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}>
            📤 Send Request to Admin
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Broadcast() {
  const { user } = useAuthStore()
  const isMentor = user?.role === 'mentor'

  const [view, setView]               = useState('home')      // 'home' | 'chat'
  const [enrollment, setEnrollment]   = useState(null)        // current enrollment
  const [pendingReq, setPendingReq]   = useState(null)        // pending request
  const [messages, setMessages]       = useState([])
  const [input, setInput]             = useState('')
  const [loading, setLoading]         = useState(true)
  const [typingUsers, setTypingUsers] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [error, setError]             = useState('')
  const [currentUserId, setCurrentUserId] = useState(null)    // Track current user ID

  // modals
  const [joinTarget, setJoinTarget]     = useState(null)  // channel id for join form
  const [alreadyEnrolledTarget, setAlreadyEnrolledTarget] = useState(null) // channel id when already in another
  const [showRequestForm, setShowRequestForm] = useState(false)

  const bottomRef   = useRef(null)
  const inputRef    = useRef(null)
  const typingTimer = useRef(null)
  const isTyping    = useRef(false)

  // ── Fetch status on mount ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user?._id) {
      // Clear state when no user
      setEnrollment(null)
      setPendingReq(null)
      setMessages([])
      setCurrentUserId(null)
      setLoading(false) // Don't show loading for no user
      return
    }
    
    // If user changed, force complete reset
    if (currentUserId && currentUserId !== user._id) {
      console.log('User changed - force reset:', currentUserId, '→', user._id)
      // Reset everything immediately
      setEnrollment(null)
      setPendingReq(null) 
      setMessages([])
      setView('home')
      setError('')
      setTypingUsers([])
      setInput('')
      setJoinTarget(null)
      setAlreadyEnrolledTarget(null)
    }
    
    setCurrentUserId(user._id)
    setLoading(true) // Show loading only when actually fetching
    fetchStatus()
  }, [user?._id])

  // Remove the redundant user change effect since we handle it in the main useEffect now
  // useEffect(() => {
  //   if (currentUserId && user?._id && currentUserId !== user._id) {
  //     console.log('User changed from', currentUserId, 'to', user._id, '- resetting state');
  //     // Force complete state reset
  //     setEnrollment(null)
  //     setPendingReq(null)
  //     setMessages([])
  //     setView('home')
  //     setError('')
  //     setTypingUsers([])
  //     setInput('')
  //     setJoinTarget(null)
  //     setAlreadyEnrolledTarget(null)
  //   }
  // }, [user?._id, currentUserId])

  const fetchStatus = async () => {
    setLoading(true)
    try {
      const r = await broadcastAPI.getStatus()
      console.log('Fetched status for user:', user?._id, 'Response:', r.data)
      
      // Validate that the response is for the current user
      if (r.data.userId && user?._id && r.data.userId !== user._id) {
        console.warn('Response user ID mismatch:', r.data.userId, 'vs current:', user._id)
        // Clear state and return - don't use invalid data
        setEnrollment(null)
        setPendingReq(null)
        return
      }
      
      // Additional validation for enrollment and pending request user IDs
      const enrollment = r.data.enrollment
      const pendingReq = r.data.pendingRequest
      
      if (enrollment && enrollment.userId && enrollment.userId !== user._id) {
        console.warn('Enrollment user ID mismatch, ignoring')
        setEnrollment(null)
      } else {
        setEnrollment(enrollment)
      }
      
      if (pendingReq && pendingReq.userId && pendingReq.userId !== user._id) {
        console.warn('Pending request user ID mismatch, ignoring')  
        setPendingReq(null)
      } else {
        setPendingReq(pendingReq)
      }
      
    } catch (err) {
      console.error('Failed to fetch status:', err)
      // Clear state on error
      setEnrollment(null)
      setPendingReq(null)
    } finally {
      setLoading(false)
    }
  }

  // ── Load messages when entering chat view ────────────────────────────────
  useEffect(() => {
    if (view !== 'chat' || !enrollment) return
    broadcastAPI.getMessages()
      .then(r => setMessages(r.data.messages || []))
      .catch(() => {})
  }, [view, enrollment])

  // ── Scroll to bottom ──────────────────────────────────────────────────────
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // ── Socket setup ─────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket()
    if (!socket || !enrollment) return

    socket.emit('joinBroadcastChannel', { channel: enrollment.channel })

    const onMsg = (msg) => setMessages(p => p.find(m => m._id === msg._id) ? p : [...p, msg])
    const onConfirmed = (c) => setMessages(p => p.map(m => m._id === c.tempId ? { ...c, temp: false } : m))
    const onFailed = ({ tempId }) => setMessages(p => p.filter(m => m._id !== tempId))
    const onTyping = ({ userId: uid, userName }) =>
      setTypingUsers(p => p.find(u => u.userId === uid) ? p : [...p, { userId: uid, userName }])
    const onStopTyping = ({ userId: uid }) => setTypingUsers(p => p.filter(u => u.userId !== uid))
    const onErr = ({ message: m }) => { setError(m); setTimeout(() => setError(''), 3500) }
    const onResolved = ({ status, channel }) => {
      if (status === 'accepted') {
        fetchStatus().then(() => setView('chat'))
      } else {
        fetchStatus() // Refresh to clear pending request
        setError('Your request to join was rejected.')
        setTimeout(() => setError(''), 4000)
      }
    }

    socket.on('broadcastMessage',          onMsg)
    socket.on('broadcastMessageConfirmed', onConfirmed)
    socket.on('broadcastMessageFailed',    onFailed)
    socket.on('broadcastUserTyping',       onTyping)
    socket.on('broadcastUserStoppedTyping',onStopTyping)
    socket.on('broadcastError',            onErr)
    socket.on('broadcastRequestResolved',  onResolved)

    return () => {
      socket.emit('leaveBroadcastChannel', { channel: enrollment.channel })
      socket.off('broadcastMessage',          onMsg)
      socket.off('broadcastMessageConfirmed', onConfirmed)
      socket.off('broadcastMessageFailed',    onFailed)
      socket.off('broadcastUserTyping',       onTyping)
      socket.off('broadcastUserStoppedTyping',onStopTyping)
      socket.off('broadcastError',            onErr)
      socket.off('broadcastRequestResolved',  onResolved)
    }
  }, [enrollment])

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    if (!input.trim()) return
    const socket = getSocket()
    if (!socket || !enrollment) return
    const tempId = `temp_${Date.now()}_${Math.random()}`
    setMessages(p => [...p, {
      _id: tempId, content: input.trim(),
      createdAt: new Date().toISOString(), temp: true,
      sender: { _id: user?._id, name: user?.name, profileImage: user?.profileImage, role: user?.role },
    }])
    socket.emit('sendBroadcastMessage', { channel: enrollment.channel, content: input.trim() })
    setInput('')
    if (inputRef.current) { inputRef.current.style.height = 'auto'; inputRef.current.focus() }
    isTyping.current = false
    socket.emit('broadcastStopTyping', { channel: enrollment.channel })
  }, [input, enrollment, user])

  const handleInputChange = (e) => {
    setInput(e.target.value)
    if (!isMentor || !enrollment) return
    const socket = getSocket(); if (!socket) return
    if (!isTyping.current) { isTyping.current = true; socket.emit('broadcastTyping', { channel: enrollment.channel }) }
    clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => { isTyping.current = false; socket.emit('broadcastStopTyping', { channel: enrollment.channel }) }, 2000)
  }

  const handleDelete = async (id) => {
    try { await broadcastAPI.deleteMessage(id); setMessages(p => p.filter(m => m._id !== id)) }
    catch (e) { setError(e?.response?.data?.message || 'Failed to delete') }
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }

  // ── Channel card click ────────────────────────────────────────────────────
  const handleChannelClick = (channelId) => {
    // If user is enrolled in this channel, go directly to chat
    if (enrollment?.channel === channelId && enrollment?.userId === user?._id) {
      setView('chat')
      return
    }
    
    // If user is enrolled in another channel, show switch request popup
    if (enrollment && enrollment.userId === user?._id) {
      setAlreadyEnrolledTarget(channelId)
      return
    }
    
    // If user has no enrollment, show join form
    setJoinTarget(channelId)
  }

  const handleJoinSuccess = (type, channelId, formData = null) => {
    setJoinTarget(null); setShowRequestForm(false); setAlreadyEnrolledTarget(null)
    if (type === 'joined') {
      // Create proper enrollment object with actual form data
      const tempEnrollment = {
        channel: channelId,
        school: formData?.school || 'Loading...', 
        class: formData?.class || 'Loading...',
        joinedAt: new Date().toISOString(),
        userId: user?._id
      }
      
      // Instantly update UI state
      setEnrollment(tempEnrollment)
      setView('chat')
      
      console.log('Set temp enrollment:', tempEnrollment)
      
      // Refresh enrollment data in background to get real data from backend
      setTimeout(() => {
        fetchStatus().catch(err => {
          console.error('Failed to refresh status after join:', err)
        })
      }, 500) // Small delay to ensure backend has processed
      
    } else {
      fetchStatus() // Refresh to get latest pending request
      setError('')
    }
  }

  // Simple request join for already enrolled users - Instant UI update
  const handleSimpleRequest = async (channelId) => {
    // Prevent multiple requests for same channel
    if (pendingReq?.channel === channelId) {
      const tempToast = document.createElement('div')
      tempToast.innerHTML = `⚠️ Already have pending request for ${CHANNELS.find(c => c.id === channelId)?.name}`
      tempToast.style.cssText = `
        position: fixed; top: 80px; left: 50%; transform: translateX(-50%); z-index: 1000;
        background: linear-gradient(135deg,#f59e0b,#d97706); color: white; 
        padding: 12px 24px; border-radius: 12px; font-weight: 600; font-size: 14px;
        box-shadow: 0 4px 20px rgba(245,158,11,0.4); animation: slideDown 0.3s ease-out;
      `
      document.body.appendChild(tempToast)
      setTimeout(() => tempToast.remove(), 3000)
      setAlreadyEnrolledTarget(null)
      return
    }

    // Instantly update UI to show pending state
    const channelName = CHANNELS.find(c => c.id === channelId)?.name
    setPendingReq({ channel: channelId, status: 'pending', userId: user?._id })
    setAlreadyEnrolledTarget(null)
    
    // Show instant success feedback
    const tempToast = document.createElement('div')
    tempToast.innerHTML = `✅ Request sent for ${channelName}!`
    tempToast.style.cssText = `
      position: fixed; top: 80px; left: 50%; transform: translateX(-50%); z-index: 1000;
      background: linear-gradient(135deg,#10b981,#059669); color: white; 
      padding: 12px 24px; border-radius: 12px; font-weight: 600; font-size: 14px;
      box-shadow: 0 4px 20px rgba(16,185,129,0.4); animation: slideDown 0.3s ease-out;
    `
    document.body.appendChild(tempToast)
    setTimeout(() => tempToast.remove(), 3000)
    
    // Send request to backend in background
    broadcastAPI.requestJoin({ channel: channelId }).then(() => {
      // Refresh to get server confirmation
      fetchStatus()
    }).catch(err => {
      const errorMsg = err?.response?.data?.message || 'Failed to send request'
      console.error('Request failed:', errorMsg)
      
      // Revert UI state on error
      setPendingReq(null)
      
      // Show error message
      const errorToast = document.createElement('div')
      errorToast.innerHTML = `❌ ${errorMsg}`
      errorToast.style.cssText = `
        position: fixed; top: 80px; left: 50%; transform: translateX(-50%); z-index: 1000;
        background: linear-gradient(135deg,#ef4444,#dc2626); color: white; 
        padding: 12px 24px; border-radius: 12px; font-weight: 600; font-size: 14px;
        box-shadow: 0 4px 20px rgba(239,68,68,0.4); animation: slideDown 0.3s ease-out;
      `
      document.body.appendChild(errorToast)
      setTimeout(() => errorToast.remove(), 4000)
    })
  }

  // Leave channel function - Instant leave without refresh
  const handleLeaveChannel = async () => {
    const channelName = CHANNELS.find(c => c.id === enrollment?.channel)?.name
    
    if (!window.confirm(`⚠️ Leave ${channelName} Channel?\n\n• You will lose access to all messages and announcements\n• You'll need to fill out the complete registration form again to rejoin\n• Any pending requests will be cancelled\n\nAre you sure you want to leave?`)) {
      return
    }

    try {
      // Clear UI state IMMEDIATELY for instant feedback
      setEnrollment(null)
      setPendingReq(null) 
      setMessages([])
      setView('home')
      setError('')
      setTypingUsers([])
      setInput('')
      setJoinTarget(null)
      setAlreadyEnrolledTarget(null)
      
      // Show immediate success message
      const tempToast = document.createElement('div')
      tempToast.innerHTML = `✅ Successfully left ${channelName} channel!`
      tempToast.style.cssText = `
        position: fixed; top: 80px; left: 50%; transform: translateX(-50%); z-index: 1000;
        background: linear-gradient(135deg,#10b981,#059669); color: white; 
        padding: 12px 24px; border-radius: 12px; font-weight: 600; font-size: 14px;
        box-shadow: 0 4px 20px rgba(16,185,129,0.4); animation: slideDown 0.3s ease-out;
      `
      document.body.appendChild(tempToast)
      setTimeout(() => tempToast.remove(), 3000)
      
      // Backend call in background - don't wait for it
      broadcastAPI.leaveChannel().catch(err => {
        console.error('Leave channel failed:', err)
        // If backend fails, show error but don't revert UI since user expects to be left
        const errorToast = document.createElement('div')
        errorToast.innerHTML = `⚠️ Left channel but sync failed - please refresh if needed`
        errorToast.style.cssText = `
          position: fixed; top: 130px; left: 50%; transform: translateX(-50%); z-index: 1000;
          background: linear-gradient(135deg,#f59e0b,#d97706); color: white; 
          padding: 10px 20px; border-radius: 10px; font-weight: 600; font-size: 12px;
          box-shadow: 0 4px 16px rgba(245,158,11,0.4); animation: slideDown 0.3s ease-out;
        `
        document.body.appendChild(errorToast)
        setTimeout(() => errorToast.remove(), 5000)
      })
      
    } catch (err) {
      // This catch won't run since we're not awaiting the API call
      console.error('Unexpected error:', err)
    }
  }

  const ch = CHANNELS.find(c => c.id === enrollment?.channel)
  console.log('Current ch value:', ch, 'enrollment.channel:', enrollment?.channel)

  // ── Group messages by date ────────────────────────────────────────────────
  const grouped = []
  let lastDate = null
  for (const m of messages) {
    const d = fmtDate(m.createdAt)
    if (d !== lastDate) { grouped.push({ type: 'divider', id: `d-${m._id || Math.random()}`, label: d }); lastDate = d }
    grouped.push({ type: 'msg', ...m })
  }

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#05030f' }}>
        <div style={{ width: 40, height: 40, border: '4px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen" style={{ position: 'relative' }}>
      {/* Add CSS for animations */}
      <style>
        {`
          @keyframes slideDown {
            0% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
            100% { opacity: 1; transform: translateX(-50%) translateY(0); }
          }
        `}
      </style>
      
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, backgroundImage: 'url(/image.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, background: 'rgba(5,3,20,0.87)' }} />
      <div style={{ position: 'relative', zIndex: 60 }}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="relative flex-1 lg:ml-[240px] mt-16" style={{ zIndex: 5, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>

        {/* Error toast */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 100, background: '#ef4444', color: 'white', padding: '8px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', boxShadow: '0 4px 20px rgba(239,68,68,0.4)' }}>
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── HOME VIEW — 4 Channel Cards ──────────────────────────────────── */}
        {view === 'home' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>
            <div style={{ maxWidth: 860, margin: '0 auto' }}>
              {/* Header */}
              <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28, textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,rgba(99,102,241,0.25),rgba(139,92,246,0.25))', border: '1px solid rgba(99,102,241,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Radio size={22} color="#818cf8" />
                  </div>
                </div>
                <h1 style={{ color: 'white', fontWeight: 800, fontSize: 26, margin: '0 0 8px' }}>Broadcast Channels</h1>
                <p style={{ color: 'rgba(148,163,184,0.6)', fontSize: 14, margin: 0 }}>
                  Select your channel to receive announcements and resources from mentors
                </p>
                
                {/* Current Enrollment Status - Only show if user has enrollment AND user IDs match */}
                {enrollment && enrollment.channel && enrollment.userId === user?._id && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    style={{ 
                      display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 14, 
                      padding: '10px 20px', borderRadius: 50, 
                      background: `${CHANNELS.find(c => c.id === enrollment.channel)?.color}15`, 
                      border: `1px solid ${CHANNELS.find(c => c.id === enrollment.channel)?.color}40`, 
                      color: CHANNELS.find(c => c.id === enrollment.channel)?.color, 
                      fontSize: 13, fontWeight: 600 
                    }}>
                    <span style={{ fontSize: 16 }}>{CHANNELS.find(c => c.id === enrollment.channel)?.icon}</span>
                    ✓ Enrolled in <strong>{CHANNELS.find(c => c.id === enrollment.channel)?.name}</strong>
                  </motion.div>
                )}
                
                {/* Pending Request Status - Only show if user has pending request AND user IDs match */}
                {pendingReq && pendingReq.channel && pendingReq.userId === user?._id && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 14, padding: '8px 18px', borderRadius: 50, background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24', fontSize: 12, fontWeight: 600 }}>
                    ⏳ Request pending for <strong>{CHANNELS.find(c => c.id === pendingReq.channel)?.name}</strong> — waiting for admin approval
                  </motion.div>
                )}
                
                {/* New User Message - Show only if no enrollment and no pending request */}
                {(!enrollment || enrollment.userId !== user?._id) && (!pendingReq || pendingReq.userId !== user?._id) && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    style={{ 
                      display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 14, 
                      padding: '10px 20px', borderRadius: 50, 
                      background: 'rgba(99,102,241,0.12)', 
                      border: '1px solid rgba(99,102,241,0.3)', 
                      color: '#818cf8', 
                      fontSize: 13, fontWeight: 600 
                    }}>
                    🚀 Choose a channel below to get started
                  </motion.div>
                )}
              </motion.div>

              {/* Quick Access to Enrolled Channel - Only show if user has enrollment AND user IDs match */}
              {enrollment && enrollment.channel && enrollment.userId === user?._id && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }}
                  style={{ marginBottom: 24 }}>
                  <h3 style={{ color: 'white', fontSize: 18, fontWeight: 700, marginBottom: 12, textAlign: 'left' }}>
                    📺 Your Active Channel
                  </h3>
                  <motion.div 
                    whileHover={{ y: -2 }}
                    onClick={() => setView('chat')}
                    style={{
                      background: `linear-gradient(135deg, ${CHANNELS.find(c => c.id === enrollment.channel)?.color}20, ${CHANNELS.find(c => c.id === enrollment.channel)?.color}10)`,
                      border: `2px solid ${CHANNELS.find(c => c.id === enrollment.channel)?.color}60`,
                      borderRadius: 18, padding: 20, cursor: 'pointer',
                      boxShadow: `0 8px 32px ${CHANNELS.find(c => c.id === enrollment.channel)?.color}30`,
                      position: 'relative', overflow: 'hidden'
                    }}>
                    
                    {/* Glow effect */}
                    <div style={{ 
                      position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                      background: CHANNELS.find(c => c.id === enrollment.channel)?.gradient 
                    }} />
                    
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ 
                          fontSize: 36, width: 60, height: 60, borderRadius: 16,
                          background: `${CHANNELS.find(c => c.id === enrollment.channel)?.color}25`,
                          border: `1px solid ${CHANNELS.find(c => c.id === enrollment.channel)?.color}50`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          {CHANNELS.find(c => c.id === enrollment.channel)?.icon}
                        </div>
                        <div>
                          <h4 style={{ color: 'white', fontSize: 20, fontWeight: 700, margin: 0 }}>
                            {CHANNELS.find(c => c.id === enrollment.channel)?.name}
                          </h4>
                          <p style={{ color: 'rgba(148,163,184,0.7)', fontSize: 13, margin: '2px 0 0' }}>
                            {CHANNELS.find(c => c.id === enrollment.channel)?.desc}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                            <span style={{ 
                              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, 
                              background: `${CHANNELS.find(c => c.id === enrollment.channel)?.color}30`, 
                              color: CHANNELS.find(c => c.id === enrollment.channel)?.color,
                              border: `1px solid ${CHANNELS.find(c => c.id === enrollment.channel)?.color}50` 
                            }}>
                              ✓ ENROLLED
                            </span>
                            <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.4)', fontFamily: 'monospace' }}>
                              Since {enrollment?.joinedAt ? new Date(enrollment.joinedAt).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: 10 }}>
                        {/* Leave Button */}
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleLeaveChannel}
                          style={{ 
                            padding: '10px 20px', borderRadius: 12, 
                            background: 'rgba(239,68,68,0.15)', 
                            border: '1px solid rgba(239,68,68,0.3)', 
                            color: '#f87171', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                            display: 'flex', alignItems: 'center', gap: 6
                          }}>
                          🚪 Leave Channel
                        </motion.button>
                        
                        {/* Open Chat Button */}
                        <motion.div 
                          whileHover={{ scale: 1.05 }}
                          style={{ 
                            padding: '12px 24px', borderRadius: 12, 
                            background: CHANNELS.find(c => c.id === enrollment.channel)?.gradient,
                            color: 'white', fontWeight: 700, fontSize: 14,
                            display: 'flex', alignItems: 'center', gap: 8,
                            cursor: 'pointer'
                          }}
                          onClick={() => setView('chat')}>
                          💬 Open Chat
                        </motion.div>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {/* All Channels Overview */}
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ color: 'white', fontSize: 18, fontWeight: 700, marginBottom: 12, textAlign: 'left' }}>
                  🌐 All Broadcast Channels
                </h3>
              </div>

              {/* 4 Channel Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16 }}>
                {CHANNELS.map((ch, i) => {
                  const isEnrolled = enrollment?.channel === ch.id && enrollment?.userId === user?._id
                  const isPending  = pendingReq?.channel === ch.id && pendingReq?.userId === user?._id
                  const isDisabled = isPending || isEnrolled
                  
                  return (
                    <motion.div key={ch.id}
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08, type: 'spring', stiffness: 200 }}
                      whileHover={{ y: isEnrolled ? -2 : isDisabled ? 0 : -4, transition: { duration: 0.2 } }}
                      onClick={() => handleChannelClick(ch.id)}
                      style={{
                        borderRadius: 18, overflow: 'hidden', 
                        cursor: 'pointer', // Always clickable
                        background: 'rgba(10,8,30,0.8)', 
                        border: `1px solid ${isEnrolled ? ch.color + '60' : isPending ? '#fbbf24' + '40' : 'rgba(99,102,241,0.12)'}`,
                        backdropFilter: 'blur(20px)', position: 'relative',
                        boxShadow: isEnrolled ? `0 0 24px ${ch.color}30` : isPending ? '0 0 16px rgba(251,191,36,0.2)' : 'none',
                        opacity: isPending ? 0.7 : 1, // Only dim pending, not enrolled
                      }}>
                      {/* Top gradient bar */}
                      <div style={{ height: 4, background: isEnrolled ? ch.gradient : isPending ? 'linear-gradient(90deg, #fbbf24, #f59e0b)' : ch.gradient, opacity: isEnrolled || isPending ? 1 : 0.3 }} />
                      <div style={{ padding: '20px 22px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 50, height: 50, borderRadius: 14, background: `${ch.color}18`, border: `1px solid ${ch.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                              {ch.icon}
                            </div>
                            <div>
                              <h3 style={{ color: 'white', fontWeight: 700, fontSize: 16, margin: 0 }}>{ch.name}</h3>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                {isEnrolled && (
                                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: `${ch.color}22`, color: ch.color, border: `1px solid ${ch.color}44` }}>
                                    ✓ Enrolled
                                  </span>
                                )}
                                {isPending && (
                                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>
                                    ⏳ Pending
                                  </span>
                                )}
                                {!isEnrolled && !isPending && (
                                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(148,163,184,0.1)', color: 'rgba(148,163,184,0.6)', border: '1px solid rgba(148,163,184,0.2)' }}>
                                    Available
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <p style={{ color: 'rgba(148,163,184,0.65)', fontSize: 13, lineHeight: 1.6, margin: '0 0 14px' }}>{ch.desc}</p>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 11, color: 'rgba(148,163,184,0.4)', fontFamily: 'monospace' }}>#{ch.id}</span>
                          <motion.div 
                            whileHover={{ scale: 1.05 }}
                            style={{ 
                              padding: '7px 16px', borderRadius: 50, 
                              background: isEnrolled ? ch.gradient : isPending ? 'rgba(251,191,36,0.15)' : 'rgba(99,102,241,0.15)', 
                              border: isEnrolled ? 'none' : isPending ? '1px solid rgba(251,191,36,0.3)' : '1px solid rgba(99,102,241,0.3)', 
                              color: isEnrolled ? 'white' : isPending ? '#fbbf24' : '#a5b4fc', 
                              fontSize: 12, fontWeight: 700, 
                              cursor: 'pointer',
                            }}>
                            {isEnrolled ? 'Open Chat →' : isPending ? 'Request Sent' : 'Join →'}
                          </motion.div>
                        </div>
                        
                        {/* Status info for different states */}
                        {isEnrolled && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }} 
                            animate={{ opacity: 1, height: 'auto' }}
                            style={{ 
                              marginTop: 12, padding: '8px 12px', borderRadius: 8, 
                              background: `${ch.color}08`, border: `1px solid ${ch.color}20`,
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                            }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 10, color: ch.color }}>✓ You are enrolled</span>
                            </div>
                            <span style={{ fontSize: 9, color: 'rgba(148,163,184,0.4)', fontFamily: 'monospace' }}>
                              Joined: {enrollment?.joinedAt && enrollment?.userId === user?._id ? new Date(enrollment.joinedAt).toLocaleDateString() : 'N/A'}
                            </span>
                          </motion.div>
                        )}
                        
                        {isPending && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }} 
                            animate={{ opacity: 1, height: 'auto' }}
                            style={{ 
                              marginTop: 12, padding: '8px 12px', borderRadius: 8, 
                              background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)',
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                            }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 10, color: '#fbbf24' }}>⏳ Request pending approval</span>
                            </div>
                            <span style={{ fontSize: 9, color: 'rgba(148,163,184,0.4)', fontFamily: 'monospace' }}>
                              Admin review required
                            </span>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── CHAT VIEW ─────────────────────────────────────────────────────── */}
        {view === 'chat' && enrollment && enrollment.userId === user?._id && ch && (
          <>
            {console.log('Rendering chat view with enrollment:', enrollment, 'and ch:', ch)}
            {/* Chat header */}
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'rgba(8,6,24,0.9)', borderBottom: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(16px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={() => setView('home')} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', cursor: 'pointer', padding: '6px 8px', display: 'flex', alignItems: 'center' }}>
                  <ArrowLeft size={16} />
                </button>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: `${ch.color}18`, border: `1px solid ${ch.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{ch.icon}</div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>{ch.name}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: `${ch.color}18`, color: ch.color, border: `1px solid ${ch.color}35` }}>BROADCAST</span>
                  </div>
                  <p style={{ color: 'rgba(148,163,184,0.5)', fontSize: 11, margin: 0, fontFamily: 'monospace' }}>
                    Only mentors can send messages
                  </p>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: 8 }}>
                {/* Leave Button */}
                <motion.button 
                  whileHover={{ scale: 1.05 }} 
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLeaveChannel}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 16px', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    background: 'rgba(239,68,68,0.15)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    color: '#f87171',
                  }}
                >
                  🚪 Leave
                </motion.button>
                
                {/* Dashboard Button */}
                <motion.button 
                  whileHover={{ scale: 1.05 }} 
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setView('home')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 16px', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                    color: 'white', border: 'none',
                    boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
                  }}
                >
                  📊 Dashboard
                </motion.button>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
              <div style={{ padding: '8px 12px', maxWidth: 780, margin: '0 auto' }}>
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(148,163,184,0.4)', fontSize: 13 }}>
                    No messages yet. {isMentor ? 'Be the first to post!' : 'Waiting for a mentor to post...'}
                  </div>
                )}
                {grouped.map(item =>
                  item.type === 'divider' ? (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0 8px' }}>
                      <div style={{ flex: 1, height: 1, background: `${ch.color}18` }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(148,163,184,0.45)', padding: '3px 12px', borderRadius: 99, background: `${ch.color}08`, border: `1px solid ${ch.color}18` }}>{item.label}</span>
                      <div style={{ flex: 1, height: 1, background: `${ch.color}18` }} />
                    </div>
                  ) : (
                    <MessageBubble key={item._id} msg={item}
                      isOwn={String(item.sender?._id) === String(user?._id)}
                      isMentor={isMentor} onDelete={handleDelete} channelColor={ch.color} />
                  )
                )}
                {typingUsers.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px' }}>
                    <div style={{ display: 'flex', gap: 3 }}>
                      {[0,1,2].map(i => (
                        <motion.div key={i} animate={{ y: [0, -4, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                          style={{ width: 6, height: 6, borderRadius: '50%', background: ch.color }} />
                      ))}
                    </div>
                    <span style={{ fontSize: 11, color: 'rgba(148,163,184,0.55)', fontStyle: 'italic' }}>{typingUsers.map(u => u.userName).join(', ')} typing...</span>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </div>

            {/* Input bar */}
            <div style={{ flexShrink: 0, padding: '10px 12px', background: 'rgba(8,6,24,0.9)', borderTop: '1px solid rgba(99,102,241,0.1)', backdropFilter: 'blur(16px)' }}>
              {isMentor ? (
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', maxWidth: 780, margin: '0 auto' }}>
                  <Avatar user={user} size={36} />
                  <div style={{ flex: 1, position: 'relative' }}>
                    <textarea ref={inputRef} value={input} onChange={handleInputChange} onKeyDown={handleKeyDown}
                      placeholder={`Send a message to ${ch.name}...`} rows={1}
                      style={{ width: '100%', resize: 'none', overflowY: 'auto', padding: '10px 44px 10px 14px', background: 'rgba(255,255,255,0.07)', border: `1px solid ${ch.color}30`, borderRadius: 14, color: 'white', fontSize: 13, outline: 'none', fontFamily: 'inherit', maxHeight: 120, boxSizing: 'border-box' }}
                      onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px' }} />
                  </div>
                  <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} onClick={handleSend} disabled={!input.trim()}
                    style={{ width: 44, height: 44, borderRadius: 12, border: 'none', cursor: 'pointer', flexShrink: 0, background: input.trim() ? ch.gradient : 'rgba(255,255,255,0.07)', color: input.trim() ? 'white' : 'rgba(148,163,184,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                    <Send size={18} />
                  </motion.button>
                </div>
              ) : (
                <div style={{ maxWidth: 780, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 16px', borderRadius: 12, background: `${ch.color}08`, border: `1px solid ${ch.color}18` }}>
                  <Info size={14} color={ch.color} />
                  <span style={{ color: 'rgba(148,163,184,0.6)', fontSize: 12 }}>You can read messages. Only mentors can send in this channel.</span>
                </div>
              )}
            </div>
          </>
        )}

        {/* Fallback for invalid chat state */}
        {view === 'chat' && (!enrollment || enrollment.userId !== user?._id || !ch) && (
          <>
            {console.log('Showing fallback - view:', view, 'enrollment:', enrollment, 'user._id:', user?._id, 'ch:', ch)}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px' }}>
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ color: 'white', fontWeight: 700, fontSize: 18, margin: '0 0 8px' }}>No Channel Access</h3>
                <p style={{ color: 'rgba(148,163,184,0.6)', fontSize: 14, margin: '0 0 20px' }}>
                  You're not enrolled in any broadcast channel.
                </p>
                <motion.button 
                  whileHover={{ scale: 1.05 }} 
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setView('home')}
                  style={{
                    padding: '12px 24px', borderRadius: 12, border: 'none',
                    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                    color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 14
                  }}
                >
                  📡 Browse Channels
                </motion.button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {joinTarget && (
          <JoinForm 
            channel={joinTarget} 
            onClose={() => setJoinTarget(null)} 
            onSuccess={handleJoinSuccess} 
          />
        )}
        {alreadyEnrolledTarget && (
          <AlreadyEnrolledPopup
            currentChannel={enrollment?.channel} targetChannel={alreadyEnrolledTarget}
            onClose={() => setAlreadyEnrolledTarget(null)}
            onRequest={() => handleSimpleRequest(alreadyEnrolledTarget)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
