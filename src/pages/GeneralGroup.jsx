import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import { generalGroupAPI } from '../services/api'
import { getSocket } from '../services/socket'
import {
  Users, Send, LogIn, LogOut, Trash2, X,
  Crown, GraduationCap, Info, Smile,
} from 'lucide-react'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt = (iso) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

const fmtDate = (iso) => {
  const d = new Date(iso)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return 'Today'
  const yest = new Date(today); yest.setDate(today.getDate() - 1)
  if (d.toDateString() === yest.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })
}

const groupByDate = (msgs) => {
  const out = []; let lastDate = null
  for (const m of msgs) {
    const d = fmtDate(m.createdAt)
    if (d !== lastDate) { out.push({ type: 'divider', label: d, id: `div-${m._id}` }); lastDate = d }
    out.push({ type: 'msg', ...m })
  }
  return out
}

// ── Emoji categories ──────────────────────────────────────────────────────────
const EMOJI_CATEGORIES = [
  { label: '😀', emojis: ['😀','😁','😂','🤣','😃','😄','😅','😆','😇','😉','😊','🙂','🙃','😋','😌','😍','🥰','😘','😗','😙','😚','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','😎','🤓','🧐','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖'] },
  { label: '👋', emojis: ['👋','🤚','🖐','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦵','🦶','👂','🦻','👃','🫀','🫁','🧠','🦷','🦴','👀','👁','👅','👄','🫦','💋','🩸'] },
  { label: '🎉', emojis: ['🎉','🎊','🎈','🎁','🎀','🎗','🎟','🎫','🏆','🥇','🥈','🥉','🏅','🎖','🏵','🎗','🎪','🤹','🎭','🎨','🎬','🎤','🎧','🎼','🎵','🎶','🎹','🥁','🎷','🎺','🎸','🪕','🎻','🎲','🎯','🎳','🎮','🕹','🎰','🧩','🪆','🪅','🧸','🪀','🪁','♟'] },
  { label: '❤️', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','❤️‍🔥','❤️‍🩹','💔','💕','💞','💓','💗','💖','💝','💘','💟','☮️','✝️','☯️','🕉','☪️','🔯','🛐','⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓','🆔','⚛️','🉑','☢️','☣️','📴','📳','🈶','🈚','🈸','🈺','🈷️','✴️','🆚','💮','🉐','㊙️','㊗️','🈴','🈵','🈹','🈲','🅰️','🅱️','🆎','🆑','🅾️','🆘','❌','⭕','🛑','⛔','📛','🚫'] },
  { label: '🔥', emojis: ['🔥','✨','💫','⭐','🌟','💥','❄️','🌈','☀️','🌙','⚡','🌊','🍀','🌸','🌺','🌻','🌹','🌷','🌼','💐','🍁','🍂','🍃','🌿','☘️','🪴','🌱','🌲','🌳','🌴','🪨','🌵','🎋','🎍','🪵','🪸','🪺','🐾','🦋','🐛','🦗','🪲','🐜','🪳','🦟','🦠','💧','💦','🫧','🌫','🌬','🌀','🌈','⛈','🌩','🌨','❄️','⛄','🔆','🔅'] },
  { label: '🍕', emojis: ['🍕','🍔','🍟','🌭','🍿','🧂','🥓','🥚','🍳','🧇','🥞','🧈','🍞','🥐','🥖','🫓','🥨','🥯','🧀','🥗','🥙','🥪','🌮','🌯','🫔','🥫','🍱','🍘','🍙','🍚','🍛','🍜','🍝','🍠','🍢','🍣','🍤','🍥','🥮','🍡','🥟','🥠','🥡','🦀','🦞','🦐','🦑','🍦','🍧','🍨','🍩','🍪','🎂','🍰','🧁','🥧','🍫','🍬','🍭','🍮','🍯','🍷','🍸','🍹','🧃','🥤','🧋','☕','🍵','🫖','🍺','🍻','🥂','🥃','🫗'] },
]

// ── Emoji Picker component ─────────────────────────────────────────────────────
function EmojiPicker({ onSelect, onClose }) {
  const [tab, setTab] = useState(0)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, scale: 0.9, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 8 }} transition={{ duration: 0.15 }}
      style={{
        position: 'absolute', bottom: '100%', right: 0, marginBottom: 8,
        width: 320, borderRadius: 16,
        background: 'rgba(12,10,30,0.98)', backdropFilter: 'blur(20px)',
        border: '1px solid rgba(99,102,241,0.25)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        zIndex: 200, overflow: 'hidden',
      }}>
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(99,102,241,0.15)', padding: '6px 8px 0', gap: 2 }}>
        {EMOJI_CATEGORIES.map((cat, i) => (
          <button key={i} onClick={() => setTab(i)}
            style={{
              flex: 1, padding: '6px 4px', borderRadius: '8px 8px 0 0', border: 'none', cursor: 'pointer',
              fontSize: 16, background: tab === i ? 'rgba(99,102,241,0.2)' : 'transparent',
              borderBottom: tab === i ? '2px solid #6366f1' : '2px solid transparent',
              transition: 'all 0.15s',
            }}>
            {cat.label}
          </button>
        ))}
      </div>
      {/* Emoji grid */}
      <div style={{ padding: 10, display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 2, maxHeight: 220, overflowY: 'auto' }}>
        {EMOJI_CATEGORIES[tab].emojis.map((emoji) => (
          <button key={emoji} onClick={() => onSelect(emoji)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', fontSize: 20,
              padding: '4px', borderRadius: 6, lineHeight: 1,
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
            {emoji}
          </button>
        ))}
      </div>
    </motion.div>
  )
}

