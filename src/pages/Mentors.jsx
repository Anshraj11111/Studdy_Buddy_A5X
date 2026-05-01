import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Star, MessageCircle, Video, Loader, AlertCircle, Search, Filter, UserCircle2, Clock, Award, MoreVertical } from 'lucide-react'
import { mentorAPI, roomAPI } from '../services/api'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'

const TOPICS = [
  { id: 'all', label: 'All Topics' },
  { id: 'Robotics', label: 'Robotics' },
  { id: 'Programming', label: 'Programming' },
  { id: 'AI/ML', label: 'AI/ML' },
  { id: 'IoT', label: 'IoT' },
  { id: 'Electronics', label: 'Electronics' },
  { id: 'Embedded Systems', label: 'Embedded Systems' }
]

export default function Mentors() {
  const navigate = useNavigate()
  const [mentors, setMentors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [connecting, setConnecting] = useState(null)
  const [selectedTopic, setSelectedTopic] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('relevant')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMentors()
    }, 200)
    return () => clearTimeout(timer)
  }, [])

  const fetchMentors = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await mentorAPI.getAll()
      setMentors(res.data.data.mentors || [])
    } catch (err) {
      console.error('Failed to fetch mentors:', err)
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
    } catch (err) {
      console.error('Failed to create chat:', err)
      alert('Failed to connect. Please try again.')
    } finally {
      setConnecting(null)
    }
  }

  const handleVideoCall = async (mentor) => {
    try {
      setConnecting(mentor._id + '_video')
      const res = await roomAPI.createDirect(mentor._id)
      navigate(`/video-call/${res.data.data.room._id}`)
    } catch (err) {
      console.error('Failed to start video call:', err)
      alert('Failed to connect. Please try again.')
    } finally {
      setConnecting(null)
    }
  }

  // Filter mentors by topic and search query
  const filteredMentors = mentors.filter(m => {
    const matchesTopic = selectedTopic === 'all' || (m.skills && m.skills.includes(selectedTopic))
    const matchesSearch = !searchQuery || 
      m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.skills?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesTopic && matchesSearch
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ position: "relative" }}>
        <div style={{
          position: "fixed", inset: 0, zIndex: 0,
          backgroundImage: "url(/src/assets/image.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }} />
        <div style={{ position: "fixed", inset: 0, zIndex: 1, background: "rgba(5,3,20,0.75)" }} />
        <div className="text-center" style={{ position: "relative", zIndex: 2 }}>
          <Loader className="animate-spin text-indigo-400 mx-auto mb-3" size={40} />
          <p className="text-gray-300 text-sm">Loading mentors...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen" style={{ position: "relative" }}>
      {/* Navbar */}
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      
      {/* Full page background image */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0,
        backgroundImage: "url(/src/assets/image.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }} />
      {/* Dark overlay for readability */}
      <div style={{ position: "fixed", inset: 0, zIndex: 1, background: "rgba(5,3,20,0.75)" }} />
      
      {/* Sidebar */}
      <div style={{ position: "relative", zIndex: 60 }}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>
      
      {/* Main content */}
      <div className="relative flex-1 lg:ml-[240px] mt-16 px-3 sm:px-5 py-3 sm:py-5 space-y-3 sm:space-y-4 overflow-x-hidden" style={{ zIndex: 5 }}>

        {/* Header with Icon */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            {/* Icon */}
            <motion.div
              className="relative flex items-center justify-center"
              style={{ width: 80, height: 80 }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))',
                  border: '1px solid rgba(99,102,241,0.3)',
                  backdropFilter: 'blur(10px)'
                }}>
                <UserCircle2 size={40} style={{ color: '#818cf8' }} />
              </div>
            </motion.div>

            {/* Title and Description */}
            <div>
              <motion.h1 
                className="text-3xl font-bold mb-1"
                style={{
                  background: 'linear-gradient(135deg, #a5b4fc 0%, #818cf8 50%, #c4b5fd 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                Find a Mentor
              </motion.h1>
              <motion.p 
                style={{ color: 'rgba(148,163,184,0.7)', fontSize: '0.875rem' }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                Connect with experienced mentors and accelerate your learning journey.
              </motion.p>
            </div>
          </div>
        </div>

        {/* Search Bar and Filters */}
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search mentors by name, expertise or skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent backdrop-blur-sm"
              />
            </div>
            <button className="flex items-center gap-2 px-5 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-300 hover:bg-white/10 transition backdrop-blur-sm">
              <Filter size={18} />
              <span className="hidden sm:inline">Filters</span>
            </button>
          </div>

          {/* Topic Filter Chips */}
          <div className="flex gap-2 flex-wrap">
            {TOPICS.map((topic) => (
              <button
                key={topic.id}
                onClick={() => setSelectedTopic(topic.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  selectedTopic === topic.id
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/50'
                    : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10 backdrop-blur-sm'
                }`}
              >
                {topic.label}
              </button>
            ))}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-sm">
              {filteredMentors.length} mentor{filteredMentors.length !== 1 ? 's' : ''} found
            </p>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 backdrop-blur-sm cursor-pointer"
            >
              <option value="relevant">Most Relevant</option>
              <option value="rating">Highest Rated</option>
              <option value="sessions">Most Sessions</option>
              <option value="recent">Recently Joined</option>
            </select>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl mb-6 backdrop-blur-sm">
            <AlertCircle className="text-red-400 flex-shrink-0" size={18} />
            <p className="text-red-300 text-sm flex-1">{error}</p>
            <button
              onClick={fetchMentors}
              className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition flex-shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* Mentors Grid */}
        {filteredMentors.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {filteredMentors.map((mentor, index) => (
              <motion.div
                key={mentor._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 hover:bg-white/10 hover:border-indigo-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/20"
              >
                {/* More Options */}
                <button className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition">
                  <MoreVertical size={16} />
                </button>

                {/* Avatar */}
                <div className="flex flex-col items-center mb-4">
                  <div className="relative mb-3">
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl ring-4 ring-white/10">
                      {mentor.profileImage ? (
                        <img src={mentor.profileImage} alt={mentor.name} className="w-full h-full object-cover" />
                      ) : (
                        mentor.name?.charAt(0).toUpperCase() || 'M'
                      )}
                    </div>
                  </div>
                  
                  <h3 className="font-bold text-white text-center mb-1">{mentor.name}</h3>
                  
                  {/* Badge */}
                  <div className="px-2 py-0.5 bg-purple-500/20 border border-purple-500/30 rounded-full text-purple-300 text-xs font-semibold mb-2">
                    Mentor
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-1 text-yellow-400">
                    <Star size={14} fill="currentColor" />
                    <span className="text-sm font-semibold">4.9</span>
                    <span className="text-gray-400 text-xs">(120)</span>
                  </div>
                </div>

                {/* Expertise Tags */}
                <div className="mb-4">
                  <p className="text-gray-400 text-xs font-semibold mb-2">Expertise</p>
                  <div className="flex flex-wrap gap-1.5">
                    {mentor.skills && mentor.skills.length > 0 ? (
                      mentor.skills.slice(0, 3).map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-md text-xs font-medium"
                        >
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-500 italic">No expertise listed</span>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-4 pb-4 border-b border-white/10">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                      <Clock size={12} />
                      <p className="text-xs">Experience</p>
                    </div>
                    <p className="text-white font-bold text-sm">3+ Years</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                      <Award size={12} />
                      <p className="text-xs">Sessions</p>
                    </div>
                    <p className="text-white font-bold text-sm">250+</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleMessage(mentor)}
                    disabled={!!connecting}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg font-medium transition text-sm shadow-lg shadow-indigo-500/30"
                  >
                    {connecting === mentor._id + '_msg' ? (
                      <Loader size={14} className="animate-spin" />
                    ) : (
                      <MessageCircle size={14} />
                    )}
                    Message
                  </button>
                  <button
                    onClick={() => handleVideoCall(mentor)}
                    disabled={!!connecting}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded-lg font-medium transition text-sm shadow-lg shadow-green-500/30"
                  >
                    {connecting === mentor._id + '_video' ? (
                      <Loader size={14} className="animate-spin" />
                    ) : (
                      <Video size={14} />
                    )}
                    Video Call
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : !error && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search size={36} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No mentors found</h3>
            <p className="text-gray-400 mb-4">
              {searchQuery
                ? `No results for "${searchQuery}"`
                : selectedTopic === 'all'
                ? 'No mentors have registered yet.'
                : `No mentors available for "${selectedTopic}" at the moment.`}
            </p>
            {(selectedTopic !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedTopic('all')
                  setSearchQuery('')
                }}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/30"
              >
                View All Mentors
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
