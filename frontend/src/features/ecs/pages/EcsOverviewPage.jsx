import { useState, useMemo } from 'react'
import { motion } from 'motion/react'
import { useClusters } from '../hooks/useClusters'
import { ClusterCard } from '../components/ClusterCard'
import { EcsAiQueryBar } from '../components/EcsAiQueryBar'
import { Skeleton } from '@/components/ui/skeleton'

export function EcsOverviewPage() {
  const { data: clustersData = {}, isLoading } = useClusters()
  const clusters = useMemo(() => clustersData.clusters ?? [], [clustersData])

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">ECS</h1>
        <p className="text-slate-600 dark:text-slate-400">
          Manage and monitor your Elastic Container Service clusters, services, and tasks.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <EcsAiQueryBar />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            Clusters ({clusters.length})
          </h2>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : clusters.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-slate-500 dark:text-slate-400">No clusters found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clusters.map((cluster) => (
              <ClusterCard key={cluster.arn} cluster={cluster} />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}
