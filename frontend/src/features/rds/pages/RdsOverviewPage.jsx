import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ActivityTimeline } from '@/components/data-display/ActivityTimeline'
import { useActivity } from '@/app/providers/ActivityProvider'
import { IAMTable } from '@/features/iam/components/IAMTable'
import { useInstances } from '../hooks/useInstances'
import { RdsStats } from '../components/RdsStats'
import { RdsAiQueryBar } from '../components/RdsAiQueryBar'
import { Database, CheckCircle2, PauseCircle, AlertCircle } from 'lucide-react'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

export function RdsOverviewPage() {
  const navigate = useNavigate()
  const { data, isLoading, error } = useInstances()
  const { events: activity } = useActivity()
  const [search, setSearch] = useState('')

  const instances = useMemo(() => data?.instances ?? [], [data])
  const availableCount = useMemo(() => instances.filter((i) => i.status === 'available').length, [instances])
  const stoppedCount = useMemo(() => instances.filter((i) => i.status === 'stopped').length, [instances])
  const filteredInstances = instances.filter((i) => i.id.toLowerCase().includes(search.toLowerCase()))

  if (error) {
    const isNetworkError = !error.status
    return (
      <PageContainer>
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Database className="size-5" /> RDS
          </h1>
          <p className="text-sm text-muted-foreground">Managed relational databases</p>
        </div>
        <div className="rounded-xl border border-dashed border-destructive/30 bg-destructive/5 flex flex-col items-center justify-center gap-3 py-20 text-center">
          <AlertCircle className="size-8 text-destructive/60" />
          <p className="text-sm font-semibold text-destructive">
            {isNetworkError ? 'Backend not reachable' : 'RDS not configured'}
          </p>
          <p className="text-xs text-muted-foreground max-w-sm">
            {isNetworkError
              ? 'The backend server is not running. Start it with npm run dev.'
              : error.message || 'AWS profile for RDS is not set up or has no permissions.'}
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
              <Database className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">RDS</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Managed relational databases</p>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div variants={itemVariants}>
          <RdsStats totalCount={instances.length} availableCount={availableCount} stoppedCount={stoppedCount} />
        </motion.div>

        {/* AI Query Bar */}
        <motion.div variants={itemVariants}>
          <RdsAiQueryBar />
        </motion.div>

        {/* Instances list */}
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Instances</h2>
              <p className="text-xs text-muted-foreground mt-1">{filteredInstances.length} of {instances.length} instances</p>
            </div>
            <Input
              placeholder="Search instances…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 rounded-lg border-border/50 bg-background/50"
            />
          </div>

          <div className="rounded-xl border bg-card/50 backdrop-blur-sm overflow-hidden ring-1 ring-white/5">
            <IAMTable
              columns={[
                {
                  id: 'id',
                  header: 'Identifier',
                  cell: (row) => (
                    <button
                      onClick={() => navigate(`/rds/${encodeURIComponent(row.id)}`)}
                      className="font-mono text-sm font-medium text-primary hover:underline underline-offset-2 transition-colors text-left cursor-pointer"
                    >
                      {row.id}
                    </button>
                  ),
                },
                {
                  id: 'engine',
                  header: 'Engine',
                  cell: (row) => <span className="text-sm text-muted-foreground">{row.engine} {row.engineVersion}</span>,
                },
                {
                  id: 'class',
                  header: 'Class',
                  cell: (row) => <span className="text-sm font-mono">{row.instanceClass}</span>,
                },
                {
                  id: 'status',
                  header: 'Status',
                  cell: (row) => (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                      row.status === 'available'
                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                        : row.status === 'stopped'
                        ? 'bg-muted text-muted-foreground border border-border'
                        : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                    }`}>
                      {row.status === 'available' ? <CheckCircle2 className="w-3 h-3" /> : row.status === 'stopped' ? <PauseCircle className="w-3 h-3" /> : null}
                      {row.status}
                    </span>
                  ),
                },
                {
                  id: 'multiAZ',
                  header: 'Multi-AZ',
                  cell: (row) => <span className="text-sm text-muted-foreground">{row.multiAZ ? 'Yes' : 'No'}</span>,
                },
              ]}
              rows={filteredInstances}
              rowKey={(i) => i.id}
              loading={isLoading}
              emptyMessage="No DB instances found"
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
