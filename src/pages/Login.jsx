import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import Button from '../components/Button'
import Input from '../components/Input'

export default function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'student',
    mentorCode: '',
  })
  const [errors, setErrors] = useState({})
  const { login, loading } = useAuthStore()
  const navigate = useNavigate()

  const validate = () => {
    const newErrors = {}
    if (!formData.email) newErrors.email = 'Email is required'
    if (!formData.password) newErrors.password = 'Password is required'
    if (formData.role === 'mentor' && !formData.mentorCode) {
      newErrors.mentorCode = 'Mentor code is required'
    }
    return newErrors
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})
    
    const newErrors = validate()
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      const { user } = await login(formData.email, formData.password, formData.role, formData.mentorCode)
      // Navigate based on role
      if (user.role === 'mentor') {
        navigate('/mentor-dashboard', { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
    } catch (err) {
      setErrors({ submit: err.message || 'Login failed' })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-primary-500 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-xl">SB</span>
            </div>
            <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
            <p className="text-gray-600 dark:text-gray-400">Sign in to your Studdy Buddy account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              name="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
            />

            <Input
              label="Password"
              type="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
            />

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                I am a
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="student">Student</option>
                <option value="mentor">Mentor</option>
              </select>
            </div>

            {/* Mentor Code Field - Only show if role is mentor */}
            {formData.role === 'mentor' && (
              <Input
                label="Mentor Code"
                type="text"
                name="mentorCode"
                placeholder="Enter your mentor code"
                value={formData.mentorCode}
                onChange={handleChange}
                error={errors.mentorCode}
              />
            )}

            {errors.submit && (
              <div className="p-3 bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-300 rounded-lg text-sm">
                {errors.submit}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary-500 hover:text-primary-600 font-medium">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
