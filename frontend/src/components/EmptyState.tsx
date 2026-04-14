import { motion } from 'framer-motion'

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center text-center py-16 px-8 bg-card/30 border border-white/5 rounded-3xl"
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="text-5xl mb-5 select-none"
      >
        {icon}
      </motion.div>
      <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-foreground/50 mb-6 max-w-xs">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          {action.label}
        </button>
      )}
    </motion.div>
  )
}
