import { useParams, useNavigate } from 'react-router-dom'
import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'motion/react'
import { toast } from 'sonner'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { IAMTable } from '@/features/iam/components/IAMTable'
import { GlueAiQueryBar } from '../components/GlueAiQueryBar'
import { getWorkflowRuns, getWorkflowRunDetail, startWorkflowRun } from '../api/glueApi'
import {
  ArrowLeft, Play, Loader2, CheckCircle2, XCircle, Clock,
  ChevronDown, ChevronRight, AlertCircle, Timer,
} from 'lucide-react'

// ─── helpers ──────────────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

function statusStyle(status) {
  switch (status?.toUpperCase()) {
    case 'COMPLETED':
    case 'SUCCEEDED': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
    case 'RUNNING':   return 'bg-amber-500/10  text-amber-600  border-amber-500/20'
    case 'FAILED':
    case 'ERROR':     return 'bg-red-500/10    text-red-600    border-red-500/20'
    case 'STOPPED':   return 'bg-muted text-muted-foreground border-border'
    default:          return 'bg-muted text-muted-foreground border-border'
  }
}

function StatusIcon({ status, size = 'size-3.5' }) {
  switch (status?.toUpperCase()) {
    case 'COMPLETED':
    case 'SUCCEEDED': return <CheckCircle2 className={`${size} text-emerald-500`} />
    case 'RUNNING':   return <Loader2 className={`${size} text-amber-500 animate-spin`} />
    case 'FAILED':
    case 'ERROR':     return <XCircle className={`${size} text-red-500`} />
    default:          return <Clock className={`${size} text-muted-foreground`} />
  }
}

