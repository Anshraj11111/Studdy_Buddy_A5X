import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MessageCircle, Users, Bot } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function CallEndFeedbackModal({ isOpen, onClose, roomId, otherUser }) {
  const [step, setStep] = useState(1) // 1: doubt cleared?, 2: options
  const navigate = useNavigate()

  const handleDoubtCleared = () => {
    // Doubt clear ho gaya
    onClose()
    navigate('/doubts')
  }

  const handleDoubtNotCleared = () => {
    // Show options
    setStep(2)
  }

  const handleConnectToMentor = () => {
    // Auto-match with available mentor
    onClose()
    navigate('/mentors?autoMatch=true')
  }

  const handleFindMentor = () => {
    // Browse mentor list
    onClose()
    navigate('/mentors')
  }

  const handleTalkToAI = () => {
    // Open AI bot chat
    onClose()
    navigate('/ai-bot')
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
          >
            <X size={20} className="text-gray-600 dark:text-gray-400" />
          </button>

          {step === 1 ? (
            // Step 1: Doubt cleared?
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle size={32} className="text-white" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Call Ended
              </h2>
              
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Kya aapka doubt clear ho gaya?
              </p>

              <div className="flex gap-3">
                <button
                  onClick={handleDoubtCleared}
                  className="flex-1 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition"
                >
                  ✓ Haan, Clear Ho Gaya
                </button>
                <button
                  onClick={handleDoubtNotCleared}
                  className="flex-1 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition"
                >
                  ✗ Nahi, Abhi Bhi Doubt Hai
                </button>
              </div>
            </div>
          ) : (
            // Step 2: Options
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">
                Koi Baat Nahi!
              </h2>
              
              <p className="text-gray-600 dark:text-gray-400 mb-6 text-center">
                Aap in options se apna doubt clear kar sakte ho:
              </p>

              <div className="space-y-3">
                {/* Connect to Mentor - Auto Match */}
                <button
                  onClick={handleConnectToMentor}
                  className="w-full p-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl transition flex items-center gap-3 group"
                >
                  <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center group-hover:scale-110 transition">
                    <Users size={24} />
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-bold text-lg">Connect to Mentor</div>
                    <div className="text-sm opacity-90">Auto-match with available mentor</div>
                  </div>
                </button>

                {/* Find Mentor - Browse */}
                <button
                  onClick={handleFindMentor}
                  className="w-full p-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-xl transition flex items-center gap-3 group"
                >
                  <div className="w-12 h-12 bg-blue-500 bg-opacity-20 rounded-lg flex items-center justify-center group-hover:scale-110 transition">
                    <Users size={24} className="text-blue-500" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-bold text-lg">Find Mentor</div>
                    <div className="text-sm opacity-75">Browse mentor list</div>
                  </div>
                </button>

                {/* AI Bot */}
                <button
                  onClick={handleTalkToAI}
                  className="w-full p-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-xl transition flex items-center gap-3 group"
                >
                  <div className="w-12 h-12 bg-purple-500 bg-opacity-20 rounded-lg flex items-center justify-center group-hover:scale-110 transition">
                    <Bot size={24} className="text-purple-500" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-bold text-lg">Talk to AI Bot</div>
                    <div className="text-sm opacity-75">Get instant AI assistance</div>
                  </div>
                </button>
              </div>

              <button
                onClick={onClose}
                className="w-full mt-4 px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
              >
                Maybe Later
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
