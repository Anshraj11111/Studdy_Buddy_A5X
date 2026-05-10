import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Send, Loader2, Sparkles, Zap, AlertCircle } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import { aiAPI } from '../services/api'

export default function AIBot() {
  const { user } = useAuthStore()
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hi ${user?.name || 'there'}! 👋 I'm your AI study assistant. Ask me anything about your doubts and I'll help you understand!`
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const userMessage = input.trim()
    setInput('')
    const newMessages = [...messages, { role: 'user', content: userMessage }]
    setMessages(newMessages)
    setLoading(true)
    try {
      // Build history for context (last 10 messages)
      const history = newMessages.slice(-10).map(m => ({ role: m.role, content: m.content }))
      const res = await aiAPI.chat(userMessage, history.slice(0, -1)) // exclude current message
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }])
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to get AI response. Please try again.'
      setMessages(prev => [...prev, { role: 'error', content: errMsg }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  return (
    <div className="flex flex-col" style={{ height: '100vh', position: 'relative' }}>
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      {/* Background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, backgroundImage: 'url(/src/assets/image.png)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, background: 'rgba(5,3,20,0.88)' }} />

      <div style={{ position: 'relative', zIndex: 60 }}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main chat area */}
      <div className="relative flex flex-col flex-1 lg:ml-[240px] mt-16 overflow-hidden" style={{ zIndex: 5 }}>

        {/* AI Header */}
        <div className="flex-shrink-0" style={{ background: 'rgba(10,8,30,0.9)', borderBottom: '1px solid rgba(99,102,241,0.2)', backdropFilter: 'blur(20px)' }}>
          <div className="h-0.5" style={{ background: 'linear-gradient(90deg,transparent,#6366f1,#8b5cf6,transparent)' }} />
          <div className="flex items-center gap-3 px-4 py-3">
            <motion.div
              animate={{ boxShadow: ['0 0 0px rgba(139,92,246,0)', '0 0 20px rgba(139,92,246,0.6)', '0 0 0px rgba(139,92,246,0)'] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              <Bot size={20} className="text-white" />
            </motion.div>
            <div>
              <h1 className="font-bold text-white text-sm flex items-center gap-1.5">
                AI Study Assistant
                <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
              </h1>
              <p style={{ color: 'rgba(148,163,184,0.6)', fontSize: '0.7rem', fontFamily: 'monospace' }}>
                Powered by AI • Always here to help
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 space-y-4">
          {messages.map((msg, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mr-2 mt-1"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 0 12px rgba(99,102,241,0.4)' }}>
                  <Sparkles size={14} className="text-white" />
                </div>
              )}
              <div className={`max-w-[78%] sm:max-w-lg`}>
                {msg.role === 'assistant' && (
                  <p className="text-xs mb-1 flex items-center gap-1" style={{ color: '#a5b4fc', fontFamily: 'monospace' }}>
                    <Zap size={10} /> AI Assistant
                  </p>
                )}
                <div className="px-4 py-3 rounded-2xl"
                  style={msg.role === 'user' ? {
                    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                    borderRadius: '18px 18px 4px 18px',
                    boxShadow: '0 2px 12px rgba(99,102,241,0.4)',
                  } : msg.role === 'error' ? {
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: '18px 18px 18px 4px',
                  } : {
                    background: 'rgba(10,8,30,0.85)',
                    border: '1px solid rgba(99,102,241,0.2)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '18px 18px 18px 4px',
                  }}>
                  {msg.role === 'error' ? (
                    <p className="text-sm flex items-center gap-2" style={{ color: '#fca5a5' }}>
                      <AlertCircle size={14} /> {msg.content}
                    </p>
                  ) : (
                    <p className="text-sm text-white whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}

          <AnimatePresence>
            {loading && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex justify-start">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mr-2"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                  <Sparkles size={14} className="text-white" />
                </div>
                <div className="px-4 py-3 rounded-2xl" style={{ background: 'rgba(10,8,30,0.85)', border: '1px solid rgba(99,102,241,0.2)', backdropFilter: 'blur(20px)', borderRadius: '18px 18px 18px 4px' }}>
                  <div className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" style={{ color: '#818cf8' }} />
                    <span className="text-sm" style={{ color: 'rgba(148,163,184,0.7)' }}>AI is thinking...</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex-shrink-0 px-3 sm:px-5 py-3" style={{ background: 'rgba(10,8,30,0.9)', borderTop: '1px solid rgba(99,102,241,0.2)', backdropFilter: 'blur(20px)' }}>
          <div className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about your doubts..."
              rows={1}
              className="flex-1 text-sm text-white placeholder-gray-500 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(99,102,241,0.2)', minHeight: '48px', maxHeight: '120px' }}
            />
            <motion.button whileHover={{ scale: input.trim() ? 1.08 : 1 }} whileTap={{ scale: input.trim() ? 0.92 : 1 }}
              onClick={handleSend} disabled={!input.trim() || loading}
              className="w-12 h-12 flex items-center justify-center rounded-xl text-white transition flex-shrink-0 disabled:opacity-40"
              style={{ background: input.trim() ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(99,102,241,0.2)', boxShadow: input.trim() ? '0 2px 12px rgba(99,102,241,0.4)' : 'none' }}>
              <Send size={18} />
            </motion.button>
          </div>
          <p className="text-xs text-center mt-2" style={{ color: 'rgba(148,163,184,0.4)' }}>
            Press Enter to send • Shift + Enter for new line
          </p>
        </div>
      </div>
    </div>
  )
}
