import { useState } from 'react'
import { motion } from 'motion/react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useActiveEnv } from '@/app/providers/ActiveEnvProvider'
import { Activity, AlertCircle } from 'lucide-react'
import { useLogGroups } from '../hooks/useLogGroups'
import { LogGroupsTable } from '../components/LogGroupsTable'
import { CloudWatchAiBar } from '../components/CloudWatchAiBar'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

const statsData = [
  { label: 'Log Groups', color: 'from-blue-500/20 to-blue-600/10', iconColor: 'text-blue-600' },
  { label: 'Total Storage', color: 'from-cyan-500/20 to-cyan-600/10', iconColor: 'text-cyan-600' },
  { label: 'With Retention', color: 'from-indigo-500/20 to-indigo-600/10', iconColor: 'text-indigo-600' },
]

export function CloudWatchOverviewPage() {
  const { activeEnvKey } = useActiveEnv()
  const { data, isLoading, error } = useLogGroups()
  const logGroups = data?.logGroups ?? []
  const [search, setSearch] = useState('')

  const filtered = logGroups.filter((lg) =>
    lg.name.toLowerCase().includes(search.toLowerCase())
  )

  const totalBytes = logGroups.reduce((acc, lg) => acc + (lg.storedBytes ?? 0), 0)
  const withRetention = logGroups.filter((lg) => lg.retentionInDays).length
  const stats = [logGroups.length, `${(totalBytes / (1024 ** 3)).toFixed(2)} GB`, withRetention]

  if (error) {
    return (
      <PageContainer>
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="size-5" /> CloudWatch
          </h1>
          <p className="text-sm text-muted-foreground">Log groups</p>
        </div>
        <div className="rounded-xl border border-dashed border-destructive/30 bg-destructive/5 flex flex-col items-center justify-center gap-3 py-20 text-center">
          <AlertCircle className="size-8 text-destructive/60" />
          <p className="text-sm font-semibold text-destructive">Not configured for {activeEnvKey.toUpperCase()}</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            The {activeEnvKey.toUpperCase()} backend is not reachable or the AWS profile{' '}
            <code className="font-mono bg-destructive/10 px-2 py-1 rounded">claude-cloudwatch-{activeEnvKey}</code> is not set up.
          </p>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="space-y-6"
      >
        {/* Hero Section */}
        <motion.div variants={itemVariants} className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 blur-3xl" />
          <div className="relative space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 ring-1 ring-primary/20">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">CloudWatch Logs</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Monitor and analyze your AWS log groups</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          className="grid grid-cols-1 gap-4 sm:grid-cols-3"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.1, delayChildren: 0 } },
          }}
        >
          {statsData.map((stat, idx) => (
            <motion.div
              key={idx}
              variants={{
                hidden: { opacity: 0, y: 12, scale: 0.95 },
                visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: 'easeOut' } },
              }}
              className={`group relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br ${stat.color} backdrop-blur-sm ring-1 ring-white/5 p-6 hover:ring-primary/30 transition-all duration-300`}
            >
              {/* Icon section */}
              <div className="flex items-start justify-between">
                <div className={`flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br ${stat.color} ring-1 ring-white/10 group-hover:scale-110 transition-transform duration-300`}>
                  <Activity className={`w-6 h-6 ${stat.iconColor}`} />
                </div>
                <div className="w-1 h-1 rounded-full bg-primary/40 group-hover:bg-primary animate-pulse" />
              </div>

              {/* Content */}
              <div className="mt-4 space-y-1">
                <div className="text-3xl font-bold tracking-tight">
                  {stats[idx]}
                </div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                  {stat.label}
                </p>
              </div>

              {/* Subtle border shine */}
              <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden rounded-xl">
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 group-hover:animate-pulse" />
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* AI Query Bar */}
        <motion.div variants={itemVariants}>
          <CloudWatchAiBar />
        </motion.div>

        {/* Log Groups Section */}
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Log Groups</h2>
              <p className="text-xs text-muted-foreground mt-1">{filtered.length} of {logGroups.length} log groups</p>
            </div>
            <Input
              placeholder="Search log groups…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 rounded-lg border-border/50 bg-background/50"
            />
          </div>
          <div className="rounded-xl border bg-card/50 backdrop-blur-sm overflow-hidden ring-1 ring-white/5">
            <LogGroupsTable logGroups={filtered} loading={isLoading} />
          </div>
        </motion.div>
      </motion.div>
    </PageContainer>
  )
}
