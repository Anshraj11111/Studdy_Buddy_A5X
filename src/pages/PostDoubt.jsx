import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { doubtAPI } from '../services/api'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'

export default function PostDoubt() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    topic: 'Robotics',
    tags: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const topics = ['Robotics', 'Programming', 'Electronics', 'Mechanics', 'AI/ML']

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.title || !formData.description) {
      setError('Title and description are required')
      return
    }

    try {
      setLoading(true)
      const response = await doubtAPI.create({
        ...formData,
        tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
      })
      
      // Check if a match was found - backend returns { success, data: { doubt, room, matched } }
      const { matched, room } = response.data.data
      
      if (matched && room) {
        // Show match notification with options
        const goToChat = window.confirm(
          `🎉 Great news! We found a match!\n\nAnother student has a similar doubt about ${formData.topic}.\n\nClick OK to start chatting, or Cancel to view your doubts.`
        )
        
        if (goToChat) {
          navigate(`/chat/${room._id}`)
        } else {
          navigate('/doubts')
        }
      } else {
        // No match found, go to doubts page
        alert('✅ Doubt posted successfully! We\'ll notify you when we find a match.')
        navigate('/doubts')
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to post doubt')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl font-bold mb-8">Post a Doubt</h1>

          <Card>
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label="Title"
                type="text"
                name="title"
                placeholder="What's your doubt about?"
                value={formData.title}
                onChange={handleChange}
              />

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Description
                </label>
                <textarea
                  name="description"
                  placeholder="Describe your doubt in detail..."
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows="6"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Topic
                </label>
                <select
                  name="topic"
                  value={formData.topic}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {topics.map((topic) => (
                    <option key={topic} value={topic}>
                      {topic}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Tags (comma-separated)"
                type="text"
                name="tags"
                placeholder="e.g., beginner, help, urgent"
                value={formData.tags}
                onChange={handleChange}
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
                  size="lg"
                  disabled={loading}
                >
                  {loading ? 'Posting...' : 'Post Doubt'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  onClick={() => navigate('/doubts')}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
