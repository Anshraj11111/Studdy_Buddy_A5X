import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { School, Plus, Users, MessageSquare, Clock, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useThemeStore } from '../store/themeStore';
import { useAuthStore } from '../store/authStore';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function SchoolChannelAdmin() {
  const { theme } = useThemeStore();
  const { user } = useAuthStore();
  const isDark = theme === 'dark';

  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    schoolName: '',
    city: '',
    description: '',
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/school-channel/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setChannels(response.data.data.channels);
    } catch (error) {
      console.error('Error fetching channels:', error);
      setError(error.response?.data?.error?.message || 'Failed to fetch channels');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChannel = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.schoolName || !formData.city) {
      setError('School name and city are required');
      return;
    }

    try {
      setCreating(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        `${API_URL}/api/school-channel/create`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess(`Channel created successfully for ${formData.schoolName}, ${formData.city}`);
      setFormData({ schoolName: '', city: '', description: '' });
      setShowCreateModal(false);
      fetchChannels();
      
      setTimeout(() => setSuccess(''), 5000);
    } catch (error) {
      console.error('Error creating channel:', error);
      setError(error.response?.data?.error?.message || 'Failed to create channel');
    } finally {
      setCreating(false);
    }
  };

  if (user?.role !== 'mentor') {
    return (
      <div className="min-h-screen" style={{ background: isDark ? '#0a0814' : '#f5f0ff' }}>
        <Navbar />
        <div className="container mx-auto px-4 py-12 text-center">
          <AlertCircle size={64} className="mx-auto mb-4 text-red-500" />
          <h2 className="text-2xl font-bold mb-2" style={{ color: isDark ? '#fff' : '#0f172a' }}>
            Access Denied
          </h2>
          <p style={{ color: isDark ? 'rgba(148,163,184,0.7)' : '#64748b' }}>
            Only admins/mentors can access this page.
          </p>
        </div>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen" style={{ background: isDark ? '#0a0814' : '#f5f0ff' }}>
      <Navbar />
      
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)' }}>
              <School size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold" style={{ color: isDark ? '#fff' : '#0f172a' }}>
                School Channels Management
              </h1>
              <p className="text-sm" style={{ color: isDark ? 'rgba(148,163,184,0.7)' : '#64748b' }}>
                Create and manage school channels
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 rounded-xl flex items-center gap-2 font-semibold transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', color: '#fff' }}>
            <Plus size={20} />
            Create Channel
          </button>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl flex items-center gap-3"
            style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)' }}>
            <CheckCircle size={20} className="text-green-500" />
            <p className="text-green-500">{success}</p>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl flex items-center gap-3"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <AlertCircle size={20} className="text-red-500" />
            <p className="text-red-500">{error}</p>
          </motion.div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="rounded-2xl p-6"
            style={{
              background: isDark ? 'rgba(15,12,31,0.9)' : '#ffffff',
              border: isDark ? '1px solid rgba(139,92,246,0.2)' : '1px solid #e2e8f0',
            }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm mb-1" style={{ color: isDark ? 'rgba(148,163,184,0.7)' : '#64748b' }}>
                  Total Channels
                </p>
                <p className="text-3xl font-bold" style={{ color: isDark ? '#fff' : '#0f172a' }}>
                  {channels.length}
                </p>
              </div>
              <School size={40} className="text-purple-500 opacity-50" />
            </div>
          </div>

          <div className="rounded-2xl p-6"
            style={{
              background: isDark ? 'rgba(15,12,31,0.9)' : '#ffffff',
              border: isDark ? '1px solid rgba(139,92,246,0.2)' : '1px solid #e2e8f0',
            }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm mb-1" style={{ color: isDark ? 'rgba(148,163,184,0.7)' : '#64748b' }}>
                  Total Members
                </p>
                <p className="text-3xl font-bold" style={{ color: isDark ? '#fff' : '#0f172a' }}>
                  {channels.reduce((sum, ch) => sum + (ch.stats?.totalMembers || 0), 0)}
                </p>
              </div>
              <Users size={40} className="text-blue-500 opacity-50" />
            </div>
          </div>

          <div className="rounded-2xl p-6"
            style={{
              background: isDark ? 'rgba(15,12,31,0.9)' : '#ffffff',
              border: isDark ? '1px solid rgba(139,92,246,0.2)' : '1px solid #e2e8f0',
            }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm mb-1" style={{ color: isDark ? 'rgba(148,163,184,0.7)' : '#64748b' }}>
                  Total Messages
                </p>
                <p className="text-3xl font-bold" style={{ color: isDark ? '#fff' : '#0f172a' }}>
                  {channels.reduce((sum, ch) => sum + (ch.stats?.totalMessages || 0), 0)}
                </p>
              </div>
              <MessageSquare size={40} className="text-green-500 opacity-50" />
            </div>
          </div>
        </div>

        {/* Channels List */}
        <div className="space-y-4">
          {channels.length === 0 ? (
            <div className="text-center py-12 rounded-2xl"
              style={{
                background: isDark ? 'rgba(15,12,31,0.9)' : '#ffffff',
                border: isDark ? '1px solid rgba(139,92,246,0.2)' : '1px solid #e2e8f0',
              }}>
              <School size={64} className="mx-auto mb-4 text-purple-500 opacity-50" />
              <p style={{ color: isDark ? 'rgba(148,163,184,0.7)' : '#64748b' }}>
                No channels created yet. Click "Create Channel" to get started.
              </p>
            </div>
          ) : (
            channels.map((channel) => (
              <motion.div
                key={channel._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-6"
                style={{
                  background: isDark ? 'rgba(15,12,31,0.9)' : '#ffffff',
                  border: isDark ? '1px solid rgba(139,92,246,0.2)' : '1px solid #e2e8f0',
                }}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)' }}>
                        <School size={24} className="text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold" style={{ color: isDark ? '#fff' : '#0f172a' }}>
                          {channel.schoolName}
                        </h3>
                        <p className="text-sm" style={{ color: isDark ? 'rgba(148,163,184,0.7)' : '#64748b' }}>
                          {channel.city}
                        </p>
                      </div>
                    </div>
                    
                    {channel.description && (
                      <p className="text-sm mb-4" style={{ color: isDark ? 'rgba(148,163,184,0.7)' : '#64748b' }}>
                        {channel.description}
                      </p>
                    )}

                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <Users size={16} style={{ color: '#8b5cf6' }} />
                        <span style={{ color: isDark ? 'rgba(148,163,184,0.7)' : '#64748b' }}>
                          {channel.stats?.totalMembers || 0} members
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MessageSquare size={16} style={{ color: '#8b5cf6' }} />
                        <span style={{ color: isDark ? 'rgba(148,163,184,0.7)' : '#64748b' }}>
                          {channel.stats?.totalMessages || 0} messages
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={16} style={{ color: '#8b5cf6' }} />
                        <span style={{ color: isDark ? 'rgba(148,163,184,0.7)' : '#64748b' }}>
                          {new Date(channel.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Create Channel Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => !creating && setShowCreateModal(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl p-8"
            style={{
              background: isDark ? 'rgba(15,12,31,0.98)' : '#ffffff',
              border: isDark ? '1px solid rgba(139,92,246,0.3)' : '1px solid #e2e8f0',
            }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold" style={{ color: isDark ? '#fff' : '#0f172a' }}>
                Create School Channel
              </h2>
              <button
                onClick={() => !creating && setShowCreateModal(false)}
                disabled={creating}
                className="p-2 rounded-lg hover:bg-opacity-80 transition-colors"
                style={{ background: isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9' }}>
                <Plus size={20} className="rotate-45" style={{ color: isDark ? '#fff' : '#0f172a' }} />
              </button>
            </div>

            <form onSubmit={handleCreateChannel} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2"
                  style={{ color: isDark ? 'rgba(148,163,184,0.9)' : '#64748b' }}>
                  School Name *
                </label>
                <input
                  type="text"
                  value={formData.schoolName}
                  onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                  placeholder="e.g., DPS, Ryan International"
                  className="w-full px-4 py-3 rounded-xl outline-none"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
                    color: isDark ? '#fff' : '#0f172a',
                    border: isDark ? '1px solid rgba(139,92,246,0.2)' : '1px solid #e2e8f0',
                  }}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2"
                  style={{ color: isDark ? 'rgba(148,163,184,0.9)' : '#64748b' }}>
                  City *
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="e.g., Delhi, Mumbai, Bangalore"
                  className="w-full px-4 py-3 rounded-xl outline-none"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
                    color: isDark ? '#fff' : '#0f172a',
                    border: isDark ? '1px solid rgba(139,92,246,0.2)' : '1px solid #e2e8f0',
                  }}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2"
                  style={{ color: isDark ? 'rgba(148,163,184,0.9)' : '#64748b' }}>
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the channel"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl outline-none resize-none"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
                    color: isDark ? '#fff' : '#0f172a',
                    border: isDark ? '1px solid rgba(139,92,246,0.2)' : '1px solid #e2e8f0',
                  }}
                />
              </div>

              {error && (
                <div className="p-3 rounded-xl text-sm flex items-center gap-2"
                  style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => !creating && setShowCreateModal(false)}
                  disabled={creating}
                  className="flex-1 px-6 py-3 rounded-xl font-semibold transition-all disabled:opacity-50"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9',
                    color: isDark ? '#fff' : '#0f172a',
                  }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                  style={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', color: '#fff' }}>
                  {creating ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={20} />
                      Create Channel
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
