import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ActivityTimeline } from '@/components/data-display/ActivityTimeline'
import { useActivity } from '@/app/providers/ActivityProvider'
import { IAMTable } from '@/features/iam/components/IAMTable'
import { useDatabases } from '../hooks/useDatabases'
import { useCrawlers } from '../hooks/useCrawlers'
import { useWorkflows } from '../hooks/useWorkflows'
import { GlueStats } from '../components/GlueStats'
import { GlueAiQueryBar } from '../components/GlueAiQueryBar'
import {
  Layers, AlertCircle, CheckCircle2, XCircle, Clock, ExternalLink, Loader2,
} from 'lucide-react'

// ── helpers ───────────────────────────────────────────────────────────────────

function workflowStatusStyle(status) {
  if (!status) return 'bg-muted text-muted-foreground border-border'
  switch (status.toUpperCase()) {
    case 'COMPLETED': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
    case 'RUNNING':   return 'bg-amber-500/10  text-amber-600  border-amber-500/20'
    case 'FAILED':    return 'bg-red-500/10    text-red-600    border-red-500/20'
    case 'STOPPED':   return 'bg-muted text-muted-foreground border-border'
    case 'ERROR':     return 'bg-red-500/10    text-red-600    border-red-500/20'
    default:          return 'bg-muted text-muted-foreground border-border'
  }
}

function WorkflowStatusIcon({ status }) {
  switch (status?.toUpperCase()) {
    case 'COMPLETED': return <CheckCircle2 className="size-3.5 text-emerald-500" />
    case 'RUNNING':   return <Loader2 className="size-3.5 text-amber-500 animate-spin" />
    case 'FAILED':
    case 'ERROR':     return <XCircle className="size-3.5 text-red-500" />
    default:          return <Clock className="size-3.5 text-muted-foreground" />
  }
}

function crawlerStateStyle(state) {
  if (state === 'READY')    return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
  if (state === 'RUNNING')  return 'bg-amber-500/10 text-amber-600 border-amber-500/20'
  if (state === 'STOPPING') return 'bg-orange-500/10 text-orange-600 border-orange-500/20'
  return 'bg-muted text-muted-foreground border-border'
}

// ── animation variants ────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

// ── page ──────────────────────────────────────────────────────────────────────

