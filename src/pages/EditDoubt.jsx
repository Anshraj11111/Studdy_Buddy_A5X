import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { doubtAPI } from '../services/api'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'

export default function EditDoubt() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    topic: '',
    tags: '',
  })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchDoubt = async () => {
      try {
        const res = await doubtAPI.getById(id)
        const doubt = res.data.data.doubt
        setFormData({
          title: doubt.title,
          description: doubt.description,
          topic: doubt.topic,
          tags: doubt.tags?.join(', ') || '',
        })
      } catch (err) {
        setError('Failed to load doubt')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchDoubt()
  }, [id])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const tags = formData.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag)

      await doubtAPI.update(id, {
        title: formData.title,
        description: formData.description,
        topic: formData.topic,
        tags,
      })

      navigate('/doubts')
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to update doubt')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading doubt...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl font-bold mb-8">Edit Doubt</h1>

          <Card>
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label="Title"
                type="text"
                placeholder="What's your doubt?"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />

              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows="6"
                  placeholder="Describe your doubt in detail..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Topic</label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  required
                >
                  <option value="">Select a topic</option>
                  <option value="Robotics">Robotics</option>
                  <option value="Programming">Programming</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Mechanics">Mechanics</option>
                  <option value="AI/ML">AI/ML</option>
                </select>
              </div>

              <Input
                label="Tags (comma separated)"
                type="text"
                placeholder="python, beginner, help"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-300 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex gap-4">
                <Button type="submit" variant="primary" disabled={submitting} className="flex-1">
                  {submitting ? 'Updating...' : 'Update Doubt'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate('/doubts')}
                  className="flex-1"
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
