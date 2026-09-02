import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ActivityTimeline } from '@/components/data-display/ActivityTimeline'
import { useActivity } from '@/app/providers/ActivityProvider'
import { IAMTable } from '@/features/iam/components/IAMTable'
import { useClusters } from '../hooks/useClusters'
import { EcsStats } from '../components/EcsStats'
import { EcsAiQueryBar } from '../components/EcsAiQueryBar'
import { EcsStatusBadge } from '../components/EcsStatusBadge'
import { Boxes, AlertCircle } from 'lucide-react'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

export function EcsOverviewPage() {
  const navigate = useNavigate()
  const { data, isLoading, error } = useClusters()
  const { events: activity } = useActivity()
  const [search, setSearch] = useState('')

  const clusters = useMemo(() => data?.clusters ?? [], [data])
  const runningTaskCount = useMemo(() => clusters.reduce((sum, c) => sum + (c.runningCount || 0), 0), [clusters])
  const activeServiceCount = useMemo(() => clusters.reduce((sum, c) => sum + (c.activeServicesCount || 0), 0), [clusters])
  const containerInstanceCount = useMemo(
    () => clusters.reduce((sum, c) => sum + (c.registeredContainerInstancesCount || 0), 0),
    [clusters]
  )
  const filteredClusters = clusters.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))

  if (error) {
    const isNetworkError = !error.status
    return (
      <PageContainer>
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Boxes className="size-5" /> ECS
          </h1>
          <p className="text-sm text-muted-foreground">Elastic Container Service clusters, services & tasks</p>
        </div>
        <div className="rounded-xl border border-dashed border-destructive/30 bg-destructive/5 flex flex-col items-center justify-center gap-3 py-20 text-center">
          <AlertCircle className="size-8 text-destructive/60" />
          <p className="text-sm font-semibold text-destructive">
            {isNetworkError ? 'Backend not reachable' : 'ECS not configured'}
          </p>
          <p className="text-xs text-muted-foreground max-w-sm">
            {isNetworkError
              ? 'The backend server is not running. Start it with npm run dev.'
              : error.message || 'AWS profile for ECS is not set up or has no permissions.'}
          </p>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-6">
        {/* Hero */}
        <motion.div variants={itemVariants} className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 blur-3xl" />
          <div className="relative flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <Boxes className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">ECS</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Elastic Container Service clusters, services & tasks</p>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div variants={itemVariants}>
          <EcsStats
            clusterCount={clusters.length}
            runningTaskCount={runningTaskCount}
            activeServiceCount={activeServiceCount}
            containerInstanceCount={containerInstanceCount}
          />
        </motion.div>

        {/* AI Query Bar */}
        <motion.div variants={itemVariants}>
          <EcsAiQueryBar />
        </motion.div>

        {/* Clusters list */}
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Clusters</h2>
              <p className="text-xs text-muted-foreground mt-1">{filteredClusters.length} of {clusters.length} clusters</p>
            </div>
            <Input
              placeholder="Search clusters…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 rounded-lg border-border/50 bg-background/50"
            />
          </div>

          <div className="rounded-xl border bg-card/50 backdrop-blur-sm overflow-hidden ring-1 ring-white/5">
            <IAMTable
              columns={[
                {
                  id: 'name',
                  header: 'Cluster name',
                  cell: (row) => (
                    <button
                      onClick={() => navigate(`/ecs/${encodeURIComponent(row.name)}`)}
                      className="font-mono text-sm font-medium text-primary hover:underline underline-offset-2 transition-colors text-left cursor-pointer"
                    >
                      {row.name}
                    </button>
                  ),
                },
                {
                  id: 'status',
                  header: 'Status',
                  cell: (row) => <EcsStatusBadge status={row.status} />,
                },
                {
                  id: 'services',
                  header: 'Services',
                  cell: (row) => <span className="text-sm font-mono">{row.activeServicesCount}</span>,
                },
                {
                  id: 'tasks',
                  header: 'Running / Pending tasks',
                  cell: (row) => (
                    <span className="text-sm font-mono">
                      {row.runningCount} <span className="text-muted-foreground">/ {row.pendingCount}</span>
                    </span>
                  ),
                },
                {
                  id: 'instances',
                  header: 'Container instances',
                  cell: (row) => <span className="text-sm font-mono">{row.registeredContainerInstancesCount}</span>,
                },
              ]}
              rows={filteredClusters}
              rowKey={(c) => c.arn}
              loading={isLoading}
              emptyMessage="No clusters found"
            />
          </div>
        </motion.div>

        {/* Activity */}
        <motion.div variants={itemVariants}>
          <Card className="rounded-xl border bg-gradient-to-br from-card/80 to-card/50 backdrop-blur-sm ring-1 ring-white/5">
            <CardHeader className="border-b border-border/50">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <ActivityTimeline events={activity} />
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </PageContainer>
  )
}
