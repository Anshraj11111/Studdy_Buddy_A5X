import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { roomAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { MessageSquare, Video, Users, Trash2, MessageCircle, Search, Loader2 } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import { setupOnlineTracking, isUserOnline, getSocket } from '../services/socket'

export default function Chats() {
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState(new Set())
  const { user } = useAuthStore()

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setLoading(true)
        const res = await roomAPI.list()
        const allRooms = res.data.data?.rooms || []
        const uniqueRooms = []
        const seenPairs = new Set()
        for (const room of allRooms) {
          const s1 = String(room.student1?._id || room.student1)
          const s2 = String(room.student2?._id || room.student2)
          const key = [s1, s2].sort().join('-')
          if (!seenPairs.has(key)) { seenPairs.add(key); uniqueRooms.push(room) }
        }
        setRooms(uniqueRooms)
      } catch (err) {
        console.error('Failed to fetch rooms:', err)
      } finally { setLoading(false) }
    }
    if (user) fetchRooms()
  }, [user])

  const getOtherUser = (room) => {
    if (!user || !room) return null
    const uid = user._id
    const s1 = room.student1?._id || room.student1
    const s2 = room.student2?._id || room.student2
    return String(uid) === String(s1) ? room.student2 : room.student1
  }

  // Setup real-time online status tracking
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return
    setupOnlineTracking((updatedSet) => {
      setOnlineUsers(new Set(updatedSet))
    })
  }, [])

  const handleDeleteChat = (roomId, e) => {
    e.preventDefault(); e.stopPropagation()
    if (!window.confirm('Delete this chat?')) return
    setRooms(rooms.filter(r => r._id !== roomId))
  }

  const filtered = rooms.filter(r => {
    const other = getOtherUser(r)
    return !search || other?.name?.toLowerCase().includes(search.toLowerCase())
  })

  const STATUS_COLORS = { active: '#34d399', completed: '#818cf8', pending: '#fbbf24' }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      <div style={{ position: 'relative', zIndex: 60 }}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="relative flex-1 lg:ml-[240px] mt-16 px-4 sm:px-6 lg:px-8 py-6 overflow-x-hidden"
        style={{ background: 'var(--bg-primary)' }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-3xl font-bold text-theme-primary mb-1.5">My Chats</h1>
          <p className="text-theme-secondary text-sm">All your conversations</p>
        </motion.div>

        {/* Search */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6">
          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-theme-tertiary" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-11 pr-4 py-3 text-sm text-theme-primary placeholder-theme-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }} />
          </div>
        </motion.div>

        {/* Loading */}
        {loading ? (
          <div className="flex flex-col items-center py-24 gap-3">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
              <Loader2 size={36} className="text-indigo-500" />
            </motion.div>
            <p className="text-theme-secondary text-sm">Loading chats...</p>
          </div>
        ) : filtered.length > 0 ? (
          <div className="space-y-3">
            {filtered.map((room, index) => {
              const other = getOtherUser(room)
              const otherId = String(other?._id || other || '')
              const isOnline = onlineUsers.has(otherId)
              return (
                <motion.div key={room._id}
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(index * 0.06, 0.4), type: 'spring', stiffness: 200 }}
                  className="group relative rounded-xl overflow-hidden transition-all hover:shadow-md"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>

                  <div className="flex items-center justify-between gap-4 p-4 relative">
                    <Link to={`/chat/${room._id}`} className="flex items-center gap-3.5 flex-1 min-w-0">
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg"
                          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                          {other?.profileImage
                            ? <img src={other.profileImage} alt={other.name} className="w-full h-full object-cover rounded-full" />
                            : other?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full border-2"
                          style={{ background: isOnline ? '#34d399' : '#94a3b8', borderColor: 'var(--bg-secondary)' }} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-theme-primary text-base truncate">{other?.name || 'Unknown User'}</h3>
                          <span className="text-xs px-2 py-0.5 rounded-md flex-shrink-0"
                            style={{
                              background: isOnline ? '#d1fae5' : '#f3f4f6',
                              color: isOnline ? '#059669' : '#6b7280',
                            }}>
                            {isOnline ? 'Online' : 'Offline'}
                          </span>
                        </div>
                        <p className="text-sm truncate text-theme-secondary">{other?.email || 'No email'}</p>
                        {room.topic && (
                          <p className="text-xs mt-1 truncate px-2 py-0.5 rounded-md inline-block"
                            style={{ background: '#e0e7ff', color: '#6366f1' }}>
                            # {room.topic}
                          </p>
                        )}
                      </div>
                    </Link>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Link to={`/chat/${room._id}`}>
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                          className="flex items-center gap-1.5 px-3.5 py-2 text-white text-xs font-medium rounded-lg transition"
                          style={{ background: '#6366f1' }}>
                          <MessageSquare size={14} />
                          <span className="hidden sm:inline">Chat</span>
                        </motion.button>
                      </Link>
                      <Link to={`/video-call/${room._id}`}>
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                          className="flex items-center gap-1.5 px-3.5 py-2 text-white text-xs font-medium rounded-lg transition"
                          style={{ background: '#10b981' }}>
                          <Video size={14} />
                          <span className="hidden sm:inline">Video</span>
                        </motion.button>
                      </Link>
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={e => handleDeleteChat(room._id, e)}
                        className="p-2 rounded-lg transition"
                        style={{ background: 'transparent', color: '#ef4444' }}>
                        <Trash2 size={14} />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="text-center py-24 rounded-xl"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: '#e0e7ff' }}>
              <Users size={36} style={{ color: '#6366f1' }} />
            </div>
            <h3 className="text-xl font-bold text-theme-primary mb-2">No chats yet</h3>
            <p className="text-sm mb-6 text-theme-secondary">
              Post a doubt and find a match to start chatting!
            </p>
            <Link to="/doubts/new">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="px-6 py-3 text-white font-semibold rounded-lg transition"
                style={{ background: '#6366f1', boxShadow: '0 2px 8px rgba(99,102,241,0.3)' }}>
                Post a Doubt
              </motion.button>
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  )
}
