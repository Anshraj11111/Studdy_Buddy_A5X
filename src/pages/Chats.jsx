import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { roomAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'
import Card from '../components/Card'
import Badge from '../components/Badge'
import { MessageSquare, Video, Users, Trash2 } from 'lucide-react'

export default function Chats() {
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuthStore()

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setLoading(true)
        const res = await roomAPI.list()
        const allRooms = res.data.data?.rooms || []
        
        // Remove duplicates - keep only unique rooms based on participants
        const uniqueRooms = []
        const seenPairs = new Set()
        
        for (const room of allRooms) {
          const student1Id = String(room.student1?._id || room.student1)
          const student2Id = String(room.student2?._id || room.student2)
          const pairKey = [student1Id, student2Id].sort().join('-')
          
          if (!seenPairs.has(pairKey)) {
            seenPairs.add(pairKey)
            uniqueRooms.push(room)
          }
        }
        
        setRooms(uniqueRooms)
      } catch (error) {
        console.error('Failed to fetch rooms:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchRooms()
    }
  }, [user])

  const getOtherUser = (room) => {
    if (!user || !room) return null
    const userId = user._id
    const student1Id = room.student1?._id || room.student1
    const student2Id = room.student2?._id || room.student2
    
    if (String(userId) === String(student1Id)) {
      return room.student2
    } else {
      return room.student1
    }
  }

  const handleDeleteChat = async (roomId, e) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!window.confirm('Are you sure you want to delete this chat? This action cannot be undone.')) {
      return
    }

    try {
      // TODO: Add delete room API endpoint
      // await roomAPI.delete(roomId)
      
      // For now, just remove from UI
      setRooms(rooms.filter(r => r._id !== roomId))
      alert('Chat deleted successfully')
    } catch (error) {
      console.error('Failed to delete chat:', error)
      alert('Failed to delete chat')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            My Chats
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            All your conversations with matched students
          </p>
        </motion.div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p>Loading chats...</p>
          </div>
        ) : rooms.length > 0 ? (
          <div className="space-y-3">
            {rooms.map((room, index) => {
              const otherUser = getOtherUser(room)
              
              return (
                <motion.div
                  key={room._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="hover:shadow-xl transition-all duration-300 bg-white dark:bg-gray-800 border-l-4 border-blue-500">
                    <div className="flex items-center justify-between gap-4">
                      <Link to={`/chat/${room._id}`} className="flex items-center gap-4 flex-1">
                        {/* User Avatar */}
                        <div className="relative">
                          <div className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                            {otherUser?.name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                        </div>
                        
                        {/* User Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-lg mb-1 text-gray-900 dark:text-white truncate">
                            {otherUser?.name || 'Unknown User'}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate mb-2">
                            {otherUser?.email || 'No email'}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                              {room.topic}
                            </Badge>
                            <Badge
                              variant={
                                room.status === 'active'
                                  ? 'success'
                                  : room.status === 'completed'
                                    ? 'secondary'
                                    : 'warning'
                              }
                            >
                              {room.status}
                            </Badge>
                          </div>
                        </div>
                      </Link>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <Link to={`/chat/${room._id}`}>
                          <button
                            className="flex items-center gap-2 px-4 py-2.5 text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl transition shadow-md hover:shadow-lg"
                            title="Open chat"
                          >
                            <MessageSquare size={18} />
                            <span className="text-sm font-medium hidden sm:inline">Chat</span>
                          </button>
                        </Link>
                        <Link to={`/video-call/${room._id}`}>
                          <button
                            className="flex items-center gap-2 px-4 py-2.5 text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-xl transition shadow-md hover:shadow-lg"
                            title="Start video call"
                          >
                            <Video size={18} />
                            <span className="text-sm font-medium hidden sm:inline">Video</span>
                          </button>
                        </Link>
                        <button
                          onClick={(e) => handleDeleteChat(room._id, e)}
                          className="p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition"
                          title="Delete chat"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        ) : (
          <Card className="text-center py-16 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 border-2 border-dashed border-blue-300 dark:border-blue-700">
            <Users className="mx-auto mb-4 text-blue-400" size={64} />
            <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">No chats yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Post a doubt and find a match to start chatting!
            </p>
            <Link to="/doubts/new">
              <button className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition shadow-lg hover:shadow-xl font-medium">
                Post a Doubt
              </button>
            </Link>
          </Card>
        )}
      </div>
    </div>
  )
}
