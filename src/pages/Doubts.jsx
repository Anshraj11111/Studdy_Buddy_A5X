import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { doubtAPI } from '../services/api'
import Card from '../components/Card'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Input from '../components/Input'
import { Link } from 'react-router-dom'
import { Search, Trash2, Edit, Users } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

export default function Doubts() {
  const [doubts, setDoubts] = useState([])
  const [search, setSearch] = useState('')
  const [topic, setTopic] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const { user } = useAuthStore()

  useEffect(() => {
    const fetchDoubts = async () => {
      try {
        setLoading(true)
        let res
        // Fetch only current user's doubts
        if (search) {
          res = await doubtAPI.search(search)
          // Filter to show only user's doubts
          const allDoubts = res.data.data?.doubts || []
          const userDoubts = allDoubts.filter(d => 
            user && (d.userId === user._id || d.userId?._id === user._id || String(d.userId) === String(user._id))
          )
          setDoubts(userDoubts)
          setTotal(userDoubts.length)
        } else if (topic) {
          res = await doubtAPI.getByTopic(topic, page)
          const allDoubts = res.data.data?.doubts || []
          const userDoubts = allDoubts.filter(d => 
            user && (d.userId === user._id || d.userId?._id === user._id || String(d.userId) === String(user._id))
          )
          setDoubts(userDoubts)
          setTotal(res.data.data?.pagination?.total || 0)
        } else {
          // Fetch all doubts but filter to show only user's doubts
          res = await doubtAPI.list(page, 100) // Get more to filter
          const allDoubts = res.data.data?.doubts || []
          const userDoubts = allDoubts.filter(d => 
            user && (d.userId === user._id || d.userId?._id === user._id || String(d.userId) === String(user._id))
          )
          setDoubts(userDoubts)
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

  const topics = ['Robotics', 'Programming', 'Electronics', 'Mechanics', 'AI/ML']

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-4xl font-bold">My Doubts</h1>
            <Link to="/doubts/new">
              <Button variant="primary">Post Doubt</Button>
            </Link>
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
                        <Badge
                          variant={
                            doubt.status === 'matched'
                              ? 'success'
                              : doubt.status === 'resolved'
                                ? 'success'
                                : 'warning'
                          }
                        >
                          {doubt.status}
                        </Badge>
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
      </div>
    </div>
  )
}
