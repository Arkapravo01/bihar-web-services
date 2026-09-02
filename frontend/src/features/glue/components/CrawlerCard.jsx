import { motion } from 'motion/react'
import { Search } from 'lucide-react'

export function CrawlerCard({ crawler }) {
  const statusColor = crawler.status === 'READY' ? 'text-green-500' : 'text-blue-500'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-3">
        <Search className={`w-5 h-5 flex-shrink-0 mt-1 ${statusColor}`} />
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-slate-900 dark:text-slate-50 truncate">{crawler.name}</h3>
          <p className={`text-xs font-mono mt-1 ${statusColor}`}>{crawler.status}</p>
          {crawler.database && (
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Database: {crawler.database}</p>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">{crawler.role?.split('/')?.pop()}</p>
        </div>
      </div>
    </motion.div>
  )
}
