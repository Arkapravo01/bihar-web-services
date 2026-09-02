import { motion } from 'motion/react'

export function EventBusCard({ bus, onClick = null, ruleCount = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={`p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-3 ${
        onClick ? 'cursor-pointer hover:border-slate-300 dark:hover:border-slate-600' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-50">{bus.name}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{bus.arn}</p>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div>
          <div className="text-lg font-semibold text-slate-900 dark:text-slate-50">{ruleCount}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Rules</div>
        </div>
        {bus.createdAt && (
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Created: {new Date(bus.createdAt).toLocaleDateString()}
          </div>
        )}
      </div>
    </motion.div>
  )
}
