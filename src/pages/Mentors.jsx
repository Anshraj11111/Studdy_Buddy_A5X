import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, MessageCircle, Video, Loader2, AlertCircle, Search, UserCircle2, Clock, Award, Zap } from 'lucide-react'
import { mentorAPI, roomAPI } from '../services/api'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import { setupOnlineTracking, getSocket } from '../services/socket'

const TOPICS = [
  { id: 'all', label: 'All Topics', color: '#818cf8' },
  { id: 'Robotics', label: 'Robotics', color: '#60a5fa' },
  { id: 'Programming', label: 'Programming', color: '#34d399' },
  { id: 'AI/ML', label: 'AI/ML', color: '#a78bfa' },
  { id: 'IoT', label: 'IoT', color: '#38bdf8' },
  { id: 'Electronics', label: 'Electronics', color: '#fbbf24' },
  { id: 'Embedded Systems', label: 'Embedded', color: '#f87171' },
]

const SKILL_COLORS = {
  'Robotics': { bg: '#dbeafe', text: '#3b82f6' },
  'Programming': { bg: '#d1fae5', text: '#059669' },
  'AI/ML': { bg: '#e9d5ff', text: '#a855f7' },
  'IoT': { bg: '#cffafe', text: '#0891b2' },
  'Electronics': { bg: '#fef3c7', text: '#d97706' },
  'Embedded Systems': { bg: '#fee2e2', text: '#dc2626' },
}

