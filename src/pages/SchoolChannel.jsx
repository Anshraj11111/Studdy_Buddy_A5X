import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, Users, Pin, Smile, Trash2, School } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useThemeStore } from '../store/themeStore';
import { useAuthStore } from '../store/authStore';
import axios from 'axios';
import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
let socket;

export default function SchoolChannel() {
  const { theme } = useThemeStore();
  const { user } = useAuthStore();
  const isDark = theme === 'dark';

  const [channel, setChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchChannelData();
    initializeSocket();

    return () => {
      if (socket) {
        socket.emit('school-channel:leave', { channelId: channel?.channelId });
        socket.disconnect();
      }
    };
  }, []);

  const initializeSocket = () => {
    socket = io(API_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('🏫 Connected to school channel socket');
      if (user?._id) {
        socket.emit('school-channel:join', { userId: user._id });
      }
    });

    socket.on('school-channel:joined', (data) => {
      console.log('✅ Joined channel:', data.channelId);
    });

    socket.on('school-channel:new-message', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on('school-channel:message-deleted', ({ messageId }) => {
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    });

    socket.on('school-channel:reaction-updated', (updatedMessage) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === updatedMessage._id ? updatedMessage : m))
      );
    });

    socket.on('school-channel:message-pinned', (updatedMessage) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === updatedMessage._id ? updatedMessage : m))
      );
    });

    socket.on('school-channel:error', (error) => {
      console.error('School channel error:', error.message);
    });

    socket.on('disconnect', () => {
      console.log('🏫 Disconnected from school channel socket');
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChannelData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Fetch channel info
      const channelRes = await axios.get(`${API_URL}/school-channel`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setChannel(channelRes.data.data.channel);

      // Fetch messages
      const messagesRes = await axios.get(`${API_URL}/school-channel/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages(messagesRes.data.data.messages);

      // Fetch members
      const membersRes = await axios.get(`${API_URL}/school-channel/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMembers(membersRes.data.data.members);
    } catch (error) {
      console.error('Error fetching channel data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      
      // Send via socket for real-time delivery
      if (socket && socket.connected && channel) {
        socket.emit('school-channel:message', {
          userId: user._id,
          channelId: channel.channelId,
          content: newMessage,
          messageType: 'text',
        });
        setNewMessage('');
      } else {
        // Fallback to HTTP if socket not connected
        const token = localStorage.getItem('token');
        const response = await axios.post(
          `${API_URL}/school-channel/messages`,
          { content: newMessage, messageType: 'text' },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setMessages([...messages, response.data.data.message]);
        setNewMessage('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert(error.response?.data?.error?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      if (socket && socket.connected && channel) {
        socket.emit('school-channel:delete-message', {
          userId: user._id,
          messageId,
          channelId: channel.channelId,
        });
      } else {
        const token = localStorage.getItem('token');
        await axios.delete(`${API_URL}/school-channel/messages/${messageId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMessages(messages.filter((m) => m._id !== messageId));
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      alert(error.response?.data?.error?.message || 'Failed to delete message');
    }
  };

  const handleReaction = async (messageId, emoji) => {
    try {
      if (socket && socket.connected && channel) {
        socket.emit('school-channel:react', {
          userId: user._id,
          messageId,
          channelId: channel.channelId,
          emoji,
        });
      } else {
        const token = localStorage.getItem('token');
        const response = await axios.post(
          `${API_URL}/school-channel/messages/${messageId}/react`,
          { emoji },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setMessages(messages.map((m) => (m._id === messageId ? response.data.data.message : m)));
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: isDark ? '#0a0814' : '#f5f0ff' }}>
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="min-h-screen" style={{ background: isDark ? '#0a0814' : '#f5f0ff' }}>
        <Navbar />
        <div className="container mx-auto px-4 py-12 text-center max-w-2xl">
          <div className="rounded-2xl p-12"
            style={{
              background: isDark ? 'rgba(15,12,31,0.9)' : '#ffffff',
              border: isDark ? '1px solid rgba(139,92,246,0.2)' : '1px solid #e2e8f0',
            }}>
            <School size={80} className="mx-auto mb-6 text-purple-500 opacity-50" />
            <h2 className="text-3xl font-bold mb-4" style={{ color: isDark ? '#fff' : '#0f172a' }}>
              School Channel Not Available Yet
            </h2>
            <p className="text-lg mb-6" style={{ color: isDark ? 'rgba(148,163,184,0.7)' : '#64748b' }}>
              Your school channel hasn't been created by an admin yet.
            </p>
            <div className="text-left p-6 rounded-xl mb-6"
              style={{
                background: isDark ? 'rgba(139,92,246,0.1)' : '#f3e8ff',
              }}>
              <h3 className="font-semibold mb-3 text-lg" style={{ color: isDark ? '#fff' : '#0f172a' }}>
                📌 Your School Info:
              </h3>
              <div className="space-y-2 text-sm">
                <p style={{ color: isDark ? 'rgba(148,163,184,0.8)' : '#64748b' }}>
                  <strong>School:</strong> {user?.schoolName || 'Not set'}
                </p>
                <p style={{ color: isDark ? 'rgba(148,163,184,0.8)' : '#64748b' }}>
                  <strong>City:</strong> {user?.city || 'Not set'}
                </p>
              </div>
            </div>
            <div className="p-4 rounded-xl"
              style={{
                background: isDark ? 'rgba(59,130,246,0.1)' : '#dbeafe',
                border: isDark ? '1px solid rgba(59,130,246,0.2)' : '1px solid #93c5fd',
              }}>
              <p className="text-sm" style={{ color: isDark ? 'rgba(148,163,184,0.8)' : '#1e40af' }}>
                💡 <strong>Note:</strong> Once an admin creates the channel for your school, 
                you'll automatically be added and able to participate!
              </p>
            </div>
            <div className="mt-8">
              <p className="text-sm mb-4" style={{ color: isDark ? 'rgba(148,163,184,0.6)' : '#94a3b8' }}>
                In the meantime, explore other features:
              </p>
              <div className="flex gap-3 justify-center flex-wrap">
                <a href="/doubts" className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-105"
                  style={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', color: '#fff' }}>
                  Browse Doubts
                </a>
                <a href="/communities" className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-105"
                  style={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', color: '#fff' }}>
                  Join Communities
                </a>
                <a href="/resources" className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-105"
                  style={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', color: '#fff' }}>
                  View Resources
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: isDark ? '#0a0814' : '#f5f0ff' }}>
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl" style={{ paddingTop: '100px' }}>
        {/* Channel Header */}
        <div className="rounded-2xl p-6 mb-6 shadow-xl"
          style={{
            background: isDark ? 'rgba(15,12,31,0.95)' : '#ffffff',
            border: isDark ? '1px solid rgba(139,92,246,0.3)' : '1px solid #e2e8f0',
            backdropFilter: 'blur(20px)',
          }}>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg"
                style={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)' }}>
                <School size={36} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-3xl font-bold mb-2 break-words" style={{ color: isDark ? '#fff' : '#0f172a' }}>
                  {channel.schoolName}
                </h1>
                <div className="flex items-center gap-3 flex-wrap text-sm mb-3">
                  <span className="flex items-center gap-1 px-3 py-1 rounded-full"
                    style={{ 
                      background: isDark ? 'rgba(139,92,246,0.15)' : '#f3e8ff',
                      color: isDark ? '#c4b5fd' : '#7c3aed'
                    }}>
                    📍 {channel.city}
                  </span>
                  <span className="flex items-center gap-1 px-3 py-1 rounded-full"
                    style={{ 
                      background: isDark ? 'rgba(34,197,94,0.15)' : '#dcfce7',
                      color: isDark ? '#86efac' : '#16a34a'
                    }}>
                    <Users size={14} />
                    {channel.stats.totalMembers} members
                  </span>
                </div>
                {channel.description && (
                  <p className="text-sm leading-relaxed break-words" 
                    style={{ color: isDark ? 'rgba(148,163,184,0.8)' : '#64748b' }}>
                    {channel.description}
                  </p>
                )}
              </div>
            </div>
            
            <button
              onClick={() => setShowMembers(!showMembers)}
              className="px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all hover:scale-105 flex-shrink-0 shadow-md"
              style={{
                background: isDark ? 'rgba(139,92,246,0.2)' : '#f3e8ff',
                color: '#8b5cf6',
                border: isDark ? '1px solid rgba(139,92,246,0.3)' : '1px solid #e9d5ff',
                fontWeight: '600',
              }}>
              <Users size={18} />
              {showMembers ? 'Hide' : 'Show'} Members
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Messages Section */}
          <div className="lg:col-span-2 rounded-2xl overflow-hidden"
            style={{
              background: isDark ? 'rgba(15,12,31,0.9)' : '#ffffff',
              border: isDark ? '1px solid rgba(139,92,246,0.2)' : '1px solid #e2e8f0',
            }}>
            
            {/* Messages List */}
            <div className="h-[500px] overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <p style={{ color: isDark ? 'rgba(148,163,184,0.5)' : '#94a3b8' }}>
                    No messages yet. Start the conversation!
                  </p>
                </div>
              ) : (
                messages.map((message) => (
                  <motion.div
                    key={message._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3">
                    
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {message.sender.profileImage ? (
                        <img
                          src={message.sender.profileImage}
                          alt={message.sender.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)' }}>
                          <span className="text-white font-semibold">
                            {message.sender.name[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Message Content */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm"
                          style={{ color: isDark ? '#fff' : '#0f172a' }}>
                          {message.sender.name}
                        </span>
                        {message.sender.role === 'mentor' && (
                          <span className="px-2 py-0.5 rounded text-xs"
                            style={{ background: '#8b5cf6', color: '#fff' }}>
                            Admin
                          </span>
                        )}
                        <span className="text-xs"
                          style={{ color: isDark ? 'rgba(148,163,184,0.5)' : '#94a3b8' }}>
                          {new Date(message.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      
                      <div className="p-3 rounded-xl inline-block"
                        style={{
                          background: isDark ? 'rgba(139,92,246,0.1)' : '#f3e8ff',
                        }}>
                        <p className="text-sm" style={{ color: isDark ? '#fff' : '#0f172a' }}>
                          {message.content}
                        </p>
                      </div>

                      {/* Reactions */}
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => handleReaction(message._id, '👍')}
                          className="text-xs px-2 py-1 rounded hover:opacity-80"
                          style={{
                            background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
                          }}>
                          👍 {message.reactions?.filter(r => r.emoji === '👍').length || 0}
                        </button>
                        <button
                          onClick={() => handleReaction(message._id, '❤️')}
                          className="text-xs px-2 py-1 rounded hover:opacity-80"
                          style={{
                            background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
                          }}>
                          ❤️ {message.reactions?.filter(r => r.emoji === '❤️').length || 0}
                        </button>
                        
                        {message.sender._id === user?._id && (
                          <button
                            onClick={() => handleDeleteMessage(message._id)}
                            className="text-xs px-2 py-1 rounded hover:opacity-80 ml-auto"
                            style={{
                              background: 'rgba(239,68,68,0.1)',
                              color: '#ef4444',
                            }}>
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t"
              style={{ borderColor: isDark ? 'rgba(139,92,246,0.2)' : '#e2e8f0' }}>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-2 rounded-xl outline-none"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
                    color: isDark ? '#fff' : '#0f172a',
                  }}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="px-6 py-2 rounded-xl flex items-center gap-2 disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(135deg,#8b5cf6,#6366f1)',
                    color: '#fff',
                  }}>
                  <Send size={18} />
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </form>
          </div>

          {/* Members Sidebar */}
          {showMembers && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="rounded-2xl p-6"
              style={{
                background: isDark ? 'rgba(15,12,31,0.9)' : '#ffffff',
                border: isDark ? '1px solid rgba(139,92,246,0.2)' : '1px solid #e2e8f0',
              }}>
              <h3 className="text-lg font-bold mb-4"
                style={{ color: isDark ? '#fff' : '#0f172a' }}>
                Members ({members.length})
              </h3>
              
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {members.map((member) => (
                  <div key={member._id} className="flex items-center gap-3">
                    {member.profileImage ? (
                      <img
                        src={member.profileImage}
                        alt={member.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)' }}>
                        <span className="text-white font-semibold">
                          {member.name[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-semibold text-sm"
                        style={{ color: isDark ? '#fff' : '#0f172a' }}>
                        {member.name}
                      </p>
                      <p className="text-xs"
                        style={{ color: isDark ? 'rgba(148,163,184,0.5)' : '#94a3b8' }}>
                        {member.role === 'mentor' ? 'Admin' : 'Student'} • {member.xp} XP
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
