import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useJob } from '../hooks/useJob'
import { useJobRuns } from '../hooks/useJobRuns'
import { GlueAiQueryBar } from '../components/GlueAiQueryBar'
import { IAMTable } from '@/features/iam/components/IAMTable'
import { startJobRun } from '../api/glueApi'
import {
  ArrowLeft, Briefcase, Play, Clock, Hash,
  AlertCircle, CheckCircle2, XCircle, Loader2,
  ChevronRight, Code2,
} from 'lucide-react'

// ─── helpers ─────────────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

const JOB_TYPE_COLORS = {
  glueetl:     'bg-violet-500/10 text-violet-600 border-violet-500/20',
  pythonshell: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
  glueray:     'bg-amber-500/10 text-amber-600 border-amber-500/20',
}

function jobTypeStyle(type) {
  return JOB_TYPE_COLORS[type?.toLowerCase()] ?? 'bg-muted text-muted-foreground border-border'
}

function runStateStyle(state) {
  if (!state) return 'bg-muted text-muted-foreground border-border'
  const s = state.toUpperCase()
  if (s === 'SUCCEEDED') return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
  if (s === 'FAILED')    return 'bg-red-500/10 text-red-600 border-red-500/20'
  if (s === 'RUNNING')   return 'bg-amber-500/10 text-amber-600 border-amber-500/20'
  if (s === 'TIMEOUT')   return 'bg-orange-500/10 text-orange-600 border-orange-500/20'
  if (s === 'STOPPED')   return 'bg-muted text-muted-foreground border-border'
  return 'bg-muted text-muted-foreground border-border'
}

function RunStateIcon({ state }) {
  const s = state?.toUpperCase()
  if (s === 'SUCCEEDED') return <CheckCircle2 className="size-3.5 text-emerald-500" />
  if (s === 'FAILED')    return <XCircle className="size-3.5 text-red-500" />
  if (s === 'RUNNING')   return <Loader2 className="size-3.5 text-amber-500 animate-spin" />
  return <Clock className="size-3.5 text-muted-foreground" />
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start py-2.5 border-b border-border/50 last:border-0">
      <span className="w-40 shrink-0 text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="text-sm font-mono text-foreground break-all">{value ?? '—'}</span>
    </div>
  )
}

// ─── component ────────────────────────────────────────────────────────────────

