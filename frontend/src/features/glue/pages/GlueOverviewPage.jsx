import { useMemo } from 'react'
import { motion } from 'motion/react'
import { useDatabases } from '../hooks/useDatabases'
import { useJobs } from '../hooks/useJobs'
import { useCrawlers } from '../hooks/useCrawlers'
import { DatabaseCard } from '../components/DatabaseCard'
import { JobCard } from '../components/JobCard'
import { CrawlerCard } from '../components/CrawlerCard'
import { GlueAiQueryBar } from '../components/GlueAiQueryBar'
import { Skeleton } from '@/components/ui/skeleton'

export function GlueOverviewPage() {
  const { data: dbData = {}, isLoading: dbLoading } = useDatabases()
  const databases = useMemo(() => dbData.databases ?? [], [dbData])

  const { data: jobData = {}, isLoading: jobLoading } = useJobs()
  const jobs = useMemo(() => jobData.jobs ?? [], [jobData])

  const { data: crawlerData = {}, isLoading: crawlerLoading } = useCrawlers()
  const crawlers = useMemo(() => crawlerData.crawlers ?? [], [crawlerData])

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">AWS Glue</h1>
        <p className="text-slate-600 dark:text-slate-400">
          Manage and monitor Glue catalogs, ETL jobs, crawlers, and data connections.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <GlueAiQueryBar />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            Databases ({databases.length})
          </h2>
        </div>

        {dbLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : databases.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-slate-500 dark:text-slate-400">No databases found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {databases.map((db) => (
              <DatabaseCard key={db.name} database={db} />
            ))}
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            ETL Jobs ({jobs.length})
          </h2>
        </div>

        {jobLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-slate-500 dark:text-slate-400">No jobs found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {jobs.map((job) => (
              <JobCard key={job.name} job={job} />
            ))}
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            Crawlers ({crawlers.length})
          </h2>
        </div>

        {crawlerLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : crawlers.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-slate-500 dark:text-slate-400">No crawlers found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {crawlers.map((crawler) => (
              <CrawlerCard key={crawler.name} crawler={crawler} />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}
