import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, MessageCircle, Video, Loader2, AlertCircle, Search, UserCircle2, Clock, Award, Zap } from 'lucide-react'
import { mentorAPI, roomAPI } from '../services/api'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'

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
  'Robotics': { bg: 'rgba(96,165,250,0.15)', border: 'rgba(96,165,250,0.3)', text: '#93c5fd' },
  'Programming': { bg: 'rgba(52,211,153,0.15)', border: 'rgba(52,211,153,0.3)', text: '#6ee7b7' },
  'AI/ML': { bg: 'rgba(167,139,250,0.15)', border: 'rgba(167,139,250,0.3)', text: '#c4b5fd' },
  'IoT': { bg: 'rgba(56,189,248,0.15)', border: 'rgba(56,189,248,0.3)', text: '#7dd3fc' },
  'Electronics': { bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.3)', text: '#fcd34d' },
  'Embedded Systems': { bg: 'rgba(248,113,113,0.15)', border: 'rgba(248,113,113,0.3)', text: '#fca5a5' },
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
    <div className="flex min-h-screen" style={{ position: 'relative' }}>
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      {/* Background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, backgroundImage: 'url(/src/assets/image.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, background: 'rgba(5,3,20,0.80)' }} />

      {/* Sidebar */}
      <div style={{ position: 'relative', zIndex: 60 }}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main */}
      <div className="relative flex-1 lg:ml-[240px] mt-16 px-3 sm:px-5 py-5 overflow-x-hidden" style={{ zIndex: 5 }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 mb-6">
          <motion.div
            animate={{ boxShadow: ['0 0 0px rgba(99,102,241,0)', '0 0 24px rgba(99,102,241,0.5)', '0 0 0px rgba(99,102,241,0)'] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.25))', border: '1px solid rgba(99,102,241,0.4)' }}
          >
            <UserCircle2 size={28} style={{ color: '#818cf8' }} />
          </motion.div>
          <div>
            <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
              className="text-2xl sm:text-3xl font-bold"
              style={{ background: 'linear-gradient(135deg,#a5b4fc,#818cf8,#c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Find a Mentor
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
              style={{ color: 'rgba(148,163,184,0.7)', fontSize: '0.8rem', fontFamily: 'monospace' }}>
              Connect with experts and accelerate your learning
            </motion.p>
          </div>
        </motion.div>

        {/* Search */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-4">
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'rgba(148,163,184,0.5)' }} />
            <input
              type="text"
              placeholder="Search mentors by name or skill..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(99,102,241,0.2)', backdropFilter: 'blur(12px)' }}
            />
          </div>
        </motion.div>

        {/* Topic Filters */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="flex gap-2 flex-wrap mb-5">
          {TOPICS.map(topic => (
            <button key={topic.id} onClick={() => setSelectedTopic(topic.id)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200"
              style={{
                background: selectedTopic === topic.id ? `${topic.color}25` : 'rgba(255,255,255,0.05)',
                border: `1px solid ${selectedTopic === topic.id ? topic.color + '60' : 'rgba(255,255,255,0.1)'}`,
                color: selectedTopic === topic.id ? topic.color : 'rgba(148,163,184,0.7)',
                boxShadow: selectedTopic === topic.id ? `0 0 12px ${topic.color}30` : 'none',
              }}>
              {topic.label}
            </button>
          ))}
        </motion.div>

        {/* Count */}
        <div className="flex items-center justify-between mb-4">
          <p style={{ color: 'rgba(148,163,184,0.5)', fontSize: '0.75rem', fontFamily: 'monospace' }}>
            <span style={{ color: '#818cf8' }}>{filteredMentors.length}</span> mentor{filteredMentors.length !== 1 ? 's' : ''} found
          </p>
        </div>

        {/* Error */}
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex items-center gap-3 p-4 rounded-xl mb-5"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <AlertCircle className="text-red-400 flex-shrink-0" size={16} />
            <p className="text-red-300 text-sm flex-1">{error}</p>
            <button onClick={fetchMentors} className="px-3 py-1 bg-red-500 text-white rounded-lg text-xs hover:bg-red-600 transition">Retry</button>
          </motion.div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex flex-col items-center py-24 gap-3">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
              <Loader2 size={36} style={{ color: '#818cf8' }} />
            </motion.div>
            <p style={{ color: 'rgba(148,163,184,0.6)', fontSize: '0.8rem', fontFamily: 'monospace' }}>Loading mentors...</p>
          </div>
        ) : filteredMentors.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredMentors.map((mentor, index) => (
              <motion.div key={mentor._id}
                initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.06, 0.4), type: 'spring', stiffness: 200 }}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                className="group relative rounded-2xl overflow-hidden"
                style={{ background: 'rgba(10,8,30,0.7)', border: '1px solid rgba(99,102,241,0.15)', backdropFilter: 'blur(20px)' }}
              >
                {/* Top glow bar */}
                <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg,transparent,#6366f1,#8b5cf6,transparent)' }} />

                {/* Hover glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{ background: 'radial-gradient(ellipse at top,rgba(99,102,241,0.12),transparent 70%)' }} />

                <div className="p-5 relative z-10">
                  {/* Avatar */}
                  <div className="flex flex-col items-center mb-4">
                    <motion.div className="relative mb-3"
                      whileHover={{ scale: 1.05 }} transition={{ duration: 0.2 }}>
                      <div className="w-18 h-18 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-2xl"
                        style={{ width: 72, height: 72, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 0 20px rgba(99,102,241,0.4)' }}>
                        {mentor.profileImage
                          ? <img src={mentor.profileImage} alt={mentor.name} className="w-full h-full object-cover" />
                          : mentor.name?.charAt(0).toUpperCase() || 'M'}
                      </div>
                      {/* Online dot */}
                      <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full border-2"
                        style={{ background: '#34d399', borderColor: 'rgba(10,8,30,0.9)' }} />
                    </motion.div>

                    <h3 className="font-bold text-white text-center text-sm mb-1">{mentor.name}</h3>
                    <div className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                      style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.35)', color: '#c4b5fd' }}>
                      ✦ Mentor
                    </div>
                  </div>

                  {/* Skills */}
                  <div className="mb-4">
                    <p style={{ color: 'rgba(148,163,184,0.5)', fontSize: '0.65rem', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Expertise</p>
                    <div className="flex flex-wrap gap-1.5">
                      {mentor.skills?.length > 0 ? mentor.skills.slice(0, 3).map((skill, idx) => {
                        const c = SKILL_COLORS[skill] || { bg: 'rgba(99,102,241,0.15)', border: 'rgba(99,102,241,0.3)', text: '#a5b4fc' }
                        return (
                          <span key={idx} className="px-2 py-0.5 rounded-md text-xs font-medium"
                            style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>
                            {skill}
                          </span>
                        )
                      }) : <span style={{ color: 'rgba(148,163,184,0.4)', fontSize: '0.75rem' }}>No skills listed</span>}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2 mb-4 pb-4"
                    style={{ borderBottom: '1px solid rgba(99,102,241,0.15)' }}>
                    {[
                      { icon: Clock, label: 'Experience', value: '3+ Yrs', color: '#818cf8' },
                      { icon: Award, label: 'Sessions', value: '250+', color: '#fbbf24' },
                    ].map(s => {
                      const Icon = s.icon
                      return (
                        <div key={s.label} className="rounded-xl p-2 text-center"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <Icon size={12} style={{ color: s.color, margin: '0 auto 3px' }} />
                          <p style={{ color: 'rgba(148,163,184,0.5)', fontSize: '0.6rem', fontFamily: 'monospace' }}>{s.label}</p>
                          <p className="text-white font-bold text-xs">{s.value}</p>
                        </div>
                      )
                    })}
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-2">
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={() => handleMessage(mentor)} disabled={!!connecting}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white text-xs font-semibold transition disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', boxShadow: '0 4px 12px rgba(99,102,241,0.35)' }}>
                      {connecting === mentor._id + '_msg' ? <Loader2 size={13} className="animate-spin" /> : <MessageCircle size={13} />}
                      Message
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={() => handleVideoCall(mentor)} disabled={!!connecting}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white text-xs font-semibold transition disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg,#059669,#047857)', boxShadow: '0 4px 12px rgba(5,150,105,0.35)' }}>
                      {connecting === mentor._id + '_video' ? <Loader2 size={13} className="animate-spin" /> : <Video size={13} />}
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
              style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <Search size={32} style={{ color: 'rgba(99,102,241,0.6)' }} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">No mentors found</h3>
            <p style={{ color: 'rgba(148,163,184,0.6)', fontSize: '0.85rem' }}>
              {searchQuery ? `No results for "${searchQuery}"` : selectedTopic !== 'all' ? `No mentors for "${selectedTopic}"` : 'No mentors registered yet.'}
            </p>
            {(selectedTopic !== 'all' || searchQuery) && (
              <button onClick={() => { setSelectedTopic('all'); setSearchQuery('') }}
                className="mt-4 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 12px rgba(99,102,241,0.35)' }}>
                View All Mentors
              </button>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}
