import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Badge from '../components/Badge'

const XP_LEVELS = [
  { name: 'Beginner', min: 0, max: 99, color: 'bg-gray-400' },
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
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl font-bold mb-8">Profile</h1>

          {/* Profile Card */}
          <Card className="mb-8">
            <div className="flex items-center space-x-6 mb-6">
              <div className="w-20 h-20 bg-primary-500 rounded-full flex items-center justify-center overflow-hidden">
                {user?.profileImage ? (
                  <img src={user.profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-3xl font-bold">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold">{user?.name}</h2>
                <p className="text-gray-600 dark:text-gray-400">{user?.email}</p>
                {user?.address && (
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">📍 {user.address}</p>
                )}
                <Badge className="mt-2">{user?.role}</Badge>
              </div>
            </div>

            {/* Bio */}
            {user?.bio && (
              <p className="text-gray-700 dark:text-gray-300 text-sm mb-4 leading-relaxed border-l-4 border-primary-400 pl-3 italic">
                {user.bio}
              </p>
            )}

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">XP Points</p>
                <p className="text-2xl font-bold">{user?.xp || 0}</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Member Since</p>
                <p className="text-lg font-semibold">
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
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {level.name}
                    </span>
                    {nextLevel ? (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {xp} / {nextLevel.min} XP → {nextLevel.name}
                      </span>
                    ) : (
                      <span className="text-xs text-yellow-500 font-semibold">Max Level 🏆</span>
                    )}
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div
                      className={`${level.color} h-3 rounded-full transition-all duration-500`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )
            })()}

            {!isEditing && (
              <Button variant="primary" onClick={() => setIsEditing(true)}>
                Edit Profile
              </Button>
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
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Skills (comma-separated)
                  </label>
                  <textarea
                    name="skills"
                    value={formData.skills}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    rows="3"
                    placeholder="e.g., Robotics, Programming, Electronics"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Bio
                  </label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    maxLength={300}
                    rows="3"
                    placeholder="Tell others about yourself..."
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right">{formData.bio.length}/300</p>
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
                  <div className="p-3 bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-300 rounded-lg text-sm">
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
              <h3 className="text-xl font-bold mb-4">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {user.skills.map((skill) => (
                  <Badge key={skill} variant="secondary">
                    {skill}
                  </Badge>
                ))}
              </div>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  )
}
