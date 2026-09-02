import { useMemo } from 'react'
import { motion } from 'motion/react'
import { useEventBuses } from '../hooks/useEventBuses'
import { useRules } from '../hooks/useRules'
import { EventBusCard } from '../components/EventBusCard'
import { EventBridgeAiQueryBar } from '../components/EventBridgeAiQueryBar'
import { Skeleton } from '@/components/ui/skeleton'

export function EventBridgeOverviewPage() {
  const { data: busesData = {}, isLoading } = useEventBuses()
  const buses = useMemo(() => busesData.buses ?? [], [busesData])

  // Get rule counts for each bus (default bus only for now)
  const { data: rulesData = {} } = useRules('default')
  const rules = useMemo(() => rulesData.rules ?? [], [rulesData])

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">EventBridge</h1>
        <p className="text-slate-600 dark:text-slate-400">
          Manage and monitor your EventBridge event buses, rules, and targets.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <EventBridgeAiQueryBar />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            Event Buses ({buses.length})
          </h2>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : buses.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-slate-500 dark:text-slate-400">No event buses found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {buses.map((bus) => (
              <EventBusCard
                key={bus.arn}
                bus={bus}
                ruleCount={bus.name === 'default' ? rules.length : 0}
              />
            ))}
          </div>
        )}
      </motion.div>

      {rules.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            Rules ({rules.length})
          </h2>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {rules.map((rule, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + idx * 0.05 }}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-50">{rule.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      State: <span className="font-mono">{rule.state}</span>
                    </p>
                    {rule.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{rule.description}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