function fmtDuration(secs) {
  if (!secs && secs !== 0) return '—'
  if (secs < 60) return `${secs}s`
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

function fmtElapsed(startedOn, completedOn) {
  if (!startedOn) return '—'
  const end = completedOn ? new Date(completedOn) : new Date()
  const secs = Math.round((end - new Date(startedOn)) / 1000)
  return fmtDuration(secs)
}

// ─── run detail panel (expanded inline below a run row) ───────────────────────

function RunDetailPanel({ workflowName, runId }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['glue', 'workflow-run-detail', workflowName, runId],
    queryFn:  () => getWorkflowRunDetail(workflowName, runId),
    staleTime: 30_000,
  })
  const run = data?.run

  if (isLoading) return (
    <div className="px-6 py-4 space-y-2 bg-muted/30 border-t border-border/50">
      {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8" />)}
    </div>
  )
  if (error || !run) return (
    <div className="px-6 py-4 bg-muted/30 border-t border-border/50 text-sm text-destructive">
      Failed to load run detail.
    </div>
  )

  const nodes = run.nodes ?? []
  const durationSecs = run.startedOn && run.completedOn
    ? Math.round((new Date(run.completedOn) - new Date(run.startedOn)) / 1000)
    : null

  return (
    <div className="bg-muted/20 border-t border-border/50">
      {/* Run summary strip */}
      <div className="flex items-center gap-6 px-6 py-3 border-b border-border/30 bg-muted/10 text-xs text-muted-foreground">
        <span>
          <span className="font-medium text-foreground">{run.succeededActions}</span>
          {' / '}
          <span className="font-medium text-foreground">{run.totalActions}</span>
          {' actions succeeded'}
        </span>
        {run.failedActions > 0 && (
          <span className="text-red-500 font-medium">{run.failedActions} failed</span>
        )}
        {durationSecs !== null && (
          <span className="flex items-center gap-1">
            <Timer className="size-3" />
            Total: {fmtDuration(durationSecs)}
          </span>
        )}
      </div>

      {/* Node table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/10">
              <th className="text-left px-6 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide w-[40%]">Job</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Started</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Duration</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Error</th>
            </tr>
          </thead>
          <tbody>
            {nodes.map((node) => (
              <tr key={node.jobName} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                <td className="px-6 py-2.5 font-mono text-xs text-foreground">{node.jobName}</td>
                <td className="px-4 py-2.5">
                  {node.status ? (
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full border ${statusStyle(node.status)}`}>
                      <StatusIcon status={node.status} size="size-3" />
                      {node.status}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Not started</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                  {node.startedOn ? new Date(node.startedOn).toLocaleTimeString() : '—'}
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap font-mono">
                  {fmtDuration(node.executionTime)}
                </td>
                <td className="px-4 py-2.5 text-xs text-red-500 font-mono max-w-[300px]">
                  {node.errorMessage
                    ? <span className="truncate block" title={node.errorMessage}>{node.errorMessage}</span>
                    : <span className="text-muted-foreground">—</span>
                  }
                </td>
              </tr>
            ))}
            {nodes.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-muted-foreground">
                  No job nodes found in this run.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── expandable run row ────────────────────────────────────────────────────────

function RunRow({ run, workflowName, isExpanded, onToggle }) {
  const durationSecs = run.startedOn && run.completedOn
    ? Math.round((new Date(run.completedOn) - new Date(run.startedOn)) / 1000)
    : null

  return (
    <>
      <tr
        className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
        onClick={onToggle}
      >
        <td className="px-4 py-3 w-8">
          {isExpanded
            ? <ChevronDown className="size-4 text-muted-foreground" />
            : <ChevronRight className="size-4 text-muted-foreground" />
          }
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full border ${statusStyle(run.status)}`}>
            <StatusIcon status={run.status} size="size-3" />
            {run.status}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
          {run.startedOn ? new Date(run.startedOn).toLocaleString() : '—'}
        </td>
        <td className="px-4 py-3 text-sm font-mono text-muted-foreground whitespace-nowrap">
          {durationSecs !== null ? fmtDuration(durationSecs) : run.status === 'RUNNING' ? fmtElapsed(run.startedOn, null) : '—'}
        </td>
        <td className="px-4 py-3 text-sm text-muted-foreground">
          <span className="text-emerald-600 font-medium">{run.succeededActions}</span>
          {' / '}{run.totalActions}
          {run.failedActions > 0 && (
            <span className="text-red-500 ml-2 text-xs">({run.failedActions} failed)</span>
          )}
        </td>
        <td className="px-4 py-3">
          <span className="text-xs font-mono text-muted-foreground truncate max-w-[160px] block">
            {run.runId?.slice(0, 20)}…
          </span>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={6} className="p-0">
            <RunDetailPanel workflowName={workflowName} runId={run.runId} />
          </td>
        </tr>
      )}
    </>
  )
}

// ─── page ──────────────────────────────────────────────────────────────────────

export function GlueWorkflowDetailPage() {
  const { workflowName } = useParams()
  const navigate          = useNavigate()
  const [expandedRun, setExpandedRun] = useState(null)
  const [launching, setLaunching]     = useState(false)
  const [activeTab, setActiveTab]     = useState('runs')

  const decoded = decodeURIComponent(workflowName)

  const { data: runsData, isLoading: runsLoading, error: runsError, refetch } = useQuery({
    queryKey: ['glue', 'workflow-runs', decoded],
    queryFn:  () => getWorkflowRuns(decoded),
    staleTime: 30_000,
  })

  const runs = runsData?.runs ?? []

  const handleRun = useCallback(async () => {
    setLaunching(true)
    try {
      const result = await startWorkflowRun(decoded)
      if (result?.workflowRunId) {
        toast.success('Workflow started', { description: `Run ID: ${result.workflowRunId}` })
        setTimeout(() => refetch(), 2000)
      } else {
        toast.error('Failed to start workflow')
      }
    } catch (err) {
      toast.error('Failed to start workflow', {
        description: err?.response?.data?.error?.message ?? err.message,
      })
    } finally {
      setLaunching(false)
    }
  }, [decoded, refetch])

  const TABS = ['runs', 'ai']
  const TAB_LABELS = { runs: 'Run History', ai: 'AI Assistant' }

  if (runsError) {
    return (
      <PageContainer>
        <div className="rounded-xl border border-dashed border-destructive/30 bg-destructive/5 flex flex-col items-center justify-center gap-3 py-20 text-center">
          <AlertCircle className="size-8 text-destructive/60" />
          <p className="text-sm font-semibold text-destructive">Could not load workflow</p>
          <p className="text-xs text-muted-foreground">{runsError.message}</p>
          <Button variant="ghost" size="sm" onClick={() => navigate('/glue')}>← Back to Glue</Button>
        </div>
      </PageContainer>
    )
  }

  const latestRun = runs[0]

  return (
    <PageContainer>
      <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-6">

        {/* Breadcrumb + header */}
        <motion.div variants={itemVariants}>
          <button
            onClick={() => navigate('/glue')}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="size-3.5" />
            AWS Glue
          </button>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center justify-center w-10 h-10 shrink-0 rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20">
                <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4" />
                </svg>
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight font-mono truncate">{decoded}</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  {latestRun?.status && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusStyle(latestRun.status)}`}>
                      {latestRun.status}
                    </span>
                  )}
                  {latestRun?.startedOn && (
                    <span className="text-xs text-muted-foreground">
                      Last run {new Date(latestRun.startedOn).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <Button
              onClick={handleRun}
              disabled={launching}
              className="shrink-0 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              size="sm"
            >
              {launching
                ? <><Loader2 className="size-3.5 animate-spin" /> Starting…</>
                : <><Play className="size-3.5" /> Run Workflow</>
              }
            </Button>
          </div>
        </motion.div>

        {/* Summary KPIs from latest run */}
        {latestRun && (
          <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Actions',     value: latestRun.totalActions,     color: 'text-foreground' },
              { label: 'Succeeded',         value: latestRun.succeededActions, color: 'text-emerald-600' },
              { label: 'Failed',            value: latestRun.failedActions,    color: latestRun.failedActions > 0 ? 'text-red-500' : 'text-foreground' },
              { label: 'Run Duration',      value: latestRun.startedOn && latestRun.completedOn
                  ? fmtElapsed(latestRun.startedOn, latestRun.completedOn)
                  : '—',
                color: 'text-foreground' },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-xl border border-border/50 bg-card/50 p-4 ring-1 ring-white/5">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{kpi.label}</p>
                <p className={`text-2xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
              </div>
            ))}
          </motion.div>
        )}

        {/* Tab bar */}
        <motion.div variants={itemVariants} className="border-b border-border">
          <div className="flex">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {TAB_LABELS[tab]}
                {tab === 'runs' && runs.length > 0 && (
                  <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{runs.length}</span>
                )}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Run History tab */}
        {activeTab === 'runs' && (
          <motion.div key="runs" variants={itemVariants}>
            {runsLoading ? (
              <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
            ) : runs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border py-16 text-center">
                <p className="text-sm text-muted-foreground">This workflow has not been run yet.</p>
              </div>
            ) : (
              <div className="rounded-xl border bg-card/50 backdrop-blur-sm overflow-hidden ring-1 ring-white/5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/10">
                      <th className="px-4 py-3 w-8" />
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Started</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Duration</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Actions</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Run ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((run) => (
                      <RunRow
                        key={run.runId}
                        run={run}
                        workflowName={decoded}
                        isExpanded={expandedRun === run.runId}
                        onToggle={() => setExpandedRun(expandedRun === run.runId ? null : run.runId)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {/* AI tab */}
        {activeTab === 'ai' && (
          <motion.div key="ai" variants={itemVariants}>
            <GlueAiQueryBar contextName={decoded} contextType="workflow" />
          </motion.div>
        )}

      </motion.div>
    </PageContainer>
  )
}
