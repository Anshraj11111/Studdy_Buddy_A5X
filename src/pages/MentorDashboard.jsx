import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { doubtAPI, roomAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'
import Card from '../components/Card'
import Badge from '../components/Badge'
import Button from '../components/Button'
import { MessageSquare, CheckCircle, Users, Edit2, Trash2, User, Video, MessageCircle } from 'lucide-react'

export default function MentorDashboard() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState('doubts')
  const [doubts, setDoubts] = useState([])
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [replyingTo, setReplyingTo] = useState(null)
  const [editingReply, setEditingReply] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [stats, setStats] = useState({ totalDoubts: 0, pendingReplies: 0, activeChats: 0 })

  useEffect(() => {
    fetchAllDoubts()
    fetchRooms()
  }, [])

  const fetchAllDoubts = async () => {
    try {
      setLoading(true)
      const res = await doubtAPI.list(1, 100)
      const allDoubts = res.data.data.doubts || []
      setDoubts(allDoubts)
      setStats(prev => ({
        ...prev,
        totalDoubts: allDoubts.length,
        pendingReplies: allDoubts.filter(d => !d.replies || d.replies.length === 0).length,
      }))
    } catch (error) {
      console.error('Failed to fetch doubts:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRooms = async () => {
    try {
      const res = await roomAPI.list()
      const r = res.data.data?.rooms || []
      setRooms(r)
      setStats(prev => ({ ...prev, activeChats: r.length }))
    } catch (error) {
      console.error('Failed to fetch rooms:', error)
    }
  }

  const handleReply = async (doubtId) => {
    if (!replyText.trim()) return
    try {
      if (editingReply) {
        await doubtAPI.editReply(doubtId, editingReply, { content: replyText })
        setEditingReply(null)
      } else {
        await doubtAPI.addReply(doubtId, { content: replyText })
      }
      setReplyText('')
      setReplyingTo(null)
      fetchAllDoubts()
    } catch (error) {
      alert(error.response?.data?.error?.message || 'Failed to save reply')
    }
  }

  const handleEditReply = (doubtId, reply) => {
    setReplyingTo(doubtId)
    setEditingReply(reply._id)
    setReplyText(reply.content)
  }

  const handleDeleteReply = async (doubtId, replyId) => {
    if (!window.confirm('Delete this reply?')) return
    try {
      await doubtAPI.deleteReply(doubtId, replyId)
      fetchAllDoubts()
    } catch (error) {
      alert(error.response?.data?.error?.message || 'Failed to delete reply')
    }
  }

  const cancelReply = () => {
    setReplyingTo(null)
    setEditingReply(null)
    setReplyText('')
  }

  const getOtherUser = (room) => {
    if (!user || !room) return null
    const userId = String(user._id)
    if (userId === String(room.student1?._id || room.student1)) return room.student2
    return room.student1
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-6 sm:mb-8">
            Mentor Dashboard
          </h1>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 sm:gap-6 mb-6 sm:mb-8">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-3 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total Doubts</p>
                  <p className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.totalDoubts}</p>
                </div>
                <MessageSquare className="text-blue-400 dark:text-blue-500 hidden sm:block" size={36} />
              </div>
            </Card>
            <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 p-3 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Pending</p>
                  <p className="text-2xl sm:text-3xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pendingReplies}</p>
                </div>
                <Users className="text-yellow-400 dark:text-yellow-500 hidden sm:block" size={36} />
              </div>
            </Card>
            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-3 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Chats</p>
                  <p className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">{stats.activeChats}</p>
                </div>
                <CheckCircle className="text-green-400 dark:text-green-500 hidden sm:block" size={36} />
              </div>
            </Card>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('doubts')}
              className={`px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-medium transition border-b-2 -mb-px ${
                activeTab === 'doubts'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Student Doubts
            </button>
            <button
              onClick={() => setActiveTab('chats')}
              className={`px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-medium transition border-b-2 -mb-px ${
                activeTab === 'chats'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Chats ({rooms.length})
            </button>
          </div>

          {/* Doubts Tab */}
          {activeTab === 'doubts' && (
            loading ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading...</div>
            ) : doubts.length > 0 ? (
              <div className="space-y-4">
                {doubts.map((doubt, index) => (
                  <motion.div
                    key={doubt._id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                  >
                    <Card>
                      <div className="flex items-start gap-3 sm:gap-4 mb-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-base sm:text-lg flex-shrink-0">
                          {doubt.userId?.profileImage ? (
                            <img src={doubt.userId.profileImage} alt={doubt.userId.name} className="w-full h-full object-cover rounded-full" />
                          ) : (
                            doubt.userId?.name?.charAt(0).toUpperCase() || 'U'
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                            <div className="min-w-0">
                              <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-white truncate">{doubt.title}</h3>
                              <div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 flex-wrap">
                                <User size={12} />
                                <span className="font-medium">{doubt.userId?.name || 'Unknown'}</span>
                                <span>·</span>
                                <span>{new Date(doubt.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <div className="flex gap-1.5 flex-wrap flex-shrink-0">
                              <Badge variant={doubt.status === 'resolved' ? 'success' : doubt.status === 'matched' ? 'warning' : 'default'}>
                                {doubt.status}
                              </Badge>
                              <Badge>{doubt.topic}</Badge>
                            </div>
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3">{doubt.description}</p>
                        </div>
                      </div>

                      {/* Replies */}
                      {doubt.replies && doubt.replies.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                          <p className="text-xs sm:text-sm font-semibold mb-3 flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                            <MessageSquare size={14} /> Replies ({doubt.replies.length})
                          </p>
                          <div className="space-y-2.5">
                            {doubt.replies.map((reply) => (
                              <div key={reply._id} className="bg-gray-50 dark:bg-gray-800/60 p-3 sm:p-4 rounded-lg">
                                <div className="flex justify-between items-start mb-1.5">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0">
                                      {reply.user?.profileImage ? (
                                        <img src={reply.user.profileImage} alt={reply.user.name} className="w-full h-full object-cover rounded-full" />
                                      ) : (
                                        reply.user?.name?.charAt(0).toUpperCase() || 'M'
                                      )}
                                    </div>
                                    <div>
                                      <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">{reply.user?.name || 'Mentor'}</p>
                                      <p className="text-xs text-gray-400">{new Date(reply.createdAt).toLocaleDateString()}</p>
                                    </div>
                                  </div>
                                  {user && reply.user?._id === user._id && (
                                    <div className="flex gap-1">
                                      <button onClick={() => handleEditReply(doubt._id, reply)} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition">
                                        <Edit2 size={13} />
                                      </button>
                                      <button onClick={() => handleDeleteReply(doubt._id, reply._id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition">
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                                <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">{reply.content}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Reply Form */}
                      {replyingTo === doubt._id ? (
                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                            {editingReply ? 'Edit Reply' : 'Write a Reply'}
                          </label>
                          <textarea
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                            placeholder="Write your reply..."
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            rows="3"
                          />
                          <div className="flex gap-2 mt-2">
                            <Button variant="primary" size="sm" onClick={() => handleReply(doubt._id)}>
                              {editingReply ? 'Update' : 'Send Reply'}
                            </Button>
                            <Button variant="secondary" size="sm" onClick={cancelReply}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3">
                          <Button variant="outline" size="sm" onClick={() => setReplyingTo(doubt._id)}>
                            Reply
                          </Button>
                        </div>
                      )}
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <Card className="text-center py-12">
                <MessageSquare size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No student doubts yet.</p>
              </Card>
            )
          )}

          {/* Chats Tab */}
          {activeTab === 'chats' && (
            rooms.length > 0 ? (
              <div className="space-y-3">
                {rooms.map((room, index) => {
                  const otherUser = getOtherUser(room)
                  return (
                    <motion.div
                      key={room._id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                    >
                      <Card className="hover:shadow-lg transition-shadow border-l-4 border-blue-500">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="relative flex-shrink-0">
                              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow">
                                {otherUser?.profileImage ? (
                                  <img src={otherUser.profileImage} alt={otherUser.name} className="w-full h-full object-cover" />
                                ) : (
                                  otherUser?.name?.charAt(0).toUpperCase() || 'U'
                                )}
                              </div>
                              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white truncate">
                                {otherUser?.name || 'Unknown User'}
                              </h3>
                              <p className="text-xs text-gray-400 truncate">{otherUser?.email}</p>
                              <Badge className="mt-1 text-xs">{room.topic}</Badge>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <Link to={`/chat/${room._id}`}>
                              <button className="flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl transition shadow text-sm font-medium">
                                <MessageCircle size={16} />
                                <span className="hidden sm:inline">Chat</span>
                              </button>
                            </Link>
                            <Link to={`/video-call/${room._id}`}>
                              <button className="flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-xl transition shadow text-sm font-medium">
                                <Video size={16} />
                                <span className="hidden sm:inline">Video</span>
                              </button>
                            </Link>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
            ) : (
              <Card className="text-center py-14 border-2 border-dashed border-blue-200 dark:border-blue-800">
                <MessageCircle className="mx-auto mb-3 text-blue-300 dark:text-blue-700" size={48} />
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-1">No chats yet</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Students will appear here when they message you.</p>
              </Card>
            )
          )}
        </motion.div>
      </div>
    </div>
  )
}
