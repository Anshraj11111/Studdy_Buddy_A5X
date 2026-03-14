import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Users, Star, MessageCircle, Video, Loader, BookOpen, AlertCircle, Search } from 'lucide-react'
import { mentorAPI, roomAPI } from '../services/api'

const TOPICS = ['Robotics', 'Programming', 'AI/ML', 'IoT', 'Electronics', 'Embedded Systems']

export default function Mentors() {
  const navigate = useNavigate()
  const [mentors, setMentors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [connecting, setConnecting] = useState(null)
  const [selectedTopic, setSelectedTopic] = useState('all')

  useEffect(() => {
    fetchMentors()
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

  // Strict match: only show mentors whose skills include the selected topic
  const filteredMentors = selectedTopic === 'all'
    ? mentors
    : mentors.filter(m => m.skills && m.skills.includes(selectedTopic))

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader className="animate-spin text-blue-500 mx-auto mb-3" size={40} />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Loading mentors...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">Find a Mentor</h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
            Connect with experienced mentors via chat or video call
          </p>
        </div>

        {/* Topic Filter */}
        <div className="mb-6 flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedTopic('all')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition font-medium text-sm sm:text-base ${
              selectedTopic === 'all'
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
            }`}
          >
            All Topics
          </button>
          {TOPICS.map(topic => (
            <button
              key={topic}
              onClick={() => setSelectedTopic(topic)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition font-medium text-sm sm:text-base ${
                selectedTopic === topic
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
              }`}
            >
              {topic}
            </button>
          ))}
        </div>

        {/* Error State */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl mb-6">
            <AlertCircle className="text-red-500 flex-shrink-0" size={18} />
            <p className="text-red-700 dark:text-red-400 text-sm flex-1">{error}</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredMentors.map((mentor, index) => (
              <motion.div
                key={mentor._id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-shadow p-4 sm:p-6 flex flex-col"
              >
                {/* Avatar + Name */}
                <div className="flex items-center gap-3 sm:gap-4 mb-4">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl sm:text-2xl flex-shrink-0">
                    {mentor.profileImage ? (
                      <img src={mentor.profileImage} alt={mentor.name} className="w-full h-full object-cover" />
                    ) : (
                      mentor.name?.charAt(0).toUpperCase() || 'M'
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-white truncate">{mentor.name}</h3>
                    <div className="flex items-center gap-1 text-yellow-500 mt-0.5">
                      <Star size={13} fill="currentColor" />
                      <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Mentor</span>
                    </div>
                  </div>
                </div>

                {/* Skills */}
                <div className="mb-4 flex-1">
                  <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-2">
                    <BookOpen size={13} />
                    <span className="font-medium">Expertise</span>
                  </div>
                  {mentor.skills && mentor.skills.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {mentor.skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 dark:text-gray-500 italic">No expertise listed</span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-auto">
                  <button
                    onClick={() => handleMessage(mentor)}
                    disabled={!!connecting}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-60 text-white rounded-lg font-medium transition text-sm"
                  >
                    {connecting === mentor._id + '_msg' ? (
                      <Loader size={15} className="animate-spin" />
                    ) : (
                      <MessageCircle size={15} />
                    )}
                    Message
                  </button>
                  <button
                    onClick={() => handleVideoCall(mentor)}
                    disabled={!!connecting}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:opacity-60 text-white rounded-lg font-medium transition text-sm"
                  >
                    {connecting === mentor._id + '_video' ? (
                      <Loader size={15} className="animate-spin" />
                    ) : (
                      <Video size={15} />
                    )}
                    Video Call
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : !error && (
          <div className="text-center py-16 sm:py-20">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2">No mentors found</h3>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
              {selectedTopic === 'all'
                ? 'No mentors have registered yet.'
                : `No mentors available for "${selectedTopic}" at the moment.`}
            </p>
            {selectedTopic !== 'all' && (
              <button
                onClick={() => setSelectedTopic('all')}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition"
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
