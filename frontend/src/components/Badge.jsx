export default function Badge({ children, variant = 'primary', className = '', icon }) {
  const variants = {
    primary: 'bg-primary-500/20 text-primary-300 border-primary-500/30',
    secondary: 'bg-secondary-500/20 text-secondary-300 border-secondary-500/30',
    accent: 'bg-accent-500/20 text-accent-300 border-accent-500/30',
    success: 'bg-green-500/20 text-green-300 border-green-500/30',
    warning: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    danger: 'bg-red-500/20 text-red-300 border-red-500/30',
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold backdrop-blur-xl border shadow-lg ${variants[variant]} ${className}`}>
      {icon && icon}
      {children}
    </span>
  )
}
