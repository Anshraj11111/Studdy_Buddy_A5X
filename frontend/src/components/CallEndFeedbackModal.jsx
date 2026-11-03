import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, HelpCircle, Users, Bot, ArrowRight, PhoneOff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function CallEndFeedbackModal({ isOpen, onClose, roomId, otherUser }) {
  const [step, setStep] = useState(1)
  const navigate = useNavigate()

  const handleResolved = () => {
    onClose()
    navigate('/doubts')
  }

  const handleNotResolved = () => {
    setStep(2)
  }

  const handleFindMentor = () => {
    onClose()
    navigate('/mentors')
  }

  const handleTalkToAI = () => {
    onClose()
    navigate('/ai-bot')
  }

  const handleDismiss = () => {
    onClose()
    navigate(`/chat/${roomId}`)
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
        onClick={handleDismiss}
      >
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white dark:bg-gray-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Top bar handle (mobile) */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
          </div>

          {step === 1 ? (
            <div className="px-6 pb-8 pt-4 sm:pt-6">
              {/* Icon */}
              <div className="flex justify-center mb-4">
                <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <PhoneOff size={26} className="text-red-500" />
                </div>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white text-center mb-1">
                Call Ended
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                Was your doubt resolved during this session?
              </p>

              <div className="space-y-3">
                <button
                  onClick={handleResolved}
                  className="w-full flex items-center gap-3 px-5 py-3.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition shadow-sm"
                >
                  <CheckCircle size={20} />
                  <span className="flex-1 text-left">Yes, my doubt is resolved</span>
                  <ArrowRight size={16} className="opacity-70" />
                </button>
                <button
                  onClick={handleNotResolved}
                  className="w-full flex items-center gap-3 px-5 py-3.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition shadow-sm"
                >
                  <HelpCircle size={20} />
                  <span className="flex-1 text-left">No, I still need help</span>
                  <ArrowRight size={16} className="opacity-70" />
                </button>
              </div>

              <button
                onClick={handleDismiss}
                className="w-full mt-3 py-2.5 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
              >
                Dismiss
              </button>
            </div>
          ) : (
            <div className="px-6 pb-8 pt-4 sm:pt-6">
              <div className="flex justify-center mb-4">
                <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <HelpCircle size={26} className="text-blue-500" />
                </div>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white text-center mb-1">
                Need More Help?
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                Here are a few ways to continue getting support.
              </p>

              <div className="space-y-3">
                <button
                  onClick={handleFindMentor}
                  className="w-full flex items-center gap-4 px-4 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl transition shadow-sm group"
                >
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition">
                    <Users size={20} />
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-semibold text-sm sm:text-base">Find a Mentor</div>
                    <div className="text-xs opacity-80">Browse and connect with available mentors</div>
                  </div>
                  <ArrowRight size={16} className="opacity-70 flex-shrink-0" />
                </button>

                <button
                  onClick={handleTalkToAI}
                  className="w-full flex items-center gap-4 px-4 py-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-xl transition group"
                >
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/40 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition">
                    <Bot size={20} className="text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-semibold text-sm sm:text-base">Ask the AI Assistant</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Get instant answers from our AI bot</div>
                  </div>
                  <ArrowRight size={16} className="text-gray-400 flex-shrink-0" />
                </button>
              </div>

              <button
                onClick={handleDismiss}
                className="w-full mt-3 py-2.5 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
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
