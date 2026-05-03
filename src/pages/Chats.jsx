import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { roomAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { MessageSquare, Video, Users, Trash2, MessageCircle, Search, Loader2 } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'

export default function Chats() {
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
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
    <div className="flex min-h-screen" style={{ position: 'relative' }}>
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      {/* Background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, backgroundImage: 'url(/src/assets/image.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, background: 'rgba(5,3,20,0.82)' }} />

      <div style={{ position: 'relative', zIndex: 60 }}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="relative flex-1 lg:ml-[240px] mt-16 px-3 sm:px-5 py-5 overflow-x-hidden" style={{ zIndex: 5 }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 mb-6">
          <motion.div
            animate={{ boxShadow: ['0 0 0px rgba(99,102,241,0)', '0 0 24px rgba(99,102,241,0.5)', '0 0 0px rgba(99,102,241,0)'] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.25),rgba(139,92,246,0.25))', border: '1px solid rgba(99,102,241,0.4)' }}>
            <MessageCircle size={26} style={{ color: '#818cf8' }} />
          </motion.div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold"
              style={{ background: 'linear-gradient(135deg,#a5b4fc,#818cf8,#c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              My Chats
            </h1>
            <p style={{ color: 'rgba(148,163,184,0.7)', fontSize: '0.8rem', fontFamily: 'monospace' }}>
              All your conversations
            </p>
          </div>
        </motion.div>

        {/* Search */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-5">
          <div className="relative">
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'rgba(148,163,184,0.5)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-11 pr-4 py-3 text-sm text-white placeholder-gray-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(99,102,241,0.2)', backdropFilter: 'blur(12px)' }} />
          </div>
        </motion.div>

        {/* Loading */}
        {loading ? (
          <div className="flex flex-col items-center py-24 gap-3">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
              <Loader2 size={36} style={{ color: '#818cf8' }} />
            </motion.div>
            <p style={{ color: 'rgba(148,163,184,0.6)', fontSize: '0.8rem', fontFamily: 'monospace' }}>Loading chats...</p>
          </div>
        ) : filtered.length > 0 ? (
          <div className="space-y-3">
            {filtered.map((room, index) => {
              const other = getOtherUser(room)
              const statusColor = STATUS_COLORS[room.status] || '#818cf8'
              return (
                <motion.div key={room._id}
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(index * 0.06, 0.4), type: 'spring', stiffness: 200 }}
                  whileHover={{ x: 4, transition: { duration: 0.15 } }}
                  className="group relative rounded-2xl overflow-hidden"
                  style={{ background: 'rgba(10,8,30,0.7)', border: '1px solid rgba(99,102,241,0.15)', backdropFilter: 'blur(20px)' }}>
                  {/* Left accent bar */}
                  <div className="absolute left-0 top-0 bottom-0 w-0.5"
                    style={{ background: 'linear-gradient(to bottom,#6366f1,#8b5cf6)' }} />
                  {/* Hover glow */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{ background: 'radial-gradient(ellipse at left,rgba(99,102,241,0.08),transparent 70%)' }} />

                  <div className="flex items-center justify-between gap-3 p-4 pl-5 relative z-10">
                    <Link to={`/chat/${room._id}`} className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 0 16px rgba(99,102,241,0.35)' }}>
                          {other?.profileImage
                            ? <img src={other.profileImage} alt={other.name} className="w-full h-full object-cover rounded-full" />
                            : other?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2"
                          style={{ background: '#34d399', borderColor: 'rgba(10,8,30,0.9)' }} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="font-bold text-white text-sm truncate">{other?.name || 'Unknown User'}</h3>
                          <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                            style={{ background: `${statusColor}20`, border: `1px solid ${statusColor}40`, color: statusColor }}>
                            {room.status}
                          </span>
                        </div>
                        <p className="text-xs truncate" style={{ color: 'rgba(148,163,184,0.6)' }}>{other?.email || 'No email'}</p>
                        {room.topic && (
                          <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(99,102,241,0.7)', fontFamily: 'monospace' }}>
                            # {room.topic}
                          </p>
                        )}
                      </div>
                    </Link>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Link to={`/chat/${room._id}`}>
                        <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                          className="flex items-center gap-1.5 px-3 py-2 text-white text-xs font-semibold rounded-xl transition"
                          style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', boxShadow: '0 2px 10px rgba(99,102,241,0.35)' }}>
                          <MessageSquare size={13} />
                          <span className="hidden sm:inline">Chat</span>
                        </motion.button>
                      </Link>
                      <Link to={`/video-call/${room._id}`}>
                        <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                          className="flex items-center gap-1.5 px-3 py-2 text-white text-xs font-semibold rounded-xl transition"
                          style={{ background: 'linear-gradient(135deg,#059669,#047857)', boxShadow: '0 2px 10px rgba(5,150,105,0.35)' }}>
                          <Video size={13} />
                          <span className="hidden sm:inline">Video</span>
                        </motion.button>
                      </Link>
                      <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                        onClick={e => handleDeleteChat(room._id, e)}
                        className="p-2 rounded-xl transition"
                        style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                        <Trash2 size={13} />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="text-center py-24 rounded-2xl"
            style={{ background: 'rgba(10,8,30,0.6)', border: '1px solid rgba(99,102,241,0.15)', backdropFilter: 'blur(20px)' }}>
            <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity }}
              className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <Users size={36} style={{ color: 'rgba(99,102,241,0.6)' }} />
            </motion.div>
            <h3 className="text-xl font-bold text-white mb-2">No chats yet</h3>
            <p className="text-sm mb-6" style={{ color: 'rgba(148,163,184,0.6)' }}>
              Post a doubt and find a match to start chatting!
            </p>
            <Link to="/doubts/new">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="px-6 py-3 text-white font-semibold rounded-xl transition"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 16px rgba(99,102,241,0.4)' }}>
                Post a Doubt
              </motion.button>
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  )
}
