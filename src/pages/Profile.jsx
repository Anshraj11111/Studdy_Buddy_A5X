import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Badge from '../components/Badge'
import { referralAPI } from '../services/api'
import axios from 'axios'
import { Heart, MessageCircle, Trash2, Edit2 } from 'lucide-react'

const XP_LEVELS = [
  { name: 'Beginner', min: 0, max: 99, color: 'bg-slate-500' },
  { name: 'Intermediate', min: 100, max: 299, color: 'bg-blue-500' },
  { name: 'Expert', min: 300, max: 699, color: 'bg-purple-500' },
  { name: 'Master', min: 700, max: Infinity, color: 'bg-yellow-500' },
]

const getLevel = (xp) => XP_LEVELS.find(l => xp >= l.min && xp <= l.max) || XP_LEVELS[0]

const getProgress = (xp) => {
  const level = getLevel(xp)
  if (level.max === Infinity) return 100
  const range = level.max - level.min + 1
  const progress = xp - level.min
  return Math.round((progress / range) * 100)
}

export default function Profile() {
  const { user, updateProfile, loading } = useAuthStore()
  const [isEditing, setIsEditing] = useState(false)
  const [referralStats, setReferralStats] = useState(null)
  const [codeCopied, setCodeCopied] = useState(false)
  const [referralLoading, setReferralLoading] = useState(false)
  const [recentPosts, setRecentPosts] = useState([])
  const [postsLoading, setPostsLoading] = useState(true)
  const [postsPage, setPostsPage] = useState(1)
  const [postsHasMore, setPostsHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  // Fetch referral info on first render
  useState(() => {
    const fetchReferral = async () => {
      setReferralLoading(true)
      try {
        const res = await referralAPI.getMyCode()
        if (res.data?.success) setReferralStats(res.data.data)
      } catch { /* ignore */ }
      finally { setReferralLoading(false) }
    }
    fetchReferral()
  }, [])

  // Fetch recent posts
  useEffect(() => {
    const fetchRecentPosts = async () => {
      if (!user?._id) return
      setPostsLoading(true)
      try {
        const token = localStorage.getItem('token')
        const res = await axios.get(`/api/feed?userId=${user._id}&page=1&limit=20`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.data?.success) {
          const posts = res.data.data.posts || []
          const total = res.data.data.pagination?.total || 0
          setRecentPosts(posts)
          setPostsHasMore(posts.length < total)
          setPostsPage(1)
        }
      } catch (err) {
        console.error('Failed to fetch posts:', err)
      } finally {
        setPostsLoading(false)
      }
    }
    fetchRecentPosts()
  }, [user?._id])

  // Load more posts
  const loadMorePosts = async () => {
    if (!user?._id || loadingMore || !postsHasMore) return
    setLoadingMore(true)
    try {
      const token = localStorage.getItem('token')
      const nextPage = postsPage + 1
      const res = await axios.get(`/api/feed?userId=${user._id}&page=${nextPage}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data?.success) {
        const newPosts = res.data.data.posts || []
        const total = res.data.data.pagination?.total || 0
        setRecentPosts(prev => [...prev, ...newPosts])
        setPostsPage(nextPage)
        setPostsHasMore(recentPosts.length + newPosts.length < total)
      }
    } catch (err) {
      console.error('Failed to load more posts:', err)
    } finally {
      setLoadingMore(false)
    }
  }
  const [formData, setFormData] = useState({
    name: user?.name || '',
    skills: user?.skills?.join(', ') || '',
    bio: user?.bio || '',
    address: user?.address || '',
  })
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await updateProfile({
        name: formData.name,
        skills: formData.skills.split(',').map((s) => s.trim()).filter(Boolean),
        bio: formData.bio,
        address: formData.address,
      })
      setIsEditing(false)
      setError('')
    } catch (err) {
      setError('Failed to update profile')
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl font-bold mb-8 text-theme-primary">Profile</h1>

          {/* Profile Card */}
          <Card className="mb-8">
            <div className="flex items-center space-x-6 mb-6">
              <div className="w-20 h-20 bg-primary-500 rounded-full flex items-center justify-center overflow-hidden">
                {user?.profileImage ? (
                  <img src={user.profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-theme-primary text-3xl font-bold">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-theme-primary">{user?.name}</h2>
                <p className="text-theme-tertiary">{user?.email}</p>
                {user?.address && (
                  <p className="text-theme-muted text-sm mt-0.5">📍 {user.address}</p>
                )}
                <Badge className="mt-2">{user?.role}</Badge>
              </div>
            </div>

            {/* Bio */}
            {user?.bio && (
              <p className="text-theme-secondary text-sm mb-4 leading-relaxed border-l-4 border-primary-400 pl-3 italic">
                {user.bio}
              </p>
            )}

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-theme-tertiary text-sm">XP Points</p>
                <p className="text-2xl font-bold text-theme-primary">{user?.xp || 0}</p>
              </div>
              <div>
                <p className="text-theme-tertiary text-sm">Member Since</p>
                <p className="text-lg font-semibold text-theme-primary">
                  {new Date(user?.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* XP Level + Progress Bar */}
            {(() => {
              const xp = user?.xp || 0
              const level = getLevel(xp)
              const progress = getProgress(xp)
              const nextLevel = XP_LEVELS[XP_LEVELS.indexOf(level) + 1]
              return (
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-semibold text-theme-secondary">
                      {level.name}
                    </span>
                    {nextLevel ? (
                      <span className="text-xs text-theme-tertiary">
                        {xp} / {nextLevel.min} XP → {nextLevel.name}
                      </span>
                    ) : (
                      <span className="text-xs text-yellow-500 font-semibold">Max Level 🏆</span>
                    )}
                  </div>
                  <div className="w-full rounded-full h-3" style={{ background: 'var(--input-border)' }}>
                    <div
                      className={`${level.color} h-3 rounded-full transition-all duration-500`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )
            })()}

            {!isEditing && (
              <>
                {/* Referral Code Card */}
                {(referralStats || user?.referralCode) && (
                  <div className="mb-4 rounded-xl p-4" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.12) 100%)', border: '1px solid rgba(99,102,241,0.25)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-base">🎁</span>
                      <p className="text-sm font-bold text-theme-primary">Your Referral Code</p>
                    </div>
                    <p className="text-[11px] text-theme-tertiary mb-3 leading-relaxed">
                      Share this code with friends. They get <span className="font-bold text-indigo-400">10% off</span> their course purchase, and you earn <span className="font-bold text-indigo-400">+50 XP</span> when their payment is approved.
                    </p>
                    {/* Code display + copy */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex-1 px-3 py-2 rounded-lg font-mono font-bold text-sm tracking-widest text-center"
                        style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: 'var(--text-primary)', letterSpacing: '0.15em' }}>
                        {referralStats?.referralCode || user?.referralCode || '---'}
                      </div>
                      <button
                        onClick={async () => {
                          const code = referralStats?.referralCode || user?.referralCode
                          if (code) {
                            await navigator.clipboard.writeText(code)
                            setCodeCopied(true)
                            setTimeout(() => setCodeCopied(false), 2000)
                          }
                        }}
                        className="px-3 py-2 rounded-lg text-xs font-bold transition"
                        style={{
                          background: codeCopied ? 'rgba(22,163,74,0.2)' : 'rgba(99,102,241,0.2)',
                          border: `1px solid ${codeCopied ? 'rgba(22,163,74,0.4)' : 'rgba(99,102,241,0.4)'}`,
                          color: codeCopied ? '#16a34a' : '#818cf8',
                        }}
                      >
                        {codeCopied ? '✓ Copied!' : 'Copy'}
                      </button>
                    </div>
                    {/* Stats row */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg px-3 py-2 text-center"
                        style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                        <p className="text-lg font-bold" style={{ color: '#818cf8' }}>
                          {referralStats?.referralsMade ?? user?.referralsMade ?? 0}
                        </p>
                        <p className="text-[10px] text-theme-tertiary">Referrals Made</p>
                      </div>
                      <div className="rounded-lg px-3 py-2 text-center"
                        style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                        <p className="text-lg font-bold" style={{ color: '#fbbf24' }}>
                          +{referralStats?.xpEarned ?? ((user?.referralsMade || 0) * 50)}
                        </p>
                        <p className="text-[10px] text-theme-tertiary">XP Earned</p>
                      </div>
                    </div>
                  </div>
                )}

                <Button variant="primary" onClick={() => setIsEditing(true)}>
                  Edit Profile
                </Button>
              </>
            )}
          </Card>

          {/* Edit Form */}
          {isEditing && (
            <Card>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                />

                <div>
                  <label className="block text-sm font-medium mb-2 text-theme-secondary">
                    Skills (comma-separated)
                  </label>
                  <textarea
                    name="skills"
                    value={formData.skills}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-theme-primary placeholder-theme-muted"
                    style={{ 
                      borderColor: 'var(--input-border)', 
                      background: 'var(--input-bg)' 
                    }}
                    rows="3"
                    placeholder="e.g., Robotics, Programming, Electronics"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-theme-secondary">
                    Bio
                  </label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    maxLength={300}
                    rows="3"
                    placeholder="Tell others about yourself..."
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none text-theme-primary placeholder-theme-muted"
                    style={{ 
                      borderColor: 'var(--input-border)', 
                      background: 'var(--input-bg)' 
                    }}
                  />
                  <p className="text-xs text-theme-tertiary mt-1 text-right">{formData.bio.length}/300</p>
                </div>

                <Input
                  label="Address / Location"
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="e.g., Mumbai, India"
                />

                {error && (
                  <div className="p-3 rounded-lg text-sm" style={{ 
                    background: 'var(--bg-card)', 
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.3)'
                  }}>
                    {error}
                  </div>
                )}

                <div className="flex gap-4">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Skills */}
          {user?.skills && user.skills.length > 0 && (
            <Card className="mt-8">
              <h3 className="text-xl font-bold mb-4 text-theme-primary">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {user.skills.map((skill) => (
                  <Badge key={skill} variant="secondary">
                    {skill}
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          {/* Recent Posts */}
          <Card className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-theme-primary">My Posts</h3>
              {recentPosts.length > 0 && (
                <span className="text-sm text-theme-tertiary">
                  {recentPosts.length} post{recentPosts.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            {postsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
              </div>
            ) : recentPosts.length > 0 ? (
              <>
                <div className="space-y-3">
                  {recentPosts.map((post) => (
                    <motion.div
                      key={post._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-lg border transition-all hover:shadow-md cursor-pointer relative group"
                      style={{ 
                        background: 'var(--bg-secondary)', 
                        borderColor: 'var(--border-primary)' 
                      }}
                    >
                      {/* Edit and Delete buttons */}
                      <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Navigate to edit (for now, we'll use a simple approach)
                            const newContent = prompt('Edit your post:', post.content);
                            if (newContent && newContent.trim() && newContent !== post.content) {
                              // Update post via API
                              const token = localStorage.getItem('token');
                              axios.put(`/api/feed/${post._id}`, { content: newContent.trim() }, {
                                headers: { Authorization: `Bearer ${token}` }
                              })
                              .then(() => {
                                // Refresh posts
                                setRecentPosts(prev => prev.map(p => 
                                  p._id === post._id ? { ...p, content: newContent.trim() } : p
                                ));
                                alert('Post updated successfully!');
                              })
                              .catch(err => {
                                alert(err.response?.data?.error?.message || 'Failed to update post');
                              });
                            }
                          }}
                          className="p-2 rounded-lg transition-colors"
                          style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}
                          title="Edit post"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Delete this post?')) {
                              const token = localStorage.getItem('token');
                              axios.delete(`/api/feed/${post._id}`, {
                                headers: { Authorization: `Bearer ${token}` }
                              })
                              .then(() => {
                                setRecentPosts(prev => prev.filter(p => p._id !== post._id));
                                alert('Post deleted successfully!');
                              })
                              .catch(() => {
                                alert('Failed to delete post');
                              });
                            }
                          }}
                          className="p-2 rounded-lg transition-colors"
                          style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
                          title="Delete post"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <p className="text-sm text-theme-primary mb-3 break-words whitespace-pre-wrap pr-20">
                        {post.content}
                      </p>
                      {post.mediaUrl && (
                        <div className="mb-3 rounded-lg overflow-hidden">
                          {post.mediaType === 'video' ? (
                            <video src={post.mediaUrl} controls className="w-full max-h-64 object-contain" />
                          ) : (
                            <img src={post.mediaUrl} alt="Post media" className="w-full max-h-64 object-contain" />
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-xs text-theme-tertiary">
                        <span className="flex items-center gap-1">
                          <Heart size={14} />
                          {post.likes?.length || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle size={14} />
                          {post.comments?.length || 0}
                        </span>
                        {post.category && post.category !== 'All' && (
                          <span className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
                            {post.category}
                          </span>
                        )}
                        <span className="ml-auto">
                          {new Date(post.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
                
                {/* Load More Button */}
                {postsHasMore && (
                  <div className="mt-4 flex justify-center">
                    <Button
                      onClick={loadMorePosts}
                      disabled={loadingMore}
                      variant="secondary"
                      className="flex items-center gap-2"
                    >
                      {loadingMore ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></div>
                          Loading...
                        </>
                      ) : (
                        'Load More Posts'
                      )}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-theme-tertiary text-sm">No posts yet</p>
                <p className="text-theme-muted text-xs mt-1">Share your first post in Communities!</p>
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