export function GlueJobDetailPage() {
  const { jobName } = useParams()
  const navigate    = useNavigate()
  const [activeTab, setActiveTab]   = useState('overview')
  const [launching, setLaunching]   = useState(false)

  const { data: jobData, isLoading: jobLoading, error: jobError } = useJob(jobName)
  const { data: runsData, isLoading: runsLoading, refetch: refetchRuns } = useJobRuns(jobName)

  const job  = jobData?.job
  const runs = runsData?.runs ?? []

  const decodedName = decodeURIComponent(jobName)

  // ── start job run ──────────────────────────────────────────────────────────
  async function handleStartRun() {
    setLaunching(true)
    try {
      const result = await startJobRun(decodedName)
      if (result?.jobRunId) {
        toast.success(`Run started`, { description: `Run ID: ${result.jobRunId}` })
        setTimeout(() => refetchRuns(), 1500)
      } else {
        toast.error('Failed to start job run')
      }
    } catch (err) {
      toast.error(err?.response?.data?.error?.message ?? 'Failed to start job run')
    } finally {
      setLaunching(false)
    }
  }

  // ── loading / error states ─────────────────────────────────────────────────
  if (jobError) {
    return (
      <PageContainer>
        <div className="rounded-xl border border-dashed border-destructive/30 bg-destructive/5 flex flex-col items-center justify-center gap-3 py-20 text-center">
          <AlertCircle className="size-8 text-destructive/60" />
          <p className="text-sm font-semibold text-destructive">Could not load job</p>
          <p className="text-xs text-muted-foreground">{jobError.message}</p>
          <Button variant="ghost" size="sm" onClick={() => navigate('/glue')}>← Back to Glue</Button>
        </div>
      </PageContainer>
    )
  }

  const TABS = ['overview', 'runs', 'configuration', 'ai']
  const TAB_LABELS = { overview: 'Overview', runs: 'Job Runs', configuration: 'Configuration', ai: 'AI Assistant' }

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
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20">
                <Briefcase className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                {jobLoading ? (
                  <Skeleton className="h-7 w-64 mb-1" />
                ) : (
                  <h1 className="text-2xl font-bold tracking-tight font-mono">{job?.name ?? decodedName}</h1>
                )}
                <div className="flex items-center gap-2 mt-0.5">
                  {job?.jobType && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${jobTypeStyle(job.jobType)}`}>
                      {job.jobType}
                    </span>
                  )}
                  {job?.glueVersion && (
                    <span className="text-xs text-muted-foreground">Glue {job.glueVersion}</span>
                  )}
                </div>
              </div>
            </div>

            <Button
              onClick={handleStartRun}
              disabled={launching || jobLoading}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              size="sm"
            >
              {launching
                ? <><Loader2 className="size-3.5 animate-spin" /> Starting…</>
                : <><Play className="size-3.5" /> Start Run</>
              }
            </Button>
          </div>
        </motion.div>

        {/* Tab bar */}
        <motion.div variants={itemVariants} className="border-b border-border">
          <div className="flex gap-0">
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
                  <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {runs.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Overview tab */}
        {activeTab === 'overview' && (
          <motion.div key="overview" variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="rounded-xl border bg-card/50 backdrop-blur-sm ring-1 ring-white/5">
              <CardHeader className="border-b border-border/50 pb-3">
                <CardTitle className="text-sm font-semibold">Job Details</CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                {jobLoading ? (
                  <div className="space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
                ) : (
                  <div>
                    <DetailRow label="Name"         value={job?.name} />
                    <DetailRow label="Type"         value={job?.jobType} />
                    <DetailRow label="Glue Version" value={job?.glueVersion} />
                    <DetailRow label="Worker Type"  value={job?.workerType} />
                    <DetailRow label="Workers"      value={job?.numberOfWorkers} />
                    <DetailRow label="Max Capacity" value={job?.maxCapacity} />
                    <DetailRow label="Timeout"      value={job?.timeout ? `${job.timeout} min` : null} />
                    <DetailRow label="Max Retries"  value={job?.maxRetries} />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-xl border bg-card/50 backdrop-blur-sm ring-1 ring-white/5">
              <CardHeader className="border-b border-border/50 pb-3">
                <CardTitle className="text-sm font-semibold">Script & Role</CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                {jobLoading ? (
                  <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
                ) : (
                  <div>
                    <DetailRow label="Role"    value={job?.role} />
                    <DetailRow label="Script"  value={job?.scriptLocation} />
                    <DetailRow label="Created" value={job?.created ? new Date(job.created).toLocaleString() : null} />
                    <DetailRow label="Updated" value={job?.updated ? new Date(job.updated).toLocaleString() : null} />
                    {job?.description && <DetailRow label="Description" value={job.description} />}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Job Runs tab */}
        {activeTab === 'runs' && (
          <motion.div key="runs" variants={itemVariants} className="space-y-4">
            <div className="rounded-xl border bg-card/50 backdrop-blur-sm overflow-hidden ring-1 ring-white/5">
              <IAMTable
                columns={[
                  {
                    id: 'id',
                    header: 'Run ID',
                    cell: (row) => (
                      <span className="text-xs font-mono text-muted-foreground">{row.id}</span>
                    ),
                  },
                  {
                    id: 'state',
                    header: 'State',
                    cell: (row) => (
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full border ${runStateStyle(row.status)}`}>
                        <RunStateIcon state={row.status} />
                        {row.status}
                      </span>
                    ),
                  },
                  {
                    id: 'startedOn',
                    header: 'Started',
                    cell: (row) => (
                      <span className="text-sm text-muted-foreground">
                        {row.startedOn ? new Date(row.startedOn).toLocaleString() : '—'}
                      </span>
                    ),
                  },
                  {
                    id: 'duration',
                    header: 'Duration',
                    cell: (row) => {
                      if (!row.durationSeconds) return <span className="text-muted-foreground">—</span>
                      const m = Math.floor(row.durationSeconds / 60)
                      const s = row.durationSeconds % 60
                      return <span className="text-sm text-muted-foreground">{m > 0 ? `${m}m ` : ''}{s}s</span>
                    },
                  },
                  {
                    id: 'error',
                    header: 'Error',
                    cell: (row) => row.errorMessage
                      ? <span className="text-xs text-red-500 font-mono truncate max-w-[300px] block">{row.errorMessage}</span>
                      : <span className="text-muted-foreground">—</span>,
                  },
                ]}
                rows={runs}
                rowKey={(r) => r.id}
                loading={runsLoading}
                emptyMessage="No job runs found — this job has not been run yet."
              />
            </div>
          </motion.div>
        )}

        {/* Configuration tab */}
        {activeTab === 'configuration' && (
          <motion.div key="config" variants={itemVariants} className="space-y-4">
            <Card className="rounded-xl border bg-card/50 backdrop-blur-sm ring-1 ring-white/5">
              <CardHeader className="border-b border-border/50 pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Code2 className="size-4 text-muted-foreground" />
                  Default Arguments
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3">
                {jobLoading ? (
                  <Skeleton className="h-32" />
                ) : job?.defaultArguments && Object.keys(job.defaultArguments).length > 0 ? (
                  <div className="divide-y divide-border/50">
                    {Object.entries(job.defaultArguments).map(([k, v]) => (
                      <div key={k} className="flex items-start py-2.5 gap-4">
                        <span className="w-72 shrink-0 text-xs font-mono text-muted-foreground break-all">{k}</span>
                        <span className="text-xs font-mono text-foreground break-all">{v}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">No default arguments configured.</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* AI tab */}
        {activeTab === 'ai' && (
          <motion.div key="ai" variants={itemVariants}>
            <GlueAiQueryBar contextName={decodedName} contextType="job" />
          </motion.div>
        )}
      </motion.div>
    </PageContainer>
  )
}
