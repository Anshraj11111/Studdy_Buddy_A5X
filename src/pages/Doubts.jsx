import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { doubtAPI, roomAPI } from '../services/api'
import Card from '../components/Card'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Input from '../components/Input'
import Sidebar from '../components/Sidebar'
import GlowingQuestionMark from '../components/GlowingQuestionMark'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Trash2, Edit, Users, X, MessageCircle } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

export default function Doubts() {
  const [doubts, setDoubts] = useState([])
  const [allDoubts, setAllDoubts] = useState([]) // Store all doubts for filtering
  const [search, setSearch] = useState('')
  const [topic, setTopic] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // New: status filter
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [showMatchModal, setShowMatchModal] = useState(false)
  const [matchedRoom, setMatchedRoom] = useState(null)
  const { user } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    const fetchDoubts = async () => {
      try {
        setLoading(true)
        let res
        // Fetch only current user's doubts
        if (search) {
          res = await doubtAPI.search(search)
          // Filter to show only user's doubts
          const allDoubtsData = res.data.data?.doubts || []
          const userDoubts = allDoubtsData.filter(d => 
            user && (d.userId === user._id || d.userId?._id === user._id || String(d.userId) === String(user._id))
          )
          setAllDoubts(userDoubts)
          setTotal(userDoubts.length)
        } else if (topic) {
          res = await doubtAPI.getByTopic(topic, page)
          const allDoubtsData = res.data.data?.doubts || []
          const userDoubts = allDoubtsData.filter(d => 
            user && (d.userId === user._id || d.userId?._id === user._id || String(d.userId) === String(user._id))
          )
          setAllDoubts(userDoubts)
          setTotal(res.data.data?.pagination?.total || 0)
        } else {
          // Fetch all doubts but filter to show only user's doubts
          res = await doubtAPI.list(page, 100) // Get more to filter
          const allDoubtsData = res.data.data?.doubts || []
          const userDoubts = allDoubtsData.filter(d => 
            user && (d.userId === user._id || d.userId?._id === user._id || String(d.userId) === String(user._id))
          )
          setAllDoubts(userDoubts)
          setTotal(userDoubts.length)
        }
      } catch (error) {
        console.error('Failed to fetch doubts:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchDoubts()
    }
  }, [page, search, topic, user])

  // Filter doubts based on status filter
  useEffect(() => {
    if (statusFilter === 'all') {
      setDoubts(allDoubts)
    } else if (statusFilter === 'unsolved') {
      setDoubts(allDoubts.filter(d => d.status === 'open'))
    } else if (statusFilter === 'solved') {
      setDoubts(allDoubts.filter(d => d.status === 'resolved'))
    } else if (statusFilter === 'matched') {
      setDoubts(allDoubts.filter(d => d.status === 'matched'))
    } else if (statusFilter === 'trending') {
      // Sort by reply count or recent activity
      const sorted = [...allDoubts].sort((a, b) => {
        const aReplies = a.replies?.length || 0
        const bReplies = b.replies?.length || 0
        return bReplies - aReplies
      })
      setDoubts(sorted)
    }
  }, [statusFilter, allDoubts])

  const handleDelete = async (doubtId, e) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!window.confirm('Are you sure you want to delete this doubt?')) {
      return
    }

    try {
      await doubtAPI.delete(doubtId)
      // Refresh the page to show updated list
      window.location.reload()
    } catch (error) {
      console.error('Failed to delete doubt:', error)
      const errorMsg = error.response?.data?.error?.message || 'Failed to delete doubt'
      alert(errorMsg)
    }
  }

  const handleFindMatch = async (doubtId, e) => {
    e.preventDefault()
    e.stopPropagation()
    
    try {
      // Call match API endpoint
      const res = await doubtAPI.findMatch(doubtId)
      const { matched, room } = res.data.data
      
      if (matched && room) {
        const goToChat = window.confirm(
          `🎉 Match found!\n\nWe found another student with a similar doubt.\n\nClick OK to start chatting, or Cancel to stay here.`
        )
        
        if (goToChat) {
          window.location.href = `/chat/${room._id}`
        } else {
          window.location.reload()
        }
      } else {
        alert('No matching doubts found at the moment. We\'ll notify you when someone posts a similar doubt!')
      }
    } catch (error) {
      console.error('Failed to find match:', error)
      const errorMsg = error.response?.data?.error?.message || 'Failed to find match'
      alert(errorMsg)
    }
  }

  const handleViewMatch = async (doubt, e) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (doubt.status !== 'matched') return
    
    try {
      // Fetch all rooms to find the one with this doubt
      const roomsRes = await roomAPI.list()
      console.log('Rooms API response:', roomsRes.data)
      
      // Handle different response structures
      const rooms = roomsRes.data.data?.rooms || roomsRes.data.data || []
      console.log('Rooms array:', rooms)
      console.log('Looking for doubt ID:', doubt._id)
      
      // Find room that contains this doubt
      const room = rooms.find(r => {
        const doubt1Id = r.doubt1?._id || r.doubt1
        const doubt2Id = r.doubt2?._id || r.doubt2
        console.log('Checking room:', { doubt1Id, doubt2Id, targetId: doubt._id })
        return String(doubt1Id) === String(doubt._id) || String(doubt2Id) === String(doubt._id)
      })
      
      console.log('Found room:', room)
      
      if (room) {
        setSelectedMatch(doubt)
        setMatchedRoom(room)
        setShowMatchModal(true)
      } else {
        alert('Match details not found. The room may not exist yet.')
      }
    } catch (error) {
      console.error('Failed to fetch match details:', error)
      console.error('Error details:', error.response?.data)
      alert('Failed to load match details: ' + (error.response?.data?.error?.message || error.message))
    }
  }

  const topics = ['Robotics', 'Programming', 'Electronics', 'Mechanics', 'AI/ML']

  return (
    <div className="flex min-h-screen bg-background-light dark:bg-background-dark">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main content */}
      <div className="flex-1 ml-[240px] mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          {/* Header with Glowing Icon */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-4">
              {/* Glowing Question Mark Icon */}
              <div className="flex-shrink-0">
                <GlowingQuestionMark size={60} />
              </div>
              
              {/* Title and Description */}
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-1">
                  My Doubts
                </h1>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Track, manage and resolve your questions efficiently.
                </p>
              </div>
            </div>
            
            <Link to="/doubts/new">
              <Button variant="primary">Post Doubt</Button>
            </Link>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {[
              { id: 'all', label: 'All', icon: '📋' },
              { id: 'unsolved', label: 'Unsolved', icon: '🔴' },
              { id: 'solved', label: 'Solved', icon: '✅' },
              { id: 'matched', label: 'Matched', icon: '🤝' },
              { id: 'trending', label: 'Trending', icon: '🔥' },
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => setStatusFilter(filter.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all whitespace-nowrap ${
                  statusFilter === filter.id
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/50'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                }`}
              >
                <span>{filter.icon}</span>
                <span>{filter.label}</span>
                {filter.id === 'unsolved' && statusFilter === filter.id && (
                  <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                    {allDoubts.filter(d => d.status === 'open').length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search and Filters */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <Input
                type="text"
                placeholder="Search doubts..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="pl-10"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setTopic('')
                  setPage(1)
                }}
                className={`px-4 py-2 rounded-lg transition ${
                  !topic
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300'
                }`}
              >
                All
              </button>
              {topics.map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTopic(t)
                    setPage(1)
                  }}
                  className={`px-4 py-2 rounded-lg transition ${
                    topic === t
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Doubts List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p>Loading doubts...</p>
          </div>
        ) : doubts.length > 0 ? (
          <div className="space-y-4">
            {doubts.map((doubt, index) => (
              <motion.div
                key={doubt._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start gap-4">
                    <Link to={`/doubts/${doubt._id}`} className="flex-1">
                      <h3 className="font-bold text-lg mb-2 hover:text-primary-500 transition">
                        {doubt.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                        {doubt.description}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Badge>{doubt.topic}</Badge>
                        {doubt.status === 'matched' ? (
                          <button
                            onClick={(e) => handleViewMatch(doubt, e)}
                            className="inline-flex"
                          >
                            <Badge variant="success" className="cursor-pointer hover:opacity-80 transition">
                              {doubt.status} - Click to view
                            </Badge>
                          </button>
                        ) : (
                          <Badge
                            variant={doubt.status === 'resolved' ? 'success' : 'warning'}
                          >
                            {doubt.status}
                          </Badge>
                        )}
                        {doubt.tags?.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </Link>
                    
                    {/* Action buttons */}
                    <div className="flex flex-col gap-2">
                      {/* Find Match button - only for open doubts */}
                      {doubt.status === 'open' && (
                        <button
                          onClick={(e) => handleFindMatch(doubt._id, e)}
                          className="flex items-center gap-2 px-4 py-2 text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-lg transition shadow-md"
                          title="Find a match"
                        >
                          <Users size={18} />
                          <span className="text-sm font-medium">Find Match</span>
                        </button>
                      )}
                      
                      {/* Edit/Delete buttons */}
                      <div className="flex gap-2">
                        <Link to={`/doubts/${doubt._id}/edit`}>
                          <button
                            className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-lg transition"
                            title="Edit doubt"
                          >
                            <Edit size={20} />
                          </button>
                        </Link>
                        <button
                          onClick={(e) => handleDelete(doubt._id, e)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg transition"
                          title="Delete doubt"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400 mb-4">No doubts found</p>
            <Link to="/doubts/new">
              <Button variant="primary">Post the first doubt</Button>
            </Link>
          </Card>
        )}

        {/* Pagination */}
        {total > 10 && (
          <div className="flex justify-center gap-2 mt-8">
            <Button
              variant="secondary"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <span className="px-4 py-2">
              Page {page} of {Math.ceil(total / 10)}
            </span>
            <Button
              variant="secondary"
              disabled={page >= Math.ceil(total / 10)}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        )}

        {/* Match Details Modal */}
        <AnimatePresence>
          {showMatchModal && selectedMatch && matchedRoom && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowMatchModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="sticky top-0 bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-t-2xl">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-bold mb-2">🎉 Match Found!</h2>
                      <p className="text-green-100">You've been matched with another student</p>
                    </div>
                    <button
                      onClick={() => setShowMatchModal(false)}
                      className="p-2 hover:bg-white/20 rounded-lg transition"
                    >
                      <X size={24} />
                    </button>
                  </div>
                </div>

                {/* Modal Content */}
                <div className="p-6 space-y-6">
                  {/* Your Doubt */}
                  <div>
                    <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-white">Your Doubt:</h3>
                    <Card className="bg-blue-50 dark:bg-blue-900/20">
                      <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-2">{selectedMatch.title}</h4>
                      <p className="text-gray-700 dark:text-gray-300 text-sm mb-3">{selectedMatch.description}</p>
                      <div className="flex gap-2">
                        <Badge>{selectedMatch.topic}</Badge>
                        {selectedMatch.tags?.map(tag => (
                          <Badge key={tag} variant="secondary">{tag}</Badge>
                        ))}
                      </div>
                    </Card>
                  </div>

                  {/* Matched User's Doubt */}
                  <div>
                    <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-white">Matched Student's Doubt:</h3>
                    {(() => {
                      const matchedDoubt = matchedRoom.doubt1?._id === selectedMatch._id 
                        ? matchedRoom.doubt2 
                        : matchedRoom.doubt1
                      const matchedUser = matchedRoom.student1?._id === user._id 
                        ? matchedRoom.student2 
                        : matchedRoom.student1
                      
                      return (
                        <>
                          <Card className="bg-green-50 dark:bg-green-900/20 mb-4">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold">
                                {matchedUser?.name?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900 dark:text-white">{matchedUser?.name}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{matchedUser?.email}</p>
                              </div>
                            </div>
                            <h4 className="font-bold text-green-900 dark:text-green-100 mb-2">{matchedDoubt?.title}</h4>
                            <p className="text-gray-700 dark:text-gray-300 text-sm mb-3">{matchedDoubt?.description}</p>
                            <div className="flex gap-2">
                              <Badge>{matchedDoubt?.topic}</Badge>
                              {matchedDoubt?.tags?.map(tag => (
                                <Badge key={tag} variant="secondary">{tag}</Badge>
                              ))}
                            </div>
                          </Card>

                          {/* Action Buttons */}
                          <div className="flex gap-3">
                            <Button
                              variant="primary"
                              className="flex-1 flex items-center justify-center gap-2"
                              onClick={() => navigate(`/chat/${matchedRoom._id}`)}
                            >
                              <MessageCircle size={20} />
                              Start Chat
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={() => setShowMatchModal(false)}
                            >
                              Close
                            </Button>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
    </div>
  )
}
