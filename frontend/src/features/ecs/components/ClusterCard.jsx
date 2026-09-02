import { motion } from 'motion/react'
import { Badge } from '@/components/ui/badge'

export function ClusterCard({ cluster, onClick = null }) {
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
          <h3 className="font-semibold text-slate-900 dark:text-slate-50">{cluster.name}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{cluster.arn}</p>
        </div>
        <Badge variant={cluster.status === 'ACTIVE' ? 'default' : 'secondary'}>
          {cluster.status}
        </Badge>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        <div>
          <div className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            {cluster.registeredContainerInstancesCount || 0}
          </div>
          <div className="text-slate-500 dark:text-slate-400">Instances</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            {cluster.runningCount || 0}
          </div>
          <div className="text-slate-500 dark:text-slate-400">Running</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            {cluster.pendingCount || 0}
          </div>
          <div className="text-slate-500 dark:text-slate-400">Pending</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            {cluster.activeServicesCount || 0}
          </div>
          <div className="text-slate-500 dark:text-slate-400">Services</div>
        </div>
      </div>
    </motion.div>
  )
}