export function GlueOverviewPage() {
  const navigate = useNavigate()
  const { events: activity } = useActivity()
  const [wfSearch, setWfSearch]           = useState('')
  const [crawlerSearch, setCrawlerSearch] = useState('')
  const [dbSearch, setDbSearch]           = useState('')

  const { data: dbData = {},      isLoading: dbLoading,      error: dbError }      = useDatabases()
  const { data: crawlerData = {}, isLoading: crawlerLoading, error: crawlerError } = useCrawlers()
  const { data: wfData = {},      isLoading: wfLoading,      error: wfError }      = useWorkflows()

  const databases = useMemo(() => dbData.databases    ?? [], [dbData])
  const crawlers  = useMemo(() => crawlerData.crawlers ?? [], [crawlerData])
  const workflows = useMemo(() => wfData.workflows    ?? [], [wfData])

  const filteredWf       = workflows.filter((w) => w.name.toLowerCase().includes(wfSearch.toLowerCase()))
  const filteredCrawlers = crawlers.filter((c) => c.name.toLowerCase().includes(crawlerSearch.toLowerCase()))
  const filteredDbs      = databases.filter((d) => d.name.toLowerCase().includes(dbSearch.toLowerCase()))

  const error = dbError || crawlerError || wfError
  if (error) {
    const isNetworkError = !error.status
    return (
      <PageContainer>
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Layers className="size-5" /> AWS Glue
          </h1>
          <p className="text-sm text-muted-foreground">Workflows, crawlers, and data catalog</p>
        </div>
        <div className="rounded-xl border border-dashed border-destructive/30 bg-destructive/5 flex flex-col items-center justify-center gap-3 py-20 text-center">
          <AlertCircle className="size-8 text-destructive/60" />
          <p className="text-sm font-semibold text-destructive">
            {isNetworkError ? 'Backend not reachable' : 'Glue not configured'}
          </p>
          <p className="text-xs text-muted-foreground max-w-sm">
            {isNetworkError
              ? 'The backend server is not running. Start it with npm run dev.'
              : error.message || 'AWS profile for Glue is not set up or has no permissions.'}
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
              <Layers className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">AWS Glue</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Workflows, crawlers, and data catalog</p>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div variants={itemVariants}>
          <GlueStats
            dbCount={databases.length}
            jobCount={workflows.length}
            crawlerCount={crawlers.length}
          />
        </motion.div>

        {/* AI Query Bar */}
        <motion.div variants={itemVariants}>
          <GlueAiQueryBar />
        </motion.div>

        {/* Workflows */}
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Workflows</h2>
              <p className="text-xs text-muted-foreground mt-1">
                {filteredWf.length} of {workflows.length} workflows
              </p>
            </div>
            <Input
              placeholder="Search workflows…"
              value={wfSearch}
              onChange={(e) => setWfSearch(e.target.value)}
              className="w-60 rounded-lg border-border/50 bg-background/50"
            />
          </div>

          <div className="rounded-xl border bg-card/50 backdrop-blur-sm overflow-hidden ring-1 ring-white/5">
            <IAMTable
              columns={[
                {
                  id: 'name',
                  header: 'Workflow',
                  cell: (row) => (
                    <button
                      onClick={() => navigate(`/glue/workflows/${encodeURIComponent(row.name)}`)}
                      className="font-mono text-sm font-medium text-primary hover:underline underline-offset-2 transition-colors text-left cursor-pointer flex items-center gap-1.5"
                    >
                      {row.name}
                      <ExternalLink className="size-3 text-muted-foreground shrink-0" />
                    </button>
                  ),
                },
                {
                  id: 'status',
                  header: 'Last Run Status',
                  cell: (row) => row.lastRun ? (
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full border ${workflowStatusStyle(row.lastRun.status)}`}>
                      <WorkflowStatusIcon status={row.lastRun.status} />
                      {row.lastRun.status}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Never run</span>
                  ),
                },
                {
                  id: 'actions',
                  header: 'Actions',
                  cell: (row) => row.lastRun ? (
                    <span className="text-sm text-muted-foreground">
                      <span className="text-emerald-600 font-medium">{row.lastRun.succeededActions}</span>
                      {' / '}
                      {row.lastRun.totalActions}
                      {row.lastRun.failedActions > 0 && (
                        <span className="text-red-500 ml-1">({row.lastRun.failedActions} failed)</span>
                      )}
                    </span>
                  ) : <span className="text-muted-foreground">—</span>,
                },
                {
                  id: 'lastStarted',
                  header: 'Last Started',
                  cell: (row) => (
                    <span className="text-sm text-muted-foreground">
                      {row.lastRun?.startedOn ? new Date(row.lastRun.startedOn).toLocaleString() : '—'}
                    </span>
                  ),
                },
              ]}
              rows={filteredWf}
              rowKey={(w) => w.name}
              loading={wfLoading}
              emptyMessage="No workflows found"
            />
          </div>
        </motion.div>

        {/* Crawlers */}
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Crawlers</h2>
              <p className="text-xs text-muted-foreground mt-1">
                {filteredCrawlers.length} of {crawlers.length} crawlers
              </p>
            </div>
            <Input
              placeholder="Search crawlers…"
              value={crawlerSearch}
              onChange={(e) => setCrawlerSearch(e.target.value)}
              className="w-60 rounded-lg border-border/50 bg-background/50"
            />
          </div>

          <div className="rounded-xl border bg-card/50 backdrop-blur-sm overflow-hidden ring-1 ring-white/5">
            <IAMTable
              columns={[
                {
                  id: 'name',
                  header: 'Crawler Name',
                  cell: (row) => (
                    <span className="font-mono text-sm font-medium text-foreground">{row.name}</span>
                  ),
                },
                {
                  id: 'state',
                  header: 'State',
                  cell: (row) => (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${crawlerStateStyle(row.status)}`}>
                      {row.status || '—'}
                    </span>
                  ),
                },
                {
                  id: 'database',
                  header: 'Target Database',
                  cell: (row) => (
                    <span className="text-sm text-muted-foreground font-mono">{row.database || '—'}</span>
                  ),
                },
                {
                  id: 'schedule',
                  header: 'Schedule',
                  cell: (row) => (
                    <span className="text-xs text-muted-foreground font-mono truncate max-w-[200px] block">
                      {row.schedule || 'On demand'}
                    </span>
                  ),
                },
                {
                  id: 'lastCrawl',
                  header: 'Last Crawl',
                  cell: (row) => (
                    <span className="text-sm text-muted-foreground">
                      {row.lastCrawl ? new Date(row.lastCrawl).toLocaleString() : '—'}
                    </span>
                  ),
                },
              ]}
              rows={filteredCrawlers}
              rowKey={(c) => c.name}
              loading={crawlerLoading}
              emptyMessage="No crawlers found"
            />
          </div>
        </motion.div>

        {/* Databases */}
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Data Catalog Databases</h2>
              <p className="text-xs text-muted-foreground mt-1">
                {filteredDbs.length} of {databases.length} databases
              </p>
            </div>
            <Input
              placeholder="Search databases…"
              value={dbSearch}
              onChange={(e) => setDbSearch(e.target.value)}
              className="w-60 rounded-lg border-border/50 bg-background/50"
            />
          </div>

          <div className="rounded-xl border bg-card/50 backdrop-blur-sm overflow-hidden ring-1 ring-white/5">
            <IAMTable
              columns={[
                {
                  id: 'name',
                  header: 'Database Name',
                  cell: (row) => (
                    <span className="font-mono text-sm font-medium text-foreground">{row.name}</span>
                  ),
                },
                {
                  id: 'description',
                  header: 'Description',
                  cell: (row) => (
                    <span className="text-sm text-muted-foreground">{row.description || '—'}</span>
                  ),
                },
                {
                  id: 'createTime',
                  header: 'Created',
                  cell: (row) => (
                    <span className="text-sm text-muted-foreground">
                      {row.created ? new Date(row.created).toLocaleDateString() : '—'}
                    </span>
                  ),
                },
              ]}
              rows={filteredDbs}
              rowKey={(d) => d.name}
              loading={dbLoading}
              emptyMessage="No databases found"
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
