import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import { broadcastAPI } from '../services/api'
import { getSocket } from '../services/socket'
import { Send, Trash2, Users, X, Smile, Info, Zap, Cpu, Radio, Leaf, ArrowLeft, Copy, Check, Save, RefreshCw } from 'lucide-react'
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
      fontSize: size * 0.4, fontWeight: 700, color: "var(--text-primary)",
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
        const joinResponse = await broadcastAPI.joinChannel({ channel, school, class: cls, code })
        
        // Verify the response channel matches what we requested
        if (joinResponse.data?.enrollment?.channel !== channel) {
          console.error('Channel mismatch - Requested:', channel, 'Got:', joinResponse.data?.enrollment?.channel)
          setError('Server returned wrong channel - please try again')
          return
        }
        
        onSuccess('joined', channel, { school: school.trim(), class: cls.trim() })
      }
    } catch (err) {
      console.error('Join/Request error:', err.response?.data || err.message)
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
          background: "var(--bg-card)", border: '1px solid rgba(99,102,241,0.3)',
          padding: 28, backdropFilter: 'blur(24px)',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 26 }}>{ch?.icon}</span>
            <div>
              <h3 style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 16, margin: 0 }}>
                {isRequest ? 'Request to join' : 'Join'} {ch?.name}
              </h3>
              <p style={{ color: 'rgba(148,163,184,0.55)', fontSize: 11, margin: 0 }}>
                {isRequest ? 'Admin will review your request' : 'Enter your details & access code'}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: "var(--text-secondary)", padding: 4 }}>
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
              <label style={{ color: "var(--text-secondary)", fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 5 }}>{label}</label>
              <input value={value} onChange={e => set(e.target.value)} placeholder={placeholder}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 10, boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.06)', border: "1px solid var(--border-primary)",
                  color: "var(--text-primary)", fontSize: 13, outline: 'none',
                }} />
            </div>
          ))}
          {error && <p style={{ color: '#f87171', fontSize: 12, margin: 0 }}>{error}</p>}
      <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
        disabled={loading}
        style={{
          padding: '12px', borderRadius: 12, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
          background: ch?.gradient, color: "var(--text-primary)", fontWeight: 700, fontSize: 14,
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
          <p style={{ color: "var(--text-primary)", fontSize: 13, lineHeight: 1.6, margin: 0, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{msg.content}</p>
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
                  color: "var(--text-primary)", cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
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
        style={{ width: '100%', maxWidth: 440, borderRadius: 20, background: "var(--bg-card)", border: '1px solid rgba(99,102,241,0.3)', padding: 28 }}>
        
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 32 }}>{current?.icon}</span>
            <span style={{ fontSize: 20, color: "var(--text-muted)" }}>→</span>
            <span style={{ fontSize: 32 }}>{target?.icon}</span>
          </div>
          
          <h3 style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 18, margin: '0 0 8px' }}>Request Channel Switch</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
            You are currently enrolled in <strong style={{ color: current?.color }}>{current?.name}</strong>.
          </p>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.6, margin: '8px 0 0' }}>
            Send a request to join <strong style={{ color: target?.color }}>{target?.name}</strong> for admin approval.
          </p>
        </div>

        {/* User details that will be sent */}
        <div style={{ 
          background: 'rgba(255,255,255,0.04)', 
          border: "1px solid var(--border-secondary)",
          borderRadius: 12, padding: 16, marginBottom: 20 
        }}>
          <p style={{ color: "var(--text-secondary)", fontSize: 11, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase' }}>
            Your details will be sent automatically:
          </p>
          <div style={{ display: 'grid', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: "var(--text-tertiary)", fontSize: 12 }}>Current Channel:</span>
              <span style={{ color: current?.color, fontSize: 12, fontWeight: 600 }}>{current?.name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: "var(--text-tertiary)", fontSize: 12 }}>Requested Channel:</span>
              <span style={{ color: target?.color, fontSize: 12, fontWeight: 600 }}>{target?.name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: "var(--text-tertiary)", fontSize: 12 }}>Admin Contact:</span>
              <span style={{ color: '#818cf8', fontSize: 12 }}>{ADMIN_EMAIL}</span>
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onClose}
            style={{ 
              flex: 1, padding: '12px', borderRadius: 12, 
              border: "1px solid var(--border-primary)", 
              background: 'rgba(255,255,255,0.05)', 
              color: "var(--text-secondary)", cursor: 'pointer', 
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
              color: "var(--text-primary)", cursor: 'pointer', fontWeight: 700, fontSize: 14,
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

  const [view, setView]               = useState('home')      // 'home' | 'chat' | 'admin'
  const [enrollments, setEnrollments] = useState([])          // ALL user enrollments (multiple channels)
  const [enrollment, setEnrollment]   = useState(null)        // current/primary enrollment (backward compatibility)
  const [currentChannel, setCurrentChannel] = useState(null) // currently selected channel for chat
  const [pendingReq, setPendingReq]   = useState(null)        // pending request
  const [messages, setMessages]       = useState([])
  const [input, setInput]             = useState('')
  const [loading, setLoading]         = useState(true)
  const [typingUsers, setTypingUsers] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [error, setError]             = useState('')
  const [currentUserId, setCurrentUserId] = useState(null)    // Track current user ID
  const [preventBackendOverride, setPreventBackendOverride] = useState(false) // Prevent backend from overriding temp data
  
  // Admin states
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [adminCodes, setAdminCodes] = useState({})
  const [newAdminCodes, setNewAdminCodes] = useState({})
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminSaving, setAdminSaving] = useState('')
  const [adminSuccess, setAdminSuccess] = useState('')
  const [enrollmentStats, setEnrollmentStats] = useState(null)
  const [showEnrollments, setShowEnrollments] = useState(false)
  const [copied, setCopied] = useState('')

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
      setEnrollments([])
      setEnrollment(null)
      setCurrentChannel(null)
      setPendingReq(null)
      setMessages([])
      setCurrentUserId(null)
      setLoading(false) // Don't show loading for no user
      return
    }
    
    // If user changed, force complete reset
    if (currentUserId && currentUserId !== user._id) {
      // Reset everything immediately
      setEnrollments([])
      setEnrollment(null)
      setCurrentChannel(null)
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
      
      // Validate that the response is for the current user
      if (r.data.userId && user?._id && r.data.userId !== user._id) {
        console.warn('Response user ID mismatch:', r.data.userId, 'vs current:', user._id)
        setEnrollments([])
        setEnrollment(null)
        setCurrentChannel(null)
        setPendingReq(null)
        return
      }
      
      const backendEnrollments = r.data.enrollments || []
      const backendEnrollment = r.data.enrollment
      const pendingReq = r.data.pendingRequest
      
      // If we're preventing override, skip this update
      if (preventBackendOverride && enrollments.length > 0) {
        return
      }
      
      // Update enrollments with validation
      if (backendEnrollments && Array.isArray(backendEnrollments)) {
        const validEnrollments = backendEnrollments.filter(e => 
          e.userId === user?._id || !e.userId // Allow if userId matches or is not set
        )
        setEnrollments(validEnrollments)
        
        // Set primary enrollment (for backward compatibility)
        if (validEnrollments.length > 0) {
          setEnrollment(validEnrollments[0])
        } else {
          setEnrollment(null)
        }
      } else if (backendEnrollment && backendEnrollment.userId === user?._id) {
        // Fallback to single enrollment
        setEnrollments([backendEnrollment])
        setEnrollment(backendEnrollment)
      } else {
        setEnrollments([])
        setEnrollment(null)
      }
      
      // Update pending request
      if (pendingReq && pendingReq.userId && pendingReq.userId !== user._id) {
        console.warn('Pending request user ID mismatch, ignoring')  
        setPendingReq(null)
      } else {
        setPendingReq(pendingReq)
      }
      
    } catch (err) {
      console.error('Failed to fetch status:', err)
    } finally {
      setLoading(false)
    }
  }

  // ── Load messages when entering chat view ────────────────────────────────
  useEffect(() => {
    if (view !== 'chat' || !currentChannel) return
    broadcastAPI.getMessages()
      .then(r => setMessages(r.data.messages || []))
      .catch(() => {})
  }, [view, currentChannel])

  // ── Scroll to bottom ──────────────────────────────────────────────────────
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // ── Socket setup ─────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket()
    if (!socket || !currentChannel) return

    socket.emit('joinBroadcastChannel', { channel: currentChannel })

    const onMsg = (msg) => setMessages(p => p.find(m => m._id === msg._id) ? p : [...p, msg])
    const onConfirmed = (c) => setMessages(p => p.map(m => m._id === c.tempId ? { ...c, temp: false } : m))
    const onFailed = ({ tempId }) => setMessages(p => p.filter(m => m._id !== tempId))
    const onTyping = ({ userId: uid, userName }) =>
      setTypingUsers(p => p.find(u => u.userId === uid) ? p : [...p, { userId: uid, userName }])
    const onStopTyping = ({ userId: uid }) => setTypingUsers(p => p.filter(u => u.userId !== uid))
    const onErr = ({ message: m }) => { 
      setError(m); setTimeout(() => setError(''), 3500) 
    }
    const onResolved = ({ status, channel }) => {
      if (status === 'accepted') {
        fetchStatus().then(() => setView('chat'))
      } else if (status === 'rejected') {
        // Clear pending request immediately for faster UI update
        setPendingReq(null)
        
        // Show rejection message
        const tempToast = document.createElement('div')
        tempToast.innerHTML = `❌ Your request to join ${CHANNELS.find(c => c.id === channel)?.name} was rejected. You can try again.`
        tempToast.style.cssText = `
          position: fixed; top: 80px; left: 50%; transform: translateX(-50%); z-index: 1000;
          background: linear-gradient(135deg,#ef4444,#dc2626); color: white; 
          padding: 12px 24px; border-radius: 12px; font-weight: 600; font-size: 14px;
          box-shadow: 0 4px 20px rgba(239,68,68,0.4); animation: slideDown 0.3s ease-out;
        `
        document.body.appendChild(tempToast)
        setTimeout(() => tempToast.remove(), 5000)
        
        // Refresh status in background  
        fetchStatus()
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
      socket.emit('leaveBroadcastChannel', { channel: currentChannel })
      socket.off('broadcastMessage',          onMsg)
      socket.off('broadcastMessageConfirmed', onConfirmed)
      socket.off('broadcastMessageFailed',    onFailed)
      socket.off('broadcastUserTyping',       onTyping)
      socket.off('broadcastUserStoppedTyping',onStopTyping)
      socket.off('broadcastError',            onErr)
      socket.off('broadcastRequestResolved',  onResolved)
    }
  }, [currentChannel])

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    if (!input.trim()) return
    const socket = getSocket()
    if (!socket || !currentChannel) return
    const tempId = `temp_${Date.now()}_${Math.random()}`
    setMessages(p => [...p, {
      _id: tempId, content: input.trim(),
      createdAt: new Date().toISOString(), temp: true,
      sender: { _id: user?._id, name: user?.name, profileImage: user?.profileImage, role: user?.role },
    }])
    socket.emit('sendBroadcastMessage', { channel: currentChannel, content: input.trim() })
    setInput('')
    if (inputRef.current) { inputRef.current.style.height = 'auto'; inputRef.current.focus() }
    isTyping.current = false
    socket.emit('broadcastStopTyping', { channel: currentChannel })
  }, [input, currentChannel, user])

  const handleInputChange = (e) => {
    setInput(e.target.value)
    if (!isMentor || !currentChannel) return
    const socket = getSocket(); if (!socket) return
    if (!isTyping.current) { isTyping.current = true; socket.emit('broadcastTyping', { channel: currentChannel }) }
    clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => { isTyping.current = false; socket.emit('broadcastStopTyping', { channel: currentChannel }) }, 2000)
  }

  const handleDelete = async (id) => {
    try { await broadcastAPI.deleteMessage(id); setMessages(p => p.filter(m => m._id !== id)) }
    catch (e) { setError(e?.response?.data?.message || 'Failed to delete') }
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }

  // ── Channel card click ────────────────────────────────────────────────────
  const handleChannelClick = (channelId) => {
    // Validate channelId exists in our CHANNELS array
    const targetChannel = CHANNELS.find(c => c.id === channelId)
    if (!targetChannel) {
      console.error('Invalid channel ID:', channelId)
      setError(`Invalid channel: ${channelId}`)
      return
    }
    
    // Check if user is already enrolled in this channel
    const isEnrolledInChannel = enrollments.some(e => e.channel === channelId && e.userId === user?._id)
    
    if (isEnrolledInChannel) {
      // Go directly to chat for this channel
      setCurrentChannel(channelId)
      setView('chat')
      return
    }
    
    // Check if user has any existing enrollment (enrolled in any channel)
    const hasAnyEnrollment = enrollments.length > 0
    
    if (hasAnyEnrollment) {
      // User is already enrolled in some channel, show simple request (no form)
      handleSimpleRequest(channelId)
    } else {
      // New user, show full join form
      setJoinTarget(channelId)
    }
  }

  const handleJoinSuccess = (type, channelId, formData = null) => {
    // Validate channelId exists in CHANNELS
    const targetChannel = CHANNELS.find(c => c.id === channelId)
    if (!targetChannel) {
      console.error('Invalid channel ID:', channelId)
      setError(`Invalid channel: ${channelId}`)
      return
    }
    
    setJoinTarget(null); setShowRequestForm(false); setAlreadyEnrolledTarget(null)
    if (type === 'joined') {
      // Create new enrollment object
      const newEnrollment = {
        channel: channelId,
        school: formData?.school || 'Loading...', 
        class: formData?.class || 'Loading...',
        joinedAt: new Date().toISOString(),
        userId: user?._id
      }
      
      // Add to enrollments array (multiple channels supported)
      setEnrollments(prev => [...prev, newEnrollment])
      
      // Set as primary enrollment if first one
      if (enrollments.length === 0) {
        setEnrollment(newEnrollment)
      }
      
      // Set current channel and go to chat
      setCurrentChannel(channelId)
      setView('chat')
      
      // Refresh enrollment data in background
      setTimeout(() => {
        fetchStatus().catch(err => {
          console.error('Failed to refresh status after join:', err)
        })
      }, 1000)
      
    } else {
      fetchStatus() // Refresh to get latest pending request
      setError('')
    }
  }

  // Simple request join for already enrolled users - Instant UI update
  const handleSimpleRequest = async (channelId) => {
    // Check if already enrolled in this channel
    const alreadyEnrolledInThisChannel = enrollments.some(e => e.channel === channelId)
    if (alreadyEnrolledInThisChannel) {
      const tempToast = document.createElement('div')
      tempToast.innerHTML = `⚠️ You're already enrolled in ${CHANNELS.find(c => c.id === channelId)?.name} channel!`
      tempToast.style.cssText = `
        position: fixed; top: 80px; left: 50%; transform: translateX(-50%); z-index: 1000;
        background: linear-gradient(135deg,#f59e0b,#d97706); color: white; 
        padding: 12px 24px; border-radius: 12px; font-weight: 600; font-size: 14px;
        box-shadow: 0 4px 20px rgba(245,158,11,0.4); animation: slideDown 0.3s ease-out;
      `
      document.body.appendChild(tempToast)
      setTimeout(() => tempToast.remove(), 3000)
      return
    }

    // Check if no existing enrollment
    if (enrollments.length === 0) {
      const tempToast = document.createElement('div')
      tempToast.innerHTML = `⚠️ Please join a channel first before requesting additional access!`
      tempToast.style.cssText = `
        position: fixed; top: 80px; left: 50%; transform: translateX(-50%); z-index: 1000;
        background: linear-gradient(135deg,#f59e0b,#d97706); color: white; 
        padding: 12px 24px; border-radius: 12px; font-weight: 600; font-size: 14px;
        box-shadow: 0 4px 20px rgba(245,158,11,0.4); animation: slideDown 0.3s ease-out;
      `
      document.body.appendChild(tempToast)
      setTimeout(() => tempToast.remove(), 3000)
      return
    }
    
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
      return
    }

    // Instantly update UI to show pending state
    const channelName = CHANNELS.find(c => c.id === channelId)?.name
    setPendingReq({ channel: channelId, status: 'pending', userId: user?._id })
    
    // Show instant success feedback
    const tempToast = document.createElement('div')
    tempToast.innerHTML = `✅ Request sent for ${channelName}! Admin will review your request.`
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

  // Leave channel function - Now needs to handle multiple enrollments
  const handleLeaveChannel = async (channelToLeave = null) => {
    const leaveChannelId = channelToLeave || currentChannel
    const channelName = CHANNELS.find(c => c.id === leaveChannelId)?.name
    
    if (!window.confirm(`⚠️ Leave ${channelName} Channel?\n\n• You will lose access to all messages and announcements\n• You'll need to re-enroll to join again\n\nAre you sure?`)) {
      return
    }

    try {
      // Call backend to leave the specific channel
      await broadcastAPI.leaveChannel({ channel: leaveChannelId })
      
      // Update local state immediately
      setEnrollments(prev => prev.filter(e => e.channel !== leaveChannelId))
      
      // If we're leaving the current channel, reset chat state
      if (currentChannel === leaveChannelId) {
        setCurrentChannel(null)
        setMessages([])
        setView('home')
      }
      
      // If this was the primary enrollment, set new primary
      if (enrollment?.channel === leaveChannelId) {
        const remainingEnrollments = enrollments.filter(e => e.channel !== leaveChannelId)
        setEnrollment(remainingEnrollments.length > 0 ? remainingEnrollments[0] : null)
      }
      
      // Show success message
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
      
    } catch (err) {
      console.error('Leave channel failed:', err)
      setError(err?.response?.data?.message || 'Failed to leave channel')
    }
  }

  // ── Admin Functions ──────────────────────────────────────────────────────────
  const loadAdminData = async () => {
    if (!isAdmin()) return
    
    setAdminLoading(true)
    try {
      // Load codes
      const codesResponse = await broadcastAPI.getCodes()
      const codesMap = {}
      codesResponse.data.codes.forEach(codeDoc => {
        codesMap[codeDoc.channel] = codeDoc.code
      })
      setAdminCodes(codesMap)
      setNewAdminCodes({ ...codesMap })

      // Load enrollment stats
      const statsResponse = await broadcastAPI.getAllEnrollments()
      setEnrollmentStats(statsResponse.data)
    } catch (err) {
      console.error('Failed to load admin data:', err)
      setError('Failed to load admin data')
    } finally {
      setAdminLoading(false)
    }
  }

  const updateAdminCode = async (channel) => {
    const code = newAdminCodes[channel]
    if (!code?.trim()) {
      setError('Code cannot be empty')
      return
    }

    setAdminSaving(channel)
    try {
      await broadcastAPI.updateCode({ channel, code: code.trim() })
      setAdminCodes(prev => ({ ...prev, [channel]: code.trim() }))
      setAdminSuccess(`${CHANNELS.find(c => c.id === channel)?.name} code updated!`)
      setTimeout(() => setAdminSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update code')
      setTimeout(() => setError(''), 3000)
    } finally {
      setAdminSaving('')
    }
  }

  const copyAdminCode = (channel) => {
    const code = adminCodes[channel] || newAdminCodes[channel]
    if (code) {
      navigator.clipboard.writeText(code)
      setCopied(channel)
      setTimeout(() => setCopied(''), 2000)
    }
  }

  const isAdmin = () => {
    return user?.email === ADMIN_EMAIL || user?.role === 'admin'
  }

  // Load admin data when admin panel is opened
  useEffect(() => {
    if (view === 'admin' && isAdmin()) {
      loadAdminData()
    }
  }, [view])

  const ch = currentChannel ? CHANNELS.find(c => c.id === currentChannel) : null

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
    <div className="flex min-h-screen" style={{ background: 'var(--bg-primary)' }}>
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
      <div style={{ position: 'relative', zIndex: 60 }}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="relative flex-1 lg:ml-[240px] mt-16" style={{ zIndex: 5, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', overflow: 'hidden', background: 'var(--bg-primary)' }}>

        {/* Error toast */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 100, background: '#ef4444', color: "var(--text-primary)", padding: '8px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', boxShadow: '0 4px 20px rgba(239,68,68,0.4)' }}>
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── HOME VIEW — 4 Channel Cards ──────────────────────────────────── */}
        {view === 'home' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>
            <div style={{ maxWidth: 860, margin: '0 auto' }}>
              {/* Header */}
              <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
                <h1 className="text-3xl font-bold text-theme-primary mb-2">Broadcast Channels</h1>
                <p className="text-theme-secondary text-sm">
                  Select your channel to receive announcements and resources from mentors
                </p>
                
                {/* Admin Toggle Button */}
                {isAdmin() && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setView('admin')}
                    className="mt-4 px-5 py-2.5 rounded-lg text-white font-semibold text-sm transition-all"
                    style={{ background: '#10b981' }}>
                    ⚙️ Admin Dashboard
                  </motion.button>
                )}
                
                {/* Current Enrollment Status - Show ALL enrollments */}
                {enrollments.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="mt-4 flex flex-wrap gap-2">
                    {enrollments.map((enroll) => {
                      const channelInfo = CHANNELS.find(c => c.id === enroll.channel)
                      return (
                        <div key={enroll.channel}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium"
                          style={{ 
                            background: '#e0e7ff', 
                            color: '#6366f1'
                          }}>
                          <span className="text-sm">{channelInfo?.icon}</span>
                          ✓ Enrolled in <strong>{channelInfo?.name}</strong>
                        </div>
                      )
                    })}
                  </motion.div>
                )}
                
                {/* Pending Request Status */}
                {pendingReq && pendingReq.channel && pendingReq.userId === user?._id && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-md text-xs font-medium"
                    style={{ background: '#fef3c7', color: '#d97706' }}>
                    ⏳ Request pending for <strong>{CHANNELS.find(c => c.id === pendingReq.channel)?.name}</strong> — waiting for admin approval
                  </motion.div>
                )}
                
                {/* New User Message */}
                {enrollments.length === 0 && (!pendingReq || pendingReq.userId !== user?._id) && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-md text-sm font-medium"
                    style={{ background: '#e0e7ff', color: '#6366f1' }}>
                    🚀 Choose a channel below to get started
                  </motion.div>
                )}
              </motion.div>

              {/* Quick Access to Enrolled Channels - Show ALL enrolled channels */}
              {enrollments.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }}
                  style={{ marginBottom: 24 }}>
                  <h3 style={{ color: "var(--text-primary)", fontSize: 18, fontWeight: 700, marginBottom: 12, textAlign: 'left' }}>
                    📺 Your Active Channels ({enrollments.length})
                  </h3>
                  <div style={{ display: 'grid', gap: 12 }}>
                    {enrollments.map((enroll) => {
                      const channelInfo = CHANNELS.find(c => c.id === enroll.channel)
                      return (
                        <motion.div 
                          key={enroll.channel}
                          whileHover={{ y: -2 }}
                          onClick={() => {
                            setCurrentChannel(enroll.channel)
                            setView('chat')
                          }}
                          style={{
                            background: `linear-gradient(135deg, ${channelInfo?.color}20, ${channelInfo?.color}10)`,
                            border: `2px solid ${channelInfo?.color}60`,
                            borderRadius: 16, padding: 16, cursor: 'pointer',
                            boxShadow: `0 8px 32px ${channelInfo?.color}30`,
                            position: 'relative', overflow: 'hidden'
                          }}>
                          
                          {/* Glow effect */}
                          <div style={{ 
                            position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                            background: channelInfo?.gradient 
                          }} />
                          
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ 
                                fontSize: 28, width: 48, height: 48, borderRadius: 12,
                                background: `${channelInfo?.color}25`,
                                border: `1px solid ${channelInfo?.color}50`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                              }}>
                                {channelInfo?.icon}
                              </div>
                              <div>
                                <h4 style={{ color: "var(--text-primary)", fontSize: 16, fontWeight: 700, margin: 0 }}>
                                  {channelInfo?.name}
                                </h4>
                                <p style={{ color: "var(--text-secondary)", fontSize: 11, margin: '2px 0 0' }}>
                                  {channelInfo?.desc}
                                </p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                  <span style={{ 
                                    fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 99, 
                                    background: `${channelInfo?.color}30`, 
                                    color: channelInfo?.color,
                                    border: `1px solid ${channelInfo?.color}50` 
                                  }}>
                                    ✓ ENROLLED
                                  </span>
                                  <span style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: 'monospace' }}>
                                    Since {enroll?.joinedAt ? new Date(enroll.joinedAt).toLocaleDateString() : 'N/A'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: 8 }}>
                              {/* Leave Button */}
                              <motion.button 
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleLeaveChannel(enroll.channel)
                                }}
                                style={{ 
                                  padding: '8px 12px', borderRadius: 8, 
                                  background: 'rgba(239,68,68,0.15)', 
                                  border: '1px solid rgba(239,68,68,0.3)', 
                                  color: '#f87171', cursor: 'pointer', fontWeight: 600, fontSize: 11,
                                  display: 'flex', alignItems: 'center', gap: 4
                                }}>
                                🚪 Leave
                              </motion.button>
                              
                              {/* Open Chat Button */}
                              <motion.div 
                                whileHover={{ scale: 1.05 }}
                                style={{ 
                                  padding: '8px 16px', borderRadius: 8, 
                                  background: channelInfo?.gradient,
                                  color: "var(--text-primary)", fontWeight: 700, fontSize: 12,
                                  display: 'flex', alignItems: 'center', gap: 6,
                                  cursor: 'pointer'
                                }}>
                                💬 Open Chat
                              </motion.div>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                </motion.div>
              )}

              {/* All Channels Overview */}
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ color: "var(--text-primary)", fontSize: 18, fontWeight: 700, marginBottom: 12, textAlign: 'left' }}>
                  🌐 All Broadcast Channels
                </h3>
              </div>

              {/* 4 Channel Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16 }}>
                {CHANNELS.map((ch, i) => {
                  const isEnrolled = enrollments.some(e => e.channel === ch.id && e.userId === user?._id)
                  const isPending  = pendingReq?.channel === ch.id && pendingReq?.userId === user?._id
                  const hasExistingEnrollment = enrollments.length > 0
                  
                  return (
                    <motion.div key={ch.id}
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08, type: 'spring', stiffness: 200 }}
                      whileHover={{ y: isPending ? -1 : -4, transition: { duration: 0.2 } }}
                      onClick={() => handleChannelClick(ch.id)}
                      style={{
                        borderRadius: 18, overflow: 'hidden', 
                        cursor: 'pointer',
                        background: "var(--bg-tertiary)", 
                        border: `1px solid ${isEnrolled ? ch.color + '60' : isPending ? '#fbbf24' + '40' : 'rgba(99,102,241,0.12)'}`,
                        backdropFilter: 'blur(20px)', position: 'relative',
                        boxShadow: isEnrolled ? `0 0 24px ${ch.color}30` : isPending ? '0 0 16px rgba(251,191,36,0.2)' : 'none',
                        opacity: isPending ? 0.7 : 1,
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
                              <h3 style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 16, margin: 0 }}>{ch.name}</h3>
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
                                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(148,163,184,0.1)', color: "var(--text-secondary)", border: '1px solid rgba(148,163,184,0.2)' }}>
                                    {hasExistingEnrollment ? 'Request Access' : 'Available'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <p style={{ color: 'rgba(148,163,184,0.65)', fontSize: 13, lineHeight: 1.6, margin: '0 0 14px' }}>{ch.desc}</p>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: 'monospace' }}>#{ch.id}</span>
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
                            {isEnrolled ? 'Open Chat →' : isPending ? 'Request Sent' : (hasExistingEnrollment ? 'Send Request →' : 'Join →')}
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
                            <span style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: 'monospace' }}>
                              Joined: {(() => {
                                const enrollment = enrollments.find(e => e.channel === ch.id)
                                return enrollment?.joinedAt ? new Date(enrollment.joinedAt).toLocaleDateString() : 'N/A'
                              })()}
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
                            <span style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: 'monospace' }}>
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
        {view === 'chat' && currentChannel && (
          <>
            {/* Chat header */}
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'rgba(8,6,24,0.9)', borderBottom: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(16px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={() => setView('home')} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: "var(--text-primary)", cursor: 'pointer', padding: '6px 8px', display: 'flex', alignItems: 'center' }}>
                  <ArrowLeft size={16} />
                </button>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: `${CHANNELS.find(c => c.id === currentChannel)?.color}18`, border: `1px solid ${CHANNELS.find(c => c.id === currentChannel)?.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{CHANNELS.find(c => c.id === currentChannel)?.icon}</div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 15 }}>{CHANNELS.find(c => c.id === currentChannel)?.name}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: `${CHANNELS.find(c => c.id === currentChannel)?.color}18`, color: CHANNELS.find(c => c.id === currentChannel)?.color, border: `1px solid ${CHANNELS.find(c => c.id === currentChannel)?.color}35` }}>BROADCAST</span>
                  </div>
                  <p style={{ color: "var(--text-tertiary)", fontSize: 11, margin: 0, fontFamily: 'monospace' }}>
                    Only mentors can send messages
                  </p>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: 8 }}>
                {/* Leave Button */}
                <motion.button 
                  whileHover={{ scale: 1.05 }} 
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleLeaveChannel(currentChannel)}
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
                    color: "var(--text-primary)", border: 'none',
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
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: "var(--text-muted)", fontSize: 13 }}>
                    No messages yet. {isMentor ? 'Be the first to post!' : 'Waiting for a mentor to post...'}
                  </div>
                )}
                {grouped.map(item =>
                  item.type === 'divider' ? (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0 8px' }}>
                      <div style={{ flex: 1, height: 1, background: `${CHANNELS.find(c => c.id === currentChannel)?.color}18` }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(148,163,184,0.45)', padding: '3px 12px', borderRadius: 99, background: `${CHANNELS.find(c => c.id === currentChannel)?.color}08`, border: `1px solid ${CHANNELS.find(c => c.id === currentChannel)?.color}18` }}>{item.label}</span>
                      <div style={{ flex: 1, height: 1, background: `${CHANNELS.find(c => c.id === currentChannel)?.color}18` }} />
                    </div>
                  ) : (
                    <MessageBubble key={item._id} msg={item}
                      isOwn={String(item.sender?._id) === String(user?._id)}
                      isMentor={isMentor} onDelete={handleDelete} channelColor={CHANNELS.find(c => c.id === currentChannel)?.color} />
                  )
                )}
                {typingUsers.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px' }}>
                    <div style={{ display: 'flex', gap: 3 }}>
                      {[0,1,2].map(i => (
                        <motion.div key={i} animate={{ y: [0, -4, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                          style={{ width: 6, height: 6, borderRadius: '50%', background: CHANNELS.find(c => c.id === currentChannel)?.color }} />
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
                      placeholder={`Send a message to ${CHANNELS.find(c => c.id === currentChannel)?.name}...`} rows={1}
                      style={{ width: '100%', resize: 'none', overflowY: 'auto', padding: '10px 44px 10px 14px', background: 'rgba(255,255,255,0.07)', border: `1px solid ${CHANNELS.find(c => c.id === currentChannel)?.color}30`, borderRadius: 14, color: "var(--text-primary)", fontSize: 13, outline: 'none', fontFamily: 'inherit', maxHeight: 120, boxSizing: 'border-box' }}
                      onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px' }} />
                  </div>
                  <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} onClick={handleSend} disabled={!input.trim()}
                    style={{ width: 44, height: 44, borderRadius: 12, border: 'none', cursor: 'pointer', flexShrink: 0, background: input.trim() ? CHANNELS.find(c => c.id === currentChannel)?.gradient : 'rgba(255,255,255,0.07)', color: input.trim() ? 'white' : 'rgba(148,163,184,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                    <Send size={18} />
                  </motion.button>
                </div>
              ) : (
                <div style={{ maxWidth: 780, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 16px', borderRadius: 12, background: `${CHANNELS.find(c => c.id === currentChannel)?.color}08`, border: `1px solid ${CHANNELS.find(c => c.id === currentChannel)?.color}18` }}>
                  <Info size={14} color={CHANNELS.find(c => c.id === currentChannel)?.color} />
                  <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>You can read messages. Only mentors can send in this channel.</span>
                </div>
              )}
            </div>
          </>
        )}

        {/* Fallback for invalid chat state */}
        {view === 'chat' && !currentChannel && (
          <>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px' }}>
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 18, margin: '0 0 8px' }}>No Channel Selected</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: '0 0 20px' }}>
                  Please select a channel from your enrolled channels.
                </p>
                <motion.button 
                  whileHover={{ scale: 1.05 }} 
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setView('home')}
                  style={{
                    padding: '12px 24px', borderRadius: 12, border: 'none',
                    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                    color: "var(--text-primary)", cursor: 'pointer', fontWeight: 600, fontSize: 14
                  }}
                >
                  📡 Browse Channels
                </motion.button>
              </div>
            </div>
          </>
        )}

        {/* ── ADMIN VIEW ─────────────────────────────────────────────────────── */}
        {view === 'admin' && isAdmin() && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
              {/* Admin Header */}
              <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28, textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,rgba(16,185,129,0.25),rgba(5,150,105,0.25))', border: '1px solid rgba(16,185,129,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    ⚙️
                  </div>
                </div>
                <h1 style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: 26, margin: '0 0 8px' }}>Admin Dashboard</h1>
                <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: 0 }}>
                  Manage broadcast channel access codes and enrollment statistics
                </p>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setView('home')}
                  style={{
                    marginTop: 16,
                    padding: '10px 20px',
                    borderRadius: 25,
                    border: 'none',
                    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                    color: "var(--text-primary)",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  ← Back to Channels
                </motion.button>
              </motion.div>

              {adminLoading && (
                <div style={{ textAlign: 'center', padding: '40px', color: "var(--text-secondary)" }}>
                  <div style={{ width: 32, height: 32, border: '3px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                  Loading admin data...
                </div>
              )}

              {!adminLoading && (
                <>
                  {/* Enrollment Statistics Dashboard */}
                  {enrollmentStats && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{ marginBottom: 32 }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                        <h2 style={{ color: "var(--text-primary)", fontSize: 22, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 40,
                            height: 40,
                            borderRadius: 12,
                            background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(5,150,105,0.2))',
                            border: '1px solid rgba(16,185,129,0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            📊
                          </div>
                          Channel Enrollment Statistics
                        </h2>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Total Enrollments</div>
                          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>{enrollmentStats.totalEnrollments}</div>
                        </div>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 20 }}>
                        {CHANNELS.map((channel) => {
                          const stats = enrollmentStats.channelStats[channel.id] || { count: 0, members: [] }
                          return (
                            <motion.div
                              key={channel.id}
                              whileHover={{ y: -2 }}
                              style={{
                                background: "var(--bg-tertiary)",
                                border: `1px solid ${channel.color}30`,
                                borderRadius: 16,
                                padding: 20,
                                backdropFilter: 'blur(20px)',
                                position: 'relative',
                                overflow: 'hidden'
                              }}
                            >
                              {/* Top gradient bar */}
                              <div 
                                style={{ 
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  height: 3,
                                  background: channel.gradient
                                }} 
                              />

                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                  <div 
                                    style={{
                                      width: 40,
                                      height: 40,
                                      borderRadius: 12,
                                      background: `${channel.color}18`,
                                      border: `1px solid ${channel.color}40`,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: 20
                                    }}
                                  >
                                    {channel.icon}
                                  </div>
                                  <div>
                                    <h4 style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 16, margin: 0 }}>{channel.name}</h4>
                                    <p style={{ color: "var(--text-secondary)", fontSize: 12, margin: 0 }}>{stats.count} students enrolled</p>
                                  </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div 
                                    style={{ 
                                      fontSize: 24, 
                                      fontWeight: 700,
                                      color: channel.color 
                                    }}
                                  >
                                    {stats.count}
                                  </div>
                                </div>
                              </div>

                              {stats.count > 0 && (
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
                                    <span style={{ color: "var(--text-secondary)" }}>Recent enrollments</span>
                                    {stats.count > 3 && (
                                      <button 
                                        onClick={() => setShowEnrollments(showEnrollments === channel.id ? null : channel.id)}
                                        style={{ 
                                          background: 'none',
                                          border: 'none',
                                          color: '#818cf8',
                                          cursor: 'pointer',
                                          fontSize: 12
                                        }}
                                      >
                                        {showEnrollments === channel.id ? 'Show less' : `View all ${stats.count}`}
                                      </button>
                                    )}
                                  </div>
                                  
                                  <div style={{ maxHeight: showEnrollments === channel.id ? 'none' : '100px', overflow: 'hidden' }}>
                                    {(showEnrollments === channel.id ? stats.members : stats.members.slice(0, 3)).map((member) => (
                                      <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 8, marginBottom: 4 }}>
                                        <div 
                                          style={{
                                            width: 24,
                                            height: 24,
                                            borderRadius: '50%',
                                            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: 10,
                                            fontWeight: 700,
                                            color: "var(--text-primary)"
                                          }}
                                        >
                                          {member.user?.profileImage ? (
                                            <img src={member.user.profileImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                          ) : (
                                            member.user?.name?.charAt(0)?.toUpperCase() || '?'
                                          )}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                          <div style={{ color: "var(--text-primary)", fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {member.user?.name || 'Unknown'}
                                          </div>
                                          <div style={{ color: "var(--text-secondary)", fontSize: 10 }}>
                                            {member.school} • {member.class}
                                          </div>
                                        </div>
                                        <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                                          {new Date(member.joinedAt).toLocaleDateString()}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {stats.count === 0 && (
                                <div style={{ textAlign: 'center', padding: '20px 0', color: "var(--text-tertiary)", fontSize: 12 }}>
                                  No students enrolled yet
                                </div>
                              )}
                            </motion.div>
                          )
                        })}
                      </div>
                    </motion.div>
                  )}

                  {/* Channel Access Codes Management */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                      <h2 style={{ color: "var(--text-primary)", fontSize: 22, fontWeight: 700, margin: 0 }}>Channel Access Codes</h2>
                      <button
                        onClick={loadAdminData}
                        style={{
                          padding: '10px 20px',
                          borderRadius: 12,
                          border: 'none',
                          background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                          color: "var(--text-primary)",
                          fontWeight: 600,
                          fontSize: 13,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8
                        }}
                      >
                        <RefreshCw size={14} />
                        Refresh Data
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
                      {CHANNELS.map((channel, index) => {
                        const currentCode = adminCodes[channel.id] || ''
                        const newCode = newAdminCodes[channel.id] || ''
                        const hasChanges = newCode !== currentCode
                        const isSaving = adminSaving === channel.id
                        const isCopied = copied === channel.id

                        return (
                          <motion.div
                            key={channel.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            style={{
                              background: "var(--bg-tertiary)",
                              border: `1px solid ${channel.color}30`,
                              borderRadius: 20,
                              padding: 24,
                              backdropFilter: 'blur(20px)',
                              position: 'relative',
                              overflow: 'hidden'
                            }}
                          >
                            {/* Top gradient bar */}
                            <div 
                              style={{ 
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                height: 4,
                                background: channel.gradient
                              }} 
                            />

                            {/* Channel Header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                              <div 
                                style={{
                                  width: 48,
                                  height: 48,
                                  borderRadius: 14,
                                  background: `${channel.color}18`,
                                  border: `1px solid ${channel.color}40`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 24
                                }}
                              >
                                {channel.icon}
                              </div>
                              <div>
                                <h3 style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 18, margin: 0 }}>{channel.name}</h3>
                                <p style={{ color: "var(--text-secondary)", fontSize: 12, margin: 0 }}>{channel.desc}</p>
                              </div>
                            </div>

                            {/* Current Code Display */}
                            {currentCode && (
                              <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', color: 'rgba(148,163,184,0.8)', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                                  Current Code
                                </label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div 
                                    style={{
                                      flex: 1,
                                      padding: '10px 12px',
                                      borderRadius: 10,
                                      background: 'rgba(255,255,255,0.06)',
                                      border: "1px solid var(--border-primary)",
                                      color: "var(--text-primary)",
                                      fontFamily: 'monospace',
                                      fontSize: 13
                                    }}
                                  >
                                    {currentCode}
                                  </div>
                                  <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => copyAdminCode(channel.id)}
                                    style={{
                                      padding: 8,
                                      borderRadius: 8,
                                      border: 'none',
                                      background: 'rgba(255,255,255,0.1)',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}
                                  >
                                    {isCopied ? (
                                      <Check size={16} color="#10b981" />
                                    ) : (
                                      <Copy size={16} color="#9ca3af" />
                                    )}
                                  </motion.button>
                                </div>
                              </div>
                            )}

                            {/* Code Input */}
                            <div style={{ marginBottom: 16 }}>
                              <label style={{ display: 'block', color: 'rgba(148,163,184,0.8)', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                                {currentCode ? 'New Code' : 'Set Code'}
                              </label>
                              <input
                                type="text"
                                value={newCode}
                                onChange={(e) => setNewAdminCodes(prev => ({ 
                                  ...prev, 
                                  [channel.id]: e.target.value 
                                }))}
                                placeholder={`Enter access code for ${channel.name}`}
                                style={{
                                  width: '100%',
                                  padding: '10px 12px',
                                  borderRadius: 10,
                                  background: 'rgba(255,255,255,0.06)',
                                  border: "1px solid var(--border-primary)",
                                  color: "var(--text-primary)",
                                  fontSize: 13,
                                  outline: 'none',
                                  boxSizing: 'border-box'
                                }}
                              />
                            </div>

                            {/* Update Button */}
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => updateAdminCode(channel.id)}
                              disabled={!hasChanges || !newCode.trim() || isSaving}
                              style={{
                                width: '100%',
                                padding: 12,
                                borderRadius: 12,
                                border: 'none',
                                background: hasChanges && newCode.trim() && !isSaving 
                                  ? channel.gradient 
                                  : 'rgba(75,85,99,0.5)',
                                color: "var(--text-primary)",
                                fontWeight: 700,
                                cursor: hasChanges && newCode.trim() && !isSaving ? 'pointer' : 'not-allowed',
                                opacity: hasChanges && newCode.trim() && !isSaving ? 1 : 0.6,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8
                              }}
                            >
                              {isSaving ? (
                                <>
                                  <RefreshCw size={16} className="animate-spin" />
                                  Updating...
                                </>
                              ) : (
                                <>
                                  <Save size={16} />
                                  {currentCode ? 'Update Code' : 'Set Code'}
                                </>
                              )}
                            </motion.button>

                            {/* Status indicator */}
                            <div style={{ marginTop: 12, textAlign: 'center' }}>
                              <span 
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '4px 12px',
                                  borderRadius: 20,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  background: currentCode ? `${channel.color}20` : 'rgba(107,114,128,0.2)',
                                  color: currentCode ? channel.color : '#9ca3af',
                                  border: `1px solid ${currentCode ? channel.color + '40' : '#374151'}`
                                }}
                              >
                                {currentCode ? '✅ Code Set' : '⚠️ No Code Set'}
                              </span>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  </motion.div>

                  {/* Instructions */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    style={{
                      marginTop: 40,
                      padding: 20,
                      borderRadius: 16,
                      background: 'rgba(10,8,30,0.6)',
                      border: "1px solid var(--border-primary)",
                      backdropFilter: 'blur(16px)'
                    }}
                  >
                    <h3 style={{ color: "var(--text-primary)", fontSize: 16, fontWeight: 700, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      ⚙️ How it works
                    </h3>
                    <ul style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.6, margin: 0, paddingLeft: 20 }}>
                      <li>Set unique access codes for each broadcast channel</li>
                      <li>Students must enter the correct code to join a channel</li>
                      <li>Codes can be updated anytime - existing members stay enrolled</li>
                      <li>Share codes with students through your institution</li>
                      <li>Only mentors can send messages in broadcast channels</li>
                    </ul>
                  </motion.div>
                </>
              )}
            </div>
          </div>
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
