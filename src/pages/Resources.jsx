import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { resourceAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'
import Card from '../components/Card'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Input from '../components/Input'
import { Link } from 'react-router-dom'
import { Download, Search } from 'lucide-react'

export default function Resources() {
  const { user } = useAuthStore()
  const [resources, setResources] = useState([])
  const [search, setSearch] = useState('')
  const [topic, setTopic] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const fetchResources = async () => {
      try {
        setLoading(true)
        let res
        if (search) {
          res = await resourceAPI.search(search)
        } else if (topic) {
          res = await resourceAPI.getByTopic(topic, page)
        } else {
          res = await resourceAPI.list(page, 10)
        }
        setResources(res.data.data || [])
        setTotal(res.data.total || 0)
      } catch (error) {
        console.error('Failed to fetch resources:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchResources()
  }, [page, search, topic])

  const topics = ['Robotics', 'Programming', 'Electronics', 'Mechanics', 'AI/ML']

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-4xl font-bold">Resources</h1>
            {user?.role === 'mentor' && (
              <Link to="/resources/upload">
                <Button variant="primary">Upload Resource</Button>
              </Link>
            )}
          </div>

          {/* Search and Filters */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <Input
                type="text"
                placeholder="Search resources..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="pl-10"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setTopic('')
                  setPage(1)
                }}
                className={`px-4 py-2 rounded-lg transition ${
                  !topic
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300'
                }`}
              >
                All
              </button>
              {topics.map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTopic(t)
                    setPage(1)
                  }}
                  className={`px-4 py-2 rounded-lg transition ${
                    topic === t
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Resources Grid */}
        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : resources.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resources.map((resource, index) => (
              <motion.div
                key={resource._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card>
                  <h3 className="font-bold text-lg mb-2 line-clamp-2">{resource.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                    {resource.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge>{resource.topic}</Badge>
                    {resource.tags?.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                      <Download size={16} />
                      <span>{resource.downloads} downloads</span>
                    </div>
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400 mb-4">No resources found</p>
            <Link to="/resources/upload">
              <Button variant="primary">Upload the first resource</Button>
            </Link>
          </Card>
        )}

        {/* Pagination */}
        {total > 10 && (
          <div className="flex justify-center gap-2 mt-8">
            <Button
              variant="secondary"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <span className="px-4 py-2">
              Page {page} of {Math.ceil(total / 10)}
            </span>
            <Button
              variant="secondary"
              disabled={page >= Math.ceil(total / 10)}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
