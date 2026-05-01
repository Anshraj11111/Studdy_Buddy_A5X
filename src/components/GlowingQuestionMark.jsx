import { motion } from 'framer-motion'
import { HelpCircle } from 'lucide-react'

export default function GlowingQuestionMark({ size = 60 }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Outer glow rings */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(99,102,241,0.3) 0%, rgba(99,102,241,0.1) 40%, transparent 70%)',
          filter: 'blur(20px)',
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      
      {/* Middle glow ring */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: size * 0.8,
          height: size * 0.8,
          background: 'radial-gradient(circle, rgba(139,92,246,0.4) 0%, rgba(139,92,246,0.2) 50%, transparent 70%)',
          filter: 'blur(15px)',
        }}
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.6, 1, 0.6],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0.5,
        }}
      />
      
      {/* Inner circle with gradient */}
      <motion.div
        className="absolute rounded-full flex items-center justify-center"
        style={{
          width: size * 0.6,
          height: size * 0.6,
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)',
          boxShadow: '0 0 40px rgba(99,102,241,0.6), 0 0 80px rgba(139,92,246,0.4), inset 0 0 20px rgba(255,255,255,0.2)',
        }}
        animate={{
          boxShadow: [
            '0 0 40px rgba(99,102,241,0.6), 0 0 80px rgba(139,92,246,0.4), inset 0 0 20px rgba(255,255,255,0.2)',
            '0 0 60px rgba(99,102,241,0.8), 0 0 100px rgba(139,92,246,0.6), inset 0 0 30px rgba(255,255,255,0.3)',
            '0 0 40px rgba(99,102,241,0.6), 0 0 80px rgba(139,92,246,0.4), inset 0 0 20px rgba(255,255,255,0.2)',
          ],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {/* Question mark icon */}
        <HelpCircle
          size={size * 0.35}
          className="text-white"
          strokeWidth={2.5}
          style={{
            filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))',
          }}
        />
      </motion.div>
      
      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-blue-400 rounded-full"
          style={{
            left: '50%',
            top: '50%',
          }}
          animate={{
            x: [0, Math.cos((i * Math.PI * 2) / 6) * size * 0.5],
            y: [0, Math.sin((i * Math.PI * 2) / 6) * size * 0.5],
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeOut',
            delay: i * 0.5,
          }}
        />
      ))}
    </div>
  )
}
