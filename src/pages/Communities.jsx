import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { communityAPI } from '../services/api'
import Card from '../components/Card'
import Badge from '../components/Badge'
import Button from '../components/Button'
import { Link } from 'react-router-dom'
import { Users } from 'lucide-react'

export default function Communities() {
  const [communities, setCommunities] = useState([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        setLoading(true)
        const res = await communityAPI.list(page, 12)
        setCommunities(res.data.data || [])
        setTotal(res.data.total || 0)
      } catch (error) {
        console.error('Failed to fetch communities:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCommunities()
  }, [page])

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-4xl font-bold">Communities</h1>
            <Link to="/communities/new">
              <Button variant="primary">Create Community</Button>
            </Link>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Join communities to collaborate with peers and mentors
          </p>
        </motion.div>

        {/* Communities Grid */}
        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : communities.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {communities.map((community, index) => (
              <motion.div
                key={community._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="flex flex-col h-full">
                  <div className="mb-4">
                    {community.icon && (
                      <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center mb-3">
                        <span className="text-2xl">{community.icon}</span>
                      </div>
                    )}
                    <h3 className="font-bold text-lg mb-2">{community.name}</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                      {community.description}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 mb-4 text-sm text-gray-600 dark:text-gray-400">
                    <Users size={16} />
                    <span>{community.memberCount} members</span>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge>{community.topic}</Badge>
                    {community.isPublic && <Badge variant="success">Public</Badge>}
                  </div>

                  <div className="mt-auto">
                    <Link to={`/communities/${community._id}`} className="w-full">
                      <Button variant="primary" className="w-full">
                        View Community
                      </Button>
                    </Link>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400 mb-4">No communities found</p>
            <Link to="/communities/new">
              <Button variant="primary">Create the first community</Button>
            </Link>
          </Card>
        )}

        {/* Pagination */}
        {total > 12 && (
          <div className="flex justify-center gap-2 mt-8">
            <Button
              variant="secondary"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <span className="px-4 py-2">
              Page {page} of {Math.ceil(total / 12)}
            </span>
            <Button
              variant="secondary"
              disabled={page >= Math.ceil(total / 12)}
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