export default function Mentors() {
  const navigate = useNavigate()
  const [mentors, setMentors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [connecting, setConnecting] = useState(null)
  const [selectedTopic, setSelectedTopic] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState(new Set())

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return
    setupOnlineTracking((updatedSet) => setOnlineUsers(new Set(updatedSet)))
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => { fetchMentors() }, 200)
    return () => clearTimeout(timer)
  }, [])

  const fetchMentors = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await mentorAPI.getAll()
      setMentors(res.data.data.mentors || [])
    } catch (err) {
      setError('Failed to load mentors. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleMessage = async (mentor) => {
    try {
      setConnecting(mentor._id + '_msg')
      const res = await roomAPI.createDirect(mentor._id)
      navigate(`/chat/${res.data.data.room._id}`)
    } catch { alert('Failed to connect. Please try again.') }
    finally { setConnecting(null) }
  }

  const handleVideoCall = async (mentor) => {
    try {
      setConnecting(mentor._id + '_video')
      const res = await roomAPI.createDirect(mentor._id)
      navigate(`/video-call/${res.data.data.room._id}`)
    } catch { alert('Failed to connect. Please try again.') }
    finally { setConnecting(null) }
  }

  const filteredMentors = mentors.filter(m => {
    const matchesTopic = selectedTopic === 'all' || (m.skills && m.skills.includes(selectedTopic))
    const matchesSearch = !searchQuery ||
      m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.skills?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesTopic && matchesSearch
  })

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      {/* Sidebar */}
      <div style={{ position: 'relative', zIndex: 60 }}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main */}
      <div className="relative flex-1 lg:ml-[240px] mt-16 px-4 sm:px-6 lg:px-8 py-6 overflow-x-hidden"
        style={{ background: 'var(--bg-primary)' }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} 
          className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-theme-primary mb-1.5">Find a Mentor</h1>
            <p className="text-theme-secondary text-sm">Connect with experts and accelerate your learning</p>
          </div>
        </motion.div>

        {/* Search */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-6">
          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-theme-tertiary" />
            <input
              type="text"
              placeholder="Search mentors by name or skill..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-lg text-theme-primary placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-sm transition-all"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}
            />
          </div>
        </motion.div>

        {/* Topic Filters */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="flex gap-2 flex-wrap mb-5">
          {TOPICS.map(topic => (
            <button key={topic.id} onClick={() => setSelectedTopic(topic.id)}
              className="px-3.5 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                background: selectedTopic === topic.id ? '#e0e7ff' : 'var(--bg-secondary)',
                color: selectedTopic === topic.id ? '#6366f1' : 'var(--text-tertiary)',
                border: `1px solid ${selectedTopic === topic.id ? '#c7d2fe' : 'var(--border-primary)'}`
              }}>
              {topic.label}
            </button>
          ))}
        </motion.div>

        {/* Count */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-theme-secondary text-sm flex items-center gap-1.5">
            <UserCircle2 size={16} className="text-indigo-500" />
            <span className="font-semibold text-theme-primary">{filteredMentors.length}</span> 
            <span>mentor{filteredMentors.length !== 1 ? 's' : ''} found</span>
          </p>
        </div>

        {/* Error */}
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex items-center gap-3 p-4 rounded-lg mb-5"
            style={{ background: 'var(--bg-secondary)', border: '1px solid #fca5a5', color: '#dc2626' }}>
            <AlertCircle className="flex-shrink-0" size={18} />
            <p className="text-sm flex-1">{error}</p>
            <button onClick={fetchMentors} 
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
              style={{ background: '#dc2626', color: 'white' }}>
              Retry
            </button>
          </motion.div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex flex-col items-center py-24 gap-3">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
              <Loader2 size={36} className="text-indigo-500" />
            </motion.div>
            <p className="text-theme-secondary text-sm">Loading mentors...</p>
          </div>
        ) : filteredMentors.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredMentors.map((mentor, index) => (
              <motion.div key={mentor._id}
                initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.06, 0.4), type: 'spring', stiffness: 200 }}
                className="group relative rounded-xl overflow-hidden transition-all hover:shadow-lg"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}
              >
                <div className="p-5 relative">
                  {/* Avatar */}
                  <div className="flex flex-col items-center mb-4">
                    <div className="relative mb-3">
                      <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-2xl"
                        style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                        {mentor.profileImage
                          ? <img src={mentor.profileImage} alt={mentor.name} className="w-full h-full object-cover" />
                          : mentor.name?.charAt(0).toUpperCase() || 'M'}
                      </div>
                      {/* Online indicator */}
                      <div className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full border-2"
                        style={{ 
                          background: onlineUsers.has(String(mentor._id)) ? '#34d399' : '#94a3b8', 
                          borderColor: 'var(--bg-secondary)' 
                        }} />
                    </div>

                    <h3 className="font-semibold text-theme-primary text-center text-base mb-1">{mentor.name}</h3>
                    <div className="px-2.5 py-1 rounded-md text-xs font-medium"
                      style={{ background: '#e0e7ff', color: '#6366f1' }}>
                      ✦ Mentor
                    </div>
                  </div>

                  {/* Skills */}
                  <div className="mb-4">
                    <p className="text-theme-tertiary text-xs uppercase tracking-wide mb-2">Expertise</p>
                    <div className="flex flex-wrap gap-1.5">
                      {mentor.skills?.length > 0 ? mentor.skills.slice(0, 3).map((skill, idx) => {
                        const c = SKILL_COLORS[skill] || { bg: '#e0e7ff', text: '#6366f1' }
                        return (
                          <span key={idx} className="px-2 py-1 rounded-md text-xs font-medium"
                            style={{ background: c.bg, color: c.text }}>
                            {skill}
                          </span>
                        )
                      }) : <span className="text-theme-muted text-xs">No skills listed</span>}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2 mb-4 pb-4"
                    style={{ borderBottom: '1px solid var(--border-primary)' }}>
                    {[
                      { icon: Clock, label: 'Experience', value: '2+ Yrs', color: '#6366f1' },
                      { icon: Award, label: 'Sessions', value: '250+', color: '#f59e0b' },
                    ].map(s => {
                      const Icon = s.icon
                      return (
                        <div key={s.label} className="rounded-lg p-2.5 text-center"
                          style={{ background: 'var(--bg-primary)' }}>
                          <Icon size={14} className="mx-auto mb-1" style={{ color: s.color }} />
                          <p className="text-theme-tertiary text-xs mb-0.5">{s.label}</p>
                          <p className="text-theme-primary font-semibold text-sm">{s.value}</p>
                        </div>
                      )
                    })}
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-2">
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={() => handleMessage(mentor)} disabled={!!connecting}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-white text-xs font-semibold transition disabled:opacity-50"
                      style={{ background: '#6366f1' }}>
                      {connecting === mentor._id + '_msg' ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />}
                      Message
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={() => handleVideoCall(mentor)} disabled={!!connecting}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-white text-xs font-semibold transition disabled:opacity-50"
                      style={{ background: '#10b981' }}>
                      {connecting === mentor._id + '_video' ? <Loader2 size={14} className="animate-spin" /> : <Video size={14} />}
                      Video
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : !error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-24">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: '#e0e7ff' }}>
              <Search size={32} style={{ color: '#6366f1' }} />
            </div>
            <h3 className="text-lg font-bold text-theme-primary mb-2">No mentors found</h3>
            <p className="text-theme-secondary text-sm">
              {searchQuery ? `No results for "${searchQuery}"` : selectedTopic !== 'all' ? `No mentors for "${selectedTopic}"` : 'No mentors registered yet.'}
            </p>
            {(selectedTopic !== 'all' || searchQuery) && (
              <button onClick={() => { setSelectedTopic('all'); setSearchQuery('') }}
                className="mt-4 px-5 py-2.5 rounded-lg text-white text-sm font-semibold transition-all hover:opacity-90"
                style={{ background: '#6366f1' }}>
                View All Mentors
              </button>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}