function Avatar({ user, size = 38 }) {
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

// ── Members slide-over (mentor only) ─────────────────────────────────────────
function MembersPanel({ onClose }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    generalGroupAPI.getMembers()
      .then(r => setMembers(r.data.members || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <motion.div
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 280 }}
      style={{
        position: 'absolute', inset: 0, zIndex: 50,
        background: 'rgba(8,6,24,0.98)', backdropFilter: 'blur(20px)',
        display: 'flex', flexDirection: 'column',
      }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px', borderBottom: '1px solid rgba(99,102,241,0.15)',
        background: 'rgba(99,102,241,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Users size={18} color="#818cf8" />
          <span style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>
            Members · {members.length}
          </span>
        </div>
        <button onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(148,163,184,0.7)', padding: 4 }}>
          <X size={20} />
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
        {loading
          ? <div style={{ textAlign: 'center', paddingTop: 60, color: 'rgba(148,163,184,0.5)', fontSize: 13 }}>Loading...</div>
          : members.map((m, i) => (
            <motion.div key={m._id}
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 12, marginBottom: 6,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(99,102,241,0.1)',
              }}>
              <Avatar user={m} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: 'white', fontWeight: 600, fontSize: 13 }}>{m.name}</span>
                  {m.role === 'mentor' && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 6,
                      background: 'rgba(99,102,241,0.2)', color: '#a5b4fc',
                      border: '1px solid rgba(99,102,241,0.3)',
                    }}>MENTOR</span>
                  )}
                </div>
                <p style={{ fontSize: 11, color: 'rgba(148,163,184,0.5)', margin: 0 }}>{m.email}</p>
              </div>
              <span style={{ fontSize: 10, color: 'rgba(99,102,241,0.5)', whiteSpace: 'nowrap' }}>
                {fmtDate(m.joinedAt)}
              </span>
            </motion.div>
          ))
        }
      </div>
    </motion.div>
  )
}

