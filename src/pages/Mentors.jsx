import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Users, Star, Clock, MessageCircle, Loader } from 'lucide-react'
import { mentorAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'

export default function Mentors() {
  const [searchParams] = useSearchParams()
  const autoMatch = searchParams.get('autoMatch') === 'true'
  const { user } = useAuthStore()
  
  const [mentors, setMentors] = useState([])
  const [loading, setLoading] = useState(true)
  const [autoMatching, setAutoMatching] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState('all')

  useEffect(() => {
    fetchMentors()
    
    // Auto-match if coming from call end
    if (autoMatch && user?.subjects?.length > 0) {
      handleAutoMatch()
    }
  }, [autoMatch])

  const fetchMentors = async () => {
    try {
      setLoading(true)
      const res = await mentorAPI.getAll()
      setMentors(res.data.data.mentors || [])
    } catch (error) {
      console.error('Failed to fetch mentors:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAutoMatch = async () => {
    try {
      setAutoMatching(true)
      
      // Find mentor with matching expertise
      const userSubject = user.subjects[0]
      const matchedMentor = mentors.find(m => 
        m.expertise.includes(userSubject)
      )

      
      if (matchedMentor) {
        // Create chat room with mentor
        alert(`Matched with ${matchedMentor.userId.name}!`)
        // Navigate to chat (you'll need to implement mentor chat)
      } else {
        alert('No mentor available right now. Please browse the list.')
      }
    } catch (error) {
      console.error('Auto-match failed:', error)
    } finally {
      setAutoMatching(false)
    }
  }

  const handleConnectMentor = (mentor) => {
    // Create chat with mentor
    alert(`Connecting with ${mentor.userId.name}...`)
    // Implement mentor chat functionality
  }

  const filteredMentors = selectedSubject === 'all' 
    ? mentors 
    : mentors.filter(m => m.expertise.includes(selectedSubject))

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-center h-screen">
          <Loader className="animate-spin text-primary-500" size={48} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Find a Mentor
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Connect with experienced mentors to clear your doubts
          </p>
        </div>

        {/* Auto-matching indicator */}
        {autoMatching && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <Loader className="animate-spin text-blue-500" size={20} />
              <span className="text-blue-700 dark:text-blue-300">
                Finding the best mentor for you...
              </span>
            </div>
          </motion.div>
        )}

        {/* Subject Filter */}
        <div className="mb-6 flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedSubject('all')}
            className={`px-4 py-2 rounded-lg transition ${
              selectedSubject === 'all'
                ? 'bg-primary-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            All Topics
          </button>
          {['Robotics', 'Programming', 'AI/ML', 'IoT', 'Electronics', 'Embedded Systems'].map(subject => (
            <button
              key={subject}
              onClick={() => setSelectedSubject(subject)}
              className={`px-4 py-2 rounded-lg transition ${
                selectedSubject === subject
                  ? 'bg-primary-500 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              {subject}
            </button>
          ))}
        </div>

        {/* Mentors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMentors.map((mentor) => (
            <motion.div
              key={mentor._id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition"
            >
              {/* Mentor Avatar */}
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xl">
                  {mentor.userId?.name?.charAt(0).toUpperCase() || 'M'}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                    {mentor.userId?.name || 'Mentor'}
                  </h3>
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Star size={16} fill="currentColor" />
                    <span className="text-sm font-medium">{mentor.rating || 4.5}</span>
                  </div>
                </div>
              </div>

              {/* Expertise */}
              <div className="mb-4">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Expertise:</div>
                <div className="flex flex-wrap gap-2">
                  {mentor.expertise?.map((subject, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm"
                    >
                      {subject}
                    </span>
                  ))}
                </div>
              </div>

              {/* Experience & Availability */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Users size={16} />
                  <span>{mentor.experience || '5+ years'} experience</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Clock size={16} />
                  <span>{mentor.availability || 'Available now'}</span>
                </div>
              </div>

              {/* Connect Button */}
              <button
                onClick={() => handleConnectMentor(mentor)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg font-medium transition"
              >
                <MessageCircle size={20} />
                Connect
              </button>
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {filteredMentors.length === 0 && (
          <div className="text-center py-12">
            <Users size={64} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              No mentors found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Try selecting a different subject
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
