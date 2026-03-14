import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Users, Star, MessageCircle, Video, Loader, BookOpen, AlertCircle } from 'lucide-react'
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
      console.log('Mentors API response:', res.data)
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
      const roomId = res.data.data.room._id
      navigate(`/chat/${roomId}`)
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
      const roomId = res.data.data.room._id
      navigate(`/video-call/${roomId}`)
    } catch (err) {
      console.error('Failed to start video call:', err)
      alert('Failed to connect. Please try again.')
    } finally {
      setConnecting(null)
    }
  }

  const filteredMentors = selectedTopic === 'all'
    ? mentors
    : mentors.filter(m => m.skills?.includes(selectedTopic))

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="animate-spin text-primary-500" size={48} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Find a Mentor</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Connect with experienced mentors via chat or video call
          </p>
        </div>

        {/* Topic Filter */}
        <div className="mb-6 flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedTopic('all')}
            className={`px-4 py-2 rounded-lg transition font-medium ${
              selectedTopic === 'all'
                ? 'bg-primary-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            All Topics
          </button>
          {TOPICS.map(topic => (
            <button
              key={topic}
              onClick={() => setSelectedTopic(topic)}
              className={`px-4 py-2 rounded-lg transition font-medium ${
                selectedTopic === topic
                  ? 'bg-primary-500 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {topic}
            </button>
          ))}
        </div>

        {/* Error State */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl mb-6">
            <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
            <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
            <button onClick={fetchMentors} className="ml-auto px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition">
              Retry
            </button>
          </div>
        )}

        {/* Mentors Grid */}
        {filteredMentors.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMentors.map((mentor, index) => (
              <motion.div
                key={mentor._id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition"
              >
                {/* Avatar + Name */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
                    {mentor.name?.charAt(0).toUpperCase() || 'M'}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">{mentor.name}</h3>
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Star size={14} fill="currentColor" />
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Mentor</span>
                    </div>
                  </div>
                </div>

                {/* Skills */}
                <div className="mb-4">
                  <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <BookOpen size={14} />
                    <span className="font-medium">Expertise:</span>
                  </div>
                  {mentor.skills && mentor.skills.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {mentor.skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500 dark:text-gray-400">Robotics & Programming</span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleMessage(mentor)}
                    disabled={connecting === mentor._id + '_msg'}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-60 text-white rounded-lg font-medium transition text-sm"
                  >
                    {connecting === mentor._id + '_msg' ? (
                      <Loader size={16} className="animate-spin" />
                    ) : (
                      <MessageCircle size={16} />
                    )}
                    Message
                  </button>
                  <button
                    onClick={() => handleVideoCall(mentor)}
                    disabled={connecting === mentor._id + '_video'}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:opacity-60 text-white rounded-lg font-medium transition text-sm"
                  >
                    {connecting === mentor._id + '_video' ? (
                      <Loader size={16} className="animate-spin" />
                    ) : (
                      <Video size={16} />
                    )}
                    Video Call
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : !error && (
          <div className="text-center py-16">
            <Users size={64} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No mentors found</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {selectedTopic === 'all' ? 'No mentors registered yet.' : `No mentors for ${selectedTopic} yet.`}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
