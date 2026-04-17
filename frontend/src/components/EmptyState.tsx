import { motion } from 'framer-motion';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative flex flex-col items-center justify-center text-center py-16 px-8 overflow-hidden rounded-3xl border border-dashed border-white/[0.1] bg-white/[0.02]"
    >
      {/* Subtle glow behind icon */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-indigo-500/6 rounded-full blur-3xl"
      />

      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="relative text-5xl mb-5 select-none"
      >
        {icon}
      </motion.div>

      <h3 className="relative text-lg font-bold text-foreground/90 mb-2 tracking-tight">{title}</h3>

      {description && (
        <p className="relative text-sm text-muted-foreground mb-7 max-w-xs leading-relaxed">{description}</p>
      )}

      {action && (
        <button
          onClick={action.onClick}
          className="relative inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-bold rounded-xl shadow-[0_0_16px_rgba(99,102,241,0.3)] hover:shadow-[0_0_24px_rgba(99,102,241,0.45)] hover:-translate-y-px transition-all"
        >
          {action.label}
        </button>
      )}
    </motion.div>
  );
}
