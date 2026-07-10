import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Youtube, Play, Square, Loader2, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { YouTubeLivePlayerSimple } from '../components/YouTubeLivePlayer';

const API_URL = (() => {
  const base = import.meta.env.VITE_API_URL || "https://studdy-buddy-backend-a5x.onrender.com";
  if (base.endsWith('/api')) return base;
  if (base.endsWith('/')) return base + 'api';
  return base + '/api';
})();

const CHANNELS = [
  { id: 'robotics', name: 'Robotics', icon: '🤖', color: '#6366f1' },
  { id: 'aiml', name: 'AI & ML', icon: '🧠', color: '#8b5cf6' },
  { id: 'electronics', name: 'Electronics', icon: '⚡', color: '#3b82f6' },
  { id: 'renewable_energy', name: 'Renewable Energy', icon: '🌱', color: '#10b981' },
];

export default function BroadcastLive() {
  const [streams, setStreams] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState(null);

  useEffect(() => {
    loadAllStreams();
  }, []);

  const loadAllStreams = async () => {
    try {
      const token = localStorage.getItem('token');
      const promises = CHANNELS.map(ch =>
        axios.get(`${API_URL}/broadcast/stream/${ch.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      );
      
      const results = await Promise.all(promises);
      const streamsData = {};
      results.forEach((res, idx) => {
        streamsData[CHANNELS[idx].id] = res.data.data;
      });
      
      setStreams(streamsData);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load streams:', err);
      setLoading(false);
    }
  };

  const updateStream = async (channel, videoId, title) => {
    try {
      await axios.put(
        `${API_URL}/broadcast/admin/stream/${channel}`,
        { youtubeVideoId: videoId, streamTitle: title },
        { headers: { 'x-admin-secret': import.meta.env.VITE_ADMIN_SECRET || 'H5' } }
      );
      await loadAllStreams();
      alert('Stream URL updated!');
    } catch (err) {
      alert('Failed to update stream');
    }
  };

  const toggleLive = async (channel, currentStatus) => {
    try {
      const endpoint = currentStatus 
        ? `/broadcast/admin/stream/${channel}/stop`
        : `/broadcast/admin/stream/${channel}/start`;
        
      await axios.post(
        `${API_URL}${endpoint}`,
        {},
        { headers: { 'x-admin-secret': import.meta.env.VITE_ADMIN_SECRET || 'H5' } }
      );
      await loadAllStreams();
    } catch (err) {
      alert('Failed to toggle stream');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            📺 Live Broadcast Management
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Manage YouTube Live streams for unlimited viewers
          </p>
        </div>

        {/* Channel Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {CHANNELS.map((channel) => {
            const stream = streams[channel.id];
            const isLive = stream?.isLive;

            return (
              <motion.div
                key={channel.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl p-6 shadow-lg"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}
              >
                {/* Channel Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                      style={{ background: `${channel.color}20` }}
                    >
                      {channel.icon}
                    </div>
                    <div>
                      <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>
                        {channel.name}
                      </h3>
                      {isLive && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-500 text-white">
                          🔴 LIVE
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stream Setup Form */}
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>
                      YouTube Video ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., dQw4w9WgXcQ"
                      defaultValue={stream?.youtubeVideoId || ''}
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-primary)',
                        color: 'var(--text-primary)'
                      }}
                      onBlur={(e) => {
                        if (e.target.value !== stream?.youtubeVideoId) {
                          updateStream(channel.id, e.target.value, stream?.streamTitle || '');
                        }
                      }}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>
                      Stream Title (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Today's Lecture"
                      defaultValue={stream?.streamTitle || ''}
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-primary)',
                        color: 'var(--text-primary)'
                      }}
                      onBlur={(e) => {
                        if (stream?.youtubeVideoId) {
                          updateStream(channel.id, stream.youtubeVideoId, e.target.value);
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Live Control Button */}
                <button
                  onClick={() => toggleLive(channel.id, isLive)}
                  disabled={!stream?.youtubeVideoId}
                  className="w-full py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-all"
                  style={{
                    background: isLive ? '#ef4444' : channel.color,
                    color: '#fff',
                    opacity: stream?.youtubeVideoId ? 1 : 0.5,
                    cursor: stream?.youtubeVideoId ? 'pointer' : 'not-allowed'
                  }}
                >
                  {isLive ? (
                    <>
                      <Square size={16} />
                      Stop Stream
                    </>
                  ) : (
                    <>
                      <Play size={16} />
                      Start Stream
                    </>
                  )}
                </button>

                {/* Preview Button */}
                {stream?.youtubeVideoId && (
                  <button
                    onClick={() => setSelectedChannel(channel.id)}
                    className="w-full mt-2 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                    style={{
                      background: 'var(--bg-primary)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-primary)'
                    }}
                  >
                    <Youtube size={16} />
                    Preview Stream
                  </button>
                )}

                {/* Stream Info */}
                {isLive && (
                  <div className="mt-3 p-3 rounded-lg" style={{ background: 'var(--bg-primary)' }}>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      Viewers: <span className="font-bold">{stream.viewerCount || 0}</span>
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      Started: {new Date(stream.startedAt).toLocaleTimeString()}
                    </p>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Preview Modal */}
        {selectedChannel && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.8)' }}
            onClick={() => setSelectedChannel(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-4xl rounded-xl overflow-hidden"
              style={{ background: 'var(--bg-secondary)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b" style={{ borderColor: 'var(--border-primary)' }}>
                <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>
                  {CHANNELS.find(ch => ch.id === selectedChannel)?.name} - Preview
                </h3>
              </div>
              <div className="aspect-video">
                <YouTubeLivePlayerSimple 
                  videoId={streams[selectedChannel]?.youtubeVideoId}
                  autoplay={true}
                />
              </div>
              <div className="p-4">
                <button
                  onClick={() => setSelectedChannel(null)}
                  className="w-full py-2 rounded-lg font-medium"
                  style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 p-6 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
          <h3 className="font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <AlertCircle size={20} />
            How to Setup YouTube Live
          </h3>
          <ol className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <li>1. Go to YouTube Studio → "Go Live"</li>
            <li>2. Start your stream with OBS/Streamlabs</li>
            <li>3. Copy the video ID from YouTube URL (e.g., youtube.com/watch?v=<strong>dQw4w9WgXcQ</strong>)</li>
            <li>4. Paste the video ID above and click "Start Stream"</li>
            <li>5. Students will see the stream embedded in Studdy Buddy app!</li>
            <li>
              <strong>Note:</strong> Students watch inside the app, they never leave to YouTube! ✅
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