// ── Message Bubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg, isOwn, isMentor, onDelete }) {
  const [hover, setHover] = useState(false)
  const senderRole = msg.sender?.role

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', flexDirection: isOwn ? 'row-reverse' : 'row',
        alignItems: 'flex-end', gap: 8, marginBottom: 6, padding: '2px 4px',
      }}>
      {!isOwn && <Avatar user={msg.sender} size={34} />}
      <div style={{ maxWidth: '72%', minWidth: 60 }}>
        {!isOwn && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, paddingLeft: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: senderRole === 'mentor' ? '#a5b4fc' : '#94a3b8' }}>
              {msg.sender?.name}
            </span>
            {senderRole === 'mentor' && (
              <span style={{
                fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 5,
                background: 'rgba(99,102,241,0.22)', color: '#c4b5fd',
                border: '1px solid rgba(99,102,241,0.35)', letterSpacing: '0.5px',
              }}>MENTOR</span>
            )}
          </div>
        )}
        <div style={{
          position: 'relative',
          background: isOwn
            ? 'linear-gradient(135deg,#6366f1,#4f46e5)'
            : senderRole === 'mentor'
              ? 'rgba(99,102,241,0.14)'
              : 'rgba(255,255,255,0.07)',
          border: isOwn ? 'none'
            : senderRole === 'mentor'
              ? '1px solid rgba(99,102,241,0.28)'
              : '1px solid rgba(255,255,255,0.07)',
          borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          padding: '9px 13px',
          boxShadow: isOwn ? '0 2px 12px rgba(99,102,241,0.35)' : '0 1px 4px rgba(0,0,0,0.3)',
        }}>
          <p style={{ color: 'white', fontSize: 13, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {msg.content}
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 3 }}>
            <span style={{ fontSize: 10, color: isOwn ? 'rgba(255,255,255,0.5)' : 'rgba(148,163,184,0.4)' }}>
              {fmt(msg.createdAt)}
            </span>
          </div>
          <AnimatePresence>
            {hover && (isOwn || isMentor) && (
              <motion.button
                initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}
                onClick={() => onDelete(msg._id)}
                style={{
                  position: 'absolute', top: -10,
                  right: isOwn ? 'auto' : -10, left: isOwn ? -10 : 'auto',
                  width: 24, height: 24, borderRadius: '50%', border: 'none',
                  background: '#ef4444', color: 'white', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(239,68,68,0.5)',
                }}>
                <Trash2 size={11} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function GeneralGroup() {
  const { user } = useAuthStore()
  const isMentor = user?.role === 'mentor'

  const [isMember,    setIsMember]    = useState(false)
  const [memberCount, setMemberCount] = useState(0)
  const [messages,    setMessages]    = useState([])
  const [input,       setInput]       = useState('')
  const [loading,     setLoading]     = useState(true)
  const [joining,     setJoining]     = useState(false)
  const [sending,     setSending]     = useState(false)
  const [typingUsers, setTypingUsers] = useState([])
  const [showMembers, setShowMembers] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [error,       setError]       = useState('')
  const [showEmoji,   setShowEmoji]   = useState(false)

  const bottomRef   = useRef(null)
  const inputRef    = useRef(null)
  const typingTimer = useRef(null)
  const isTyping    = useRef(false)

  // fetch status
  useEffect(() => {
    if (!user) return
    generalGroupAPI.getStatus()
      .then(r => { setIsMember(r.data.isMember); setMemberCount(r.data.totalMembers) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  // load messages once member
  useEffect(() => {
    if (!isMember) return
    generalGroupAPI.getMessages()
      .then(r => setMessages(r.data.messages || []))
      .catch(() => {})
  }, [isMember])

  // scroll bottom
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // socket
  useEffect(() => {
    const socket = getSocket()
    if (!socket || !isMember) return
    socket.emit('joinGeneralGroup')

    const onMsg        = (msg) => setMessages(p => [...p, msg])
    const onCount      = ({ count }) => setMemberCount(count)
    const onTyping     = ({ userId: uid, userName }) =>
      setTypingUsers(p => p.find(u => u.userId === uid) ? p : [...p, { userId: uid, userName }])
    const onStopTyping = ({ userId: uid }) => setTypingUsers(p => p.filter(u => u.userId !== uid))
    const onErr        = ({ message: m }) => { setError(m); setTimeout(() => setError(''), 3500) }

    socket.on('groupMessage',           onMsg)
    socket.on('groupMemberCount',       onCount)
    socket.on('groupUserTyping',        onTyping)
    socket.on('groupUserStoppedTyping', onStopTyping)
    socket.on('generalGroupError',      onErr)

    return () => {
      socket.emit('leaveGeneralGroup')
      socket.off('groupMessage',           onMsg)
      socket.off('groupMemberCount',       onCount)
      socket.off('groupUserTyping',        onTyping)
      socket.off('groupUserStoppedTyping', onStopTyping)
      socket.off('generalGroupError',      onErr)
    }
  }, [isMember, user])

  const handleJoin = async () => {
    setJoining(true)
    try {
      const r = await generalGroupAPI.join()
      setIsMember(true); setMemberCount(r.data.totalMembers)
    } catch (e) { setError(e?.response?.data?.message || 'Failed to join') }
    finally { setJoining(false) }
  }

  const handleLeave = async () => {
    if (!window.confirm('Leave General Group?')) return
    try {
      const r = await generalGroupAPI.leave()
      setIsMember(false); setMessages([]); setMemberCount(r.data.totalMembers)
      getSocket()?.emit('leaveGeneralGroup')
    } catch (e) { setError(e?.response?.data?.message || 'Failed to leave') }
  }

  const handleSend = useCallback(() => {
    if (!input.trim() || sending) return
    const socket = getSocket()
    if (!socket) return
    socket.emit('sendGroupMessage', { content: input.trim() })
    setInput(''); setSending(false)
    isTyping.current = false
    socket.emit('groupStopTyping')
    inputRef.current?.focus()
  }, [input, sending])

  const handleInputChange = (e) => {
    setInput(e.target.value)
    if (!isMentor) return
    const socket = getSocket()
    if (!socket) return
    if (!isTyping.current) { isTyping.current = true; socket.emit('groupTyping') }
    clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => { isTyping.current = false; socket.emit('groupStopTyping') }, 2000)
  }

  const handleDelete = async (msgId) => {
    try {
      await generalGroupAPI.deleteMessage(msgId)
      setMessages(p => p.filter(m => m._id !== msgId))
    } catch (e) { setError(e?.response?.data?.message || 'Failed to delete') }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const grouped = groupByDate(messages)

  return (
    <div className="flex min-h-screen" style={{ position: 'relative' }}>
      {/* Navbar */}
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      {/* Fixed background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, backgroundImage: 'url(/image.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, background: 'rgba(5,3,20,0.85)' }} />

      {/* Sidebar */}
      <div style={{ position: 'relative', zIndex: 60 }}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* ── Main content — offset by sidebar on desktop ── */}
      <div
        className="relative flex-1 lg:ml-[240px] mt-16"
        style={{ zIndex: 5, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', overflow: 'hidden' }}
      >

        {/* Error toast */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{
                position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
                zIndex: 100, background: '#ef4444', color: 'white',
                padding: '8px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                boxShadow: '0 4px 20px rgba(239,68,68,0.4)', whiteSpace: 'nowrap',
              }}>
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Group header bar ─────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', flexShrink: 0,
          background: 'rgba(8,6,24,0.88)', borderBottom: '1px solid rgba(99,102,241,0.15)',
          backdropFilter: 'blur(16px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 18px rgba(99,102,241,0.4)', flexShrink: 0,
            }}>
              <Users size={20} color="white" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>General Group</span>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
                  background: 'rgba(99,102,241,0.2)', color: '#a5b4fc',
                  border: '1px solid rgba(99,102,241,0.3)',
                }}>PUBLIC</span>
              </div>
              <p style={{ color: 'rgba(148,163,184,0.55)', fontSize: 11, margin: 0, fontFamily: 'monospace' }}>
                {memberCount} member{memberCount !== 1 ? 's' : ''} · Only mentors can send messages
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Members btn — mentor only */}
            {isMentor && isMember && (
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => setShowMembers(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 10, cursor: 'pointer',
                  background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
                  color: '#a5b4fc', fontSize: 12, fontWeight: 600,
                }}>
                <Users size={14} />
                <span>Members</span>
                <span style={{
                  background: '#6366f1', color: 'white', borderRadius: 99,
                  padding: '1px 7px', fontSize: 10, fontWeight: 700,
                }}>{memberCount}</span>
              </motion.button>
            )}
            {isMember ? (
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleLeave}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10,
                  cursor: 'pointer', background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', fontSize: 12, fontWeight: 600,
                }}>
                <LogOut size={14} /><span className="hidden sm:inline">Leave</span>
              </motion.button>
            ) : (
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={handleJoin} disabled={joining}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 10,
                  cursor: joining ? 'not-allowed' : 'pointer',
                  background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none',
                  color: 'white', fontSize: 12, fontWeight: 700,
                  boxShadow: '0 2px 12px rgba(99,102,241,0.4)', opacity: joining ? 0.7 : 1,
                }}>
                <LogIn size={14} />{joining ? 'Joining...' : 'Join Group'}
              </motion.button>
            )}
          </div>
        </div>

        {/* ── Messages area ────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>

          {/* Not a member landing */}
          {!loading && !isMember && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', minHeight: '70%', padding: '32px 20px',
              textAlign: 'center', gap: 18,
            }}>
              <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 3, repeat: Infinity }}
                style={{
                  width: 88, height: 88, borderRadius: '50%',
                  background: 'linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.2))',
                  border: '2px solid rgba(99,102,241,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                <Users size={36} color="#818cf8" />
              </motion.div>
              <h2 style={{ color: 'white', fontSize: 22, fontWeight: 800, margin: 0 }}>General Group</h2>
              <p style={{ color: 'rgba(148,163,184,0.65)', fontSize: 14, maxWidth: 340, lineHeight: 1.7, margin: 0 }}>
                A broadcast channel for everyone. Mentors post announcements, updates &amp; resources. Students can read all messages.
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                {[
                  { icon: <Crown size={14} color="#f59e0b" />, text: 'Mentors can send messages' },
                  { icon: <GraduationCap size={14} color="#818cf8" />, text: 'Students read-only' },
                  { icon: <Users size={14} color="#34d399" />, text: `${memberCount} members joined` },
                ].map(({ icon, text }, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '7px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(203,213,225,0.8)',
                  }}>
                    {icon} {text}
                  </div>
                ))}
              </div>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={handleJoin} disabled={joining}
                style={{
                  marginTop: 4, padding: '13px 36px', borderRadius: 50, border: 'none',
                  background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                  color: 'white', fontWeight: 700, fontSize: 15,
                  cursor: joining ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 20px rgba(99,102,241,0.45)', opacity: joining ? 0.7 : 1,
                }}>
                {joining ? 'Joining...' : 'Join General Group'}
              </motion.button>
            </div>
          )}

          {/* Message list */}
          {isMember && (
            <div style={{ padding: '8px 12px', maxWidth: 780, margin: '0 auto', width: '100%' }}>
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(148,163,184,0.4)', fontSize: 13 }}>
                  No messages yet.{isMentor ? ' Be the first to post!' : ' Waiting for a mentor to post...'}
                </div>
              )}
              {grouped.map(item =>
                item.type === 'divider' ? (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0 8px' }}>
                    <div style={{ flex: 1, height: 1, background: 'rgba(99,102,241,0.12)' }} />
                    <span style={{
                      fontSize: 11, fontWeight: 600, color: 'rgba(148,163,184,0.45)',
                      padding: '3px 12px', borderRadius: 99,
                      background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.12)',
                    }}>{item.label}</span>
                    <div style={{ flex: 1, height: 1, background: 'rgba(99,102,241,0.12)' }} />
                  </div>
                ) : (
                  <MessageBubble
                    key={item._id} msg={item}
                    isOwn={String(item.sender?._id) === String(user?._id)}
                    isMentor={isMentor} onDelete={handleDelete}
                  />
                )
              )}
              {typingUsers.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px' }}>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {[0, 1, 2].map(i => (
                      <motion.div key={i}
                        animate={{ y: [0, -4, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                        style={{ width: 6, height: 6, borderRadius: '50%', background: '#818cf8' }} />
                    ))}
                  </div>
                  <span style={{ fontSize: 11, color: 'rgba(148,163,184,0.55)', fontStyle: 'italic' }}>
                    {typingUsers.map(u => u.userName).join(', ')} typing...
                  </span>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* ── Input bar ────────────────────────────────────────────────────── */}
        {isMember && (
          <div style={{
            flexShrink: 0, padding: '10px 12px',
            background: 'rgba(8,6,24,0.9)', borderTop: '1px solid rgba(99,102,241,0.12)',
            backdropFilter: 'blur(16px)',
          }}>
            {isMentor ? (
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', maxWidth: 780, margin: '0 auto' }}>
                <Avatar user={user} size={36} />
                {/* Emoji picker wrapper */}
                <div style={{ flex: 1, position: 'relative' }}>
                  <textarea
                    ref={inputRef} value={input}
                    onChange={handleInputChange} onKeyDown={handleKeyDown}
                    placeholder="Send a message to the group..."
                    rows={1}
                    style={{
                      width: '100%', resize: 'none', overflowY: 'auto',
                      padding: '10px 44px 10px 14px', background: 'rgba(255,255,255,0.07)',
                      border: '1px solid rgba(99,102,241,0.25)', borderRadius: 14,
                      color: 'white', fontSize: 13, outline: 'none', fontFamily: 'inherit', maxHeight: 120,
                      boxSizing: 'border-box',
                    }}
                    onInput={e => {
                      e.target.style.height = 'auto'
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
                    }}
                  />
                  {/* Emoji toggle button inside textarea */}
                  <button onClick={() => setShowEmoji(v => !v)}
                    style={{
                      position: 'absolute', right: 10, bottom: 10,
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: showEmoji ? '#818cf8' : 'rgba(148,163,184,0.5)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: 2, transition: 'color 0.15s',
                    }}>
                    <Smile size={18} />
                  </button>
                  {/* Emoji picker */}
                  <AnimatePresence>
                    {showEmoji && (
                      <EmojiPicker
                        onSelect={(emoji) => {
                          setInput(p => p + emoji)
                          inputRef.current?.focus()
                        }}
                        onClose={() => setShowEmoji(false)}
                      />
                    )}
                  </AnimatePresence>
                </div>
                <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                  onClick={handleSend} disabled={!input.trim()}
                  style={{
                    width: 44, height: 44, borderRadius: 12, border: 'none', cursor: 'pointer', flexShrink: 0,
                    background: input.trim() ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.07)',
                    color: input.trim() ? 'white' : 'rgba(148,163,184,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: input.trim() ? '0 2px 12px rgba(99,102,241,0.4)' : 'none', transition: 'all 0.2s',
                  }}>
                  <Send size={18} />
                </motion.button>
              </div>
            ) : (
              <div style={{
                maxWidth: 780, margin: '0 auto',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '10px 16px', borderRadius: 12,
                background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.15)',
              }}>
                <Info size={14} color="#818cf8" />
                <span style={{ color: 'rgba(148,163,184,0.6)', fontSize: 12 }}>
                  You can read messages. Only mentors can send messages in this group.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Members slide-over */}
        <AnimatePresence>
          {showMembers && <MembersPanel onClose={() => setShowMembers(false)} />}
        </AnimatePresence>
      </div>
    </div>
  )
}
