import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { doubtAPI } from '../services/api'
import Card from '../components/Card'
import Badge from '../components/Badge'
import Button from '../components/Button'
import { MessageSquare, CheckCircle, Upload, Users } from 'lucide-react'

export default function MentorDashboard() {
  const [doubts, setDoubts] = useState([])
  const [loading, setLoading] = useState(true)
  const [replyingTo, setReplyingTo] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [stats, setStats] = useState({
    totalDoubts: 0,
    pendingReplies: 0,
    resolvedDoubts: 0
  })

  useEffect(() => {
    fetchAllDoubts()
  }, [])

  const fetchAllDoubts = async () => {
    try {
      setLoading(true)
      const res = await doubtAPI.list(1, 100) // Fetch all doubts
      const allDoubts = res.data.data.doubts || []
      setDoubts(allDoubts)
      
      // Calculate stats
      setStats({
        totalDoubts: allDoubts.length,
        pendingReplies: allDoubts.filter(d => !d.replies || d.replies.length === 0).length,
        resolvedDoubts: allDoubts.filter(d => d.status === 'resolved').length
      })
    } catch (error) {
      console.error('Failed to fetch doubts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReply = async (doubtId) => {
    if (!replyText.trim()) return
    
    try {
      await doubtAPI.addReply(doubtId, { content: replyText })
      setReplyText('')
      setReplyingTo(null)
      fetchAllDoubts() // Refresh list
    } catch (error) {
      console.error('Failed to add reply:', error)
    }
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl font-bold mb-8">Mentor Dashboard</h1>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Doubts</p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.totalDoubts}</p>
                </div>
                <MessageSquare className="text-blue-600 dark:text-blue-400" size={40} />
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Pending Replies</p>
                  <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pendingReplies}</p>
                </div>
                <Users className="text-yellow-600 dark:text-yellow-400" size={40} />
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Resolved</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.resolvedDoubts}</p>
                </div>
                <CheckCircle className="text-green-600 dark:text-green-400" size={40} />
              </div>
            </Card>
          </div>

          {/* Doubts List */}
          <h2 className="text-2xl font-bold mb-4">All Student Doubts</h2>
          
          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : doubts.length > 0 ? (
            <div className="space-y-4">
              {doubts.map((doubt, index) => (
                <motion.div
                  key={doubt._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg mb-2">{doubt.title}</h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                          {doubt.description}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                          <span>Posted by: {doubt.user?.name || 'Unknown'}</span>
                          <span>•</span>
                          <span>{new Date(doubt.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={doubt.status === 'resolved' ? 'success' : 'warning'}>
                          {doubt.status}
                        </Badge>
                        <Badge>{doubt.subject}</Badge>
                      </div>
                    </div>

                    {/* Replies */}
                    {doubt.replies && doubt.replies.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-semibold mb-2">Replies:</p>
                        {doubt.replies.map((reply, idx) => (
                          <div key={idx} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg mb-2">
                            <p className="text-sm">{reply.content}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {reply.user?.name} • {new Date(reply.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply Form */}
                    {replyingTo === doubt._id ? (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Write your reply..."
                          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                          rows="3"
                        />
                        <div className="flex gap-2 mt-2">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleReply(doubt._id)}
                          >
                            Send Reply
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setReplyingTo(null)
                              setReplyText('')
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setReplyingTo(doubt._id)}
                        >
                          Reply to Doubt
                        </Button>
                      </div>
                    )}
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <Card className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">No doubts posted yet</p>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  )
}
