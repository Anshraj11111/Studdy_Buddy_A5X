import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import { roomAPI } from '../services/api'
import {
  joinRoom,
  sendMessage,
  onMessage,
  onTyping,
  sendTyping,
  leaveRoom,
  getSocket,
} from '../services/socket'
import { showMessageNotification, playNotificationSound, requestNotificationPermission } from '../utils/notifications'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import { Send, Video, ArrowLeft } from 'lucide-react'

export default function Chat() {
  const { roomId } = useParams()
  const { user } = useAuthStore()
  const [room, setRoom] = useState(null)
  const [otherUser, setOtherUser] = useState(null)
  const [messages, setMessages] = useState([])
  const [content, setContent] = useState('')
  const [typing, setTyping] = useState(false)
  const [typingUsers, setTypingUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  useEffect(() => {
    const fetchRoomData = async () => {
      try {
        setLoading(true)
        const res = await roomAPI.getById(roomId)
        const roomData = res.data.data?.room
        const messagesData = res.data.data?.messages || []
        
        setRoom(roomData)
        setMessages(messagesData)
        
        // Determine the other user
        const userId = user._id
        const student1Id = roomData.student1?._id || roomData.student1
        const student2Id = roomData.student2?._id || roomData.student2
        
        if (String(userId) === String(student1Id)) {
          setOtherUser(roomData.student2)
        } else {
          setOtherUser(roomData.student1)
        }
        
        // Request notification permission
        requestNotificationPermission()
      } catch (error) {
        console.error('Failed to fetch room data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchRoomData()
    }
  }, [roomId, user])

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    joinRoom(roomId, user._id)

    const handleMessage = (data) => {
      console.log('Message received:', data)
      setMessages((prev) => [...prev, data])
      
      // Show notification if message is from other user and window is not focused
      const isOwnMessage = String(data.senderId) === String(user._id) || String(data.senderId?._id) === String(user._id)
      if (!isOwnMessage && !document.hasFocus()) {
        showMessageNotification(otherUser?.name || 'Someone', data.content)
        playNotificationSound()
      }
    }

    const handleTyping = (data) => {
      console.log('User typing:', data)
      if (data.userId !== user._id) {
        setTypingUsers((prev) => [...new Set([...prev, data.userId])])
        // Clear typing indicator after 3 seconds
        setTimeout(() => {
          setTypingUsers((prev) => prev.filter(id => id !== data.userId))
        }, 3000)
      }
    }

    // Listen to the correct event names from backend
    socket.on('messageReceived', handleMessage)
    socket.on('userTyping', handleTyping)
    socket.on('roomJoined', (data) => {
      console.log('Room joined:', data)
      if (data.messages && data.messages.length > 0) {
        setMessages(data.messages)
      }
    })

    return () => {
      socket.off('messageReceived', handleMessage)
      socket.off('userTyping', handleTyping)
      socket.off('roomJoined')
      leaveRoom(roomId)
    }
  }, [roomId, user._id, otherUser])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!content.trim()) return

    // Send message with userId
    const socket = getSocket()
    if (socket) {
      socket.emit('sendMessage', {
        roomId,
        userId: user._id,
        content: content.trim()
      })
    }
    
    setContent('')
    setTyping(false)
  }

  const handleTypingChange = (e) => {
    setContent(e.target.value)

    if (!typing) {
      setTyping(true)
      sendTyping(roomId, user._id)
    }

    clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false)
    }, 3000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading chat...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col">
      {/* Chat Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/chats">
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
                <ArrowLeft size={20} />
              </button>
            </Link>
            
            {/* Other User Info */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                {otherUser?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <h2 className="font-bold text-lg">{otherUser?.name || 'Unknown User'}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">{room?.topic}</p>
              </div>
            </div>
          </div>

          {/* Video Call Button */}
          <Link to={`/video-call/${roomId}`}>
            <button className="flex items-center gap-2 px-4 py-2 text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-lg transition shadow-md">
              <Video size={18} />
              <span className="text-sm font-medium">Video Call</span>
            </button>
          </Link>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-w-7xl mx-auto w-full bg-gray-50 dark:bg-gray-900">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-gray-600 dark:text-gray-400">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isOwnMessage = String(msg.senderId) === String(user._id) || String(msg.senderId?._id) === String(user._id)
            const showAvatar = index === 0 || messages[index - 1]?.senderId !== msg.senderId
            
            return (
              <motion.div
                key={msg._id || index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-end gap-2 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                {/* Other user avatar on left */}
                {!isOwnMessage && showAvatar && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {otherUser?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                {!isOwnMessage && !showAvatar && <div className="w-8" />}
                
                {/* Message bubble */}
                <div
                  className={`max-w-xs md:max-w-md px-4 py-2 rounded-2xl shadow-sm ${
                    isOwnMessage
                      ? 'bg-green-500 text-white rounded-br-none'
                      : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-none'
                  }`}
                >
                  {!isOwnMessage && showAvatar && (
                    <p className="text-xs font-semibold mb-1 text-blue-600 dark:text-blue-400">
                      {otherUser?.name || 'Unknown'}
                    </p>
                  )}
                  <p className="text-sm break-words">{msg.content}</p>
                  <p className={`text-xs mt-1 ${isOwnMessage ? 'text-green-100' : 'text-gray-500 dark:text-gray-400'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </motion.div>
            )
          })
        )}

        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
              {otherUser?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="bg-white dark:bg-gray-800 px-4 py-2 rounded-2xl rounded-bl-none shadow-sm">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              type="text"
              placeholder="Type a message..."
              value={content}
              onChange={handleTypingChange}
              className="flex-1"
            />
            <Button
              type="submit"
              variant="primary"
              disabled={!content.trim()}
              className="px-4"
            >
              <Send size={20} />
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
