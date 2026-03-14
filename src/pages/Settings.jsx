import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Save, User, Check, X, ZoomIn } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import Button from '../components/Button'
import Input from '../components/Input'

const SKILLS = ['Robotics', 'Programming', 'AI/ML', 'IoT', 'Electronics', 'Embedded Systems']

export default function Settings() {
  const { user, updateProfile, loading } = useAuthStore()
  const fileInputRef = useRef(null)

  const [formData, setFormData] = useState({
    name: user?.name || '',
    skills: user?.skills || [],
    profileImage: user?.profileImage || '',
  })
  const [preview, setPreview] = useState(user?.profileImage || '')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [zoomed, setZoomed] = useState(false)

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be under 2MB')
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result)
      setFormData(prev => ({ ...prev, profileImage: reader.result }))
    }
    reader.readAsDataURL(file)
  }

  const toggleSkill = (skill) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill],
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await updateProfile({
        name: formData.name,
        skills: formData.skills,
        profileImage: formData.profileImage,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError('Failed to save settings')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-6 sm:mb-8">Settings</h1>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">

            {/* Profile Photo */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold mb-4 text-gray-900 dark:text-white">Profile Photo</h2>
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                <div className="relative flex-shrink-0">
                  <div
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center cursor-pointer group"
                    onClick={() => preview && setZoomed(true)}
                  >
                    {preview ? (
                      <>
                        <img src={preview} alt="Profile" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                          <ZoomIn size={20} className="text-white" />
                        </div>
                      </>
                    ) : (
                      <span className="text-white text-2xl sm:text-3xl font-bold">
                        {user?.name?.charAt(0).toUpperCase() || <User size={28} />}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 w-7 h-7 sm:w-8 sm:h-8 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg transition"
                  >
                    <Camera size={13} />
                  </button>
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-2">
                    Upload a profile photo (max 2MB)
                  </p>
                  <div className="flex gap-2 justify-center sm:justify-start flex-wrap">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                      Choose Photo
                    </button>
                    {preview && (
                      <button
                        type="button"
                        onClick={() => { setPreview(''); setFormData(p => ({ ...p, profileImage: '' })) }}
                        className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-red-600 hover:text-red-700 border border-red-200 dark:border-red-800 rounded-lg transition"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Account Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold mb-4 text-gray-900 dark:text-white">Account Info</h2>
              <Input
                label="Full Name"
                type="text"
                value={formData.name}
                onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
              />
              <div className="mt-3">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <p className="px-3 sm:px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
                  {user?.email}
                </p>
              </div>
              <div className="mt-3">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                <p className="px-3 sm:px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400 text-xs sm:text-sm capitalize">
                  {user?.role}
                </p>
              </div>
            </div>

            {/* Skills */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold mb-1 text-gray-900 dark:text-white">
                {user?.role === 'mentor' ? 'Expertise / Streams' : 'Skills'}
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-3 sm:mb-4">Select all that apply</p>
              <div className="flex flex-wrap gap-2">
                {SKILLS.map(skill => {
                  const selected = formData.skills.includes(skill)
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium border transition ${
                        selected
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400'
                      }`}
                    >
                      {selected && <Check size={11} />}
                      {skill}
                    </button>
                  )
                })}
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-xs sm:text-sm">
                {error}
              </div>
            )}

            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
              {saved ? (
                <span className="flex items-center justify-center gap-2"><Check size={16} /> Saved!</span>
              ) : loading ? 'Saving...' : (
                <span className="flex items-center justify-center gap-2"><Save size={16} /> Save Changes</span>
              )}
            </Button>
          </form>
        </motion.div>
      </div>

      {/* Zoom Modal */}
      <AnimatePresence>
        {zoomed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setZoomed(false)}
          >
            <motion.div
              initial={{ scale: 0.7 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.7 }}
              className="relative w-full max-w-xs sm:max-w-sm"
              onClick={e => e.stopPropagation()}
            >
              <img
                src={preview}
                alt="Profile"
                className="w-full rounded-2xl shadow-2xl object-cover"
              />
              <button
                onClick={() => setZoomed(false)}
                className="absolute top-3 right-3 w-8 h-8 sm:w-9 sm:h-9 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition"
              >
                <X size={16} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
