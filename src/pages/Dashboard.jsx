import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import { doubtAPI, communityAPI } from '../services/api'
import Card from '../components/Card'
import Badge from '../components/Badge'
import Button from '../components/Button'
import { Link } from 'react-router-dom'
import { MessageSquare, Users, BookOpen, Zap, TrendingUp, Award } from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuthStore()
  const [doubts, setDoubts] = useState([])
  const [communities, setCommunities] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch user's own doubts and communities
        const [doubtsRes, communitiesRes] = await Promise.all([
          doubtAPI.list(1, 100), // Get more to filter
          communityAPI.list(1, 5),
        ])
        // Backend returns { success, data: { doubts, pagination } }
        const allDoubts = doubtsRes.data.data?.doubts || []
        // Filter to show only user's own doubts
        const userDoubts = allDoubts.filter(d => 
          user && (d.userId === user._id || d.userId?._id === user._id || String(d.userId) === String(user._id))
        ).slice(0, 5) // Take only first 5
        
        setDoubts(userDoubts)
        setCommunities(communitiesRes.data.data?.communities || [])
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchData()
    }
  }, [user])

  const stats = [
    { icon: MessageSquare, label: 'Doubts', value: doubts.length, color: 'bg-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-900/20' },
    { icon: Users, label: 'Communities', value: communities.length, color: 'bg-purple-500', bgColor: 'bg-purple-50 dark:bg-purple-900/20' },
    { icon: BookOpen, label: 'Resources', value: 0, color: 'bg-green-500', bgColor: 'bg-green-50 dark:bg-green-900/20' },
    { icon: Zap, label: 'XP Points', value: user?.xp || 0, color: 'bg-yellow-500', bgColor: 'bg-yellow-50 dark:bg-yellow-900/20' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section with Gradient */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                Welcome back, {user?.name || 'Student'}! 👋
              </h1>
              <p className="text-blue-100 text-lg">
                Ready to learn something new today?
              </p>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <div className="text-center">
                <div className="text-3xl font-bold">{user?.xp || 0}</div>
                <div className="text-sm text-blue-100">XP Points</div>
              </div>
              <Award className="w-16 h-16 text-yellow-300" />
            </div>
          </div>
        </motion.div>

        {/* Stats Grid with Better Colors */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`${stat.bgColor} border-none shadow-lg hover:shadow-xl transition-shadow`}>
                  <div className="flex items-center space-x-4">
                    <div className={`p-4 rounded-xl ${stat.color} shadow-md`}>
                      <Icon className="text-white" size={28} />
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">{stat.label}</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>

        {/* Quick Actions with Gradient Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to="/doubts/new" className="transform hover:scale-105 transition-transform">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl p-6 shadow-lg">
                <MessageSquare className="mb-3" size={32} />
                <h3 className="text-xl font-bold mb-1">Post a Doubt</h3>
                <p className="text-blue-100 text-sm">Get help from the community</p>
              </div>
            </Link>
            <Link to="/resources" className="transform hover:scale-105 transition-transform">
              <div className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl p-6 shadow-lg">
                <BookOpen className="mb-3" size={32} />
                <h3 className="text-xl font-bold mb-1">Browse Resources</h3>
                <p className="text-green-100 text-sm">Find study materials</p>
              </div>
            </Link>
            <Link to="/communities" className="transform hover:scale-105 transition-transform">
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl p-6 shadow-lg">
                <Users className="mb-3" size={32} />
                <h3 className="text-xl font-bold mb-1">Join Community</h3>
                <p className="text-purple-100 text-sm">Connect with peers</p>
              </div>
            </Link>
          </div>
        </motion.div>

        {/* Recent Doubts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <TrendingUp className="mr-2 text-blue-500" size={28} />
              Recent Doubts
            </h2>
            <Link to="/doubts" className="text-blue-600 hover:text-blue-700 font-medium">
              View all →
            </Link>
          </div>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : doubts.length > 0 ? (
            <div className="space-y-4">
              {doubts.map((doubt) => (
                <Link key={doubt._id} to={`/doubts/${doubt._id}`}>
                  <Card className="hover:shadow-lg transition-shadow border-l-4 border-blue-500 cursor-pointer">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white hover:text-blue-600 transition">{doubt.title}</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{doubt.description}</p>
                        <div className="flex flex-wrap gap-2">
                          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">{doubt.topic}</Badge>
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">{doubt.status}</Badge>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="text-center py-12 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 border-2 border-dashed border-blue-300 dark:border-blue-700">
              <MessageSquare className="mx-auto mb-4 text-blue-400" size={48} />
              <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">No doubts yet. Start by posting one!</p>
              <Link to="/doubts/new">
                <Button variant="primary" className="mt-4">Post Your First Doubt</Button>
              </Link>
            </Card>
          )}
        </motion.div>

        {/* Communities */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <Users className="mr-2 text-purple-500" size={28} />
              Your Communities
            </h2>
            <Link to="/communities" className="text-purple-600 hover:text-purple-700 font-medium">
              View all →
            </Link>
          </div>
          {communities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {communities.map((community) => (
                <Card key={community._id} className="hover:shadow-lg transition-shadow bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-700">
                  <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">{community.name}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                    {community.description}
                  </p>
                  <div className="flex justify-between items-center">
                    <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                      {community.memberCount} members
                    </Badge>
                    <Link to={`/communities/${community._id}`}>
                      <Button variant="outline" size="sm" className="border-purple-500 text-purple-600 hover:bg-purple-50">
                        View
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center py-12 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 border-2 border-dashed border-purple-300 dark:border-purple-700">
              <Users className="mx-auto mb-4 text-purple-400" size={48} />
              <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">
                Join communities to collaborate with others!
              </p>
              <Link to="/communities">
                <Button variant="primary" className="mt-4 bg-purple-600 hover:bg-purple-700">Explore Communities</Button>
              </Link>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  )
}
