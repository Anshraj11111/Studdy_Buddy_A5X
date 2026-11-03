export default function Card({ children, className = '', hover = true, glow = false, ...props }) {
  return (
    <div
      className={`glass-card p-6 ${hover ? 'hover:scale-[1.02] hover:-translate-y-1' : ''} ${glow ? 'pulse-glow' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
