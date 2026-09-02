import { motion } from 'motion/react'
import { Zap } from 'lucide-react'

export function JobCard({ job }) {
  const statusColor = job.status === 'READY' ? 'text-green-500' : 'text-yellow-500'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-3">
        <Zap className={`w-5 h-5 flex-shrink-0 mt-1 ${statusColor}`} />
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-slate-900 dark:text-slate-50 truncate">{job.name}</h3>
          <p className={`text-xs font-mono mt-1 ${statusColor}`}>{job.status}</p>
          {job.description && (
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">{job.description}</p>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">{job.jobType}</p>
        </div>
      </div>
    </motion.div>
  )
}
