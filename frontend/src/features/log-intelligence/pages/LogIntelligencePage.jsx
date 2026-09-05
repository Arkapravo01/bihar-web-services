import { useMemo, useState, useCallback } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { BrainCircuit, ChevronDown, CloudCog, DatabaseZap, History, Play, RefreshCw, ShieldCheck } from 'lucide-react'
import { useActiveEnv } from '@/app/providers/ActiveEnvProvider'
import { useStartReportRun } from '../hooks/useStartReportRun'
import { useLatestReportRun } from '../hooks/useLatestReportRun'
import { TimeRangeToggle } from '../components/TimeRangeToggle'
import { EnvironmentSeal } from '../components/EnvironmentSeal'
import { ExecutiveSummary } from '../components/ExecutiveSummary'
import { RootCauseCard } from '../components/RootCauseCard'
import { KpiLedger } from '../components/KpiLedger'
import { ErrorCategoryExplorer } from '../components/ErrorCategoryExplorer'
import { SeverityBreakdown } from '../components/SeverityBreakdown'
import { TrendChart } from '../components/TrendChart'
import { FindingsTable } from '../components/FindingsTable'
import { CorrelationsList } from '../components/CorrelationsList'
import { LogGroupTable } from '../components/LogGroupTable'
import { FindingDetailDrawer } from '../components/FindingDetailDrawer'
import { AgentActivityPanel } from '../components/AgentActivityPanel'
import { FiltersBar } from '../components/FiltersBar'
import { ReportSkeleton } from '../components/LoadingSkeletons'
import { NoDataState, AnalysisFailedState, NoRunYetState } from '../components/EmptyAndErrorStates'
import { RunningScreen } from '../components/RunningScreen'

const TERMINAL = ['complete', 'partial', 'failed']
const REVEAL = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }

function SectionHeading({ eyebrow, title, description, icon: Icon }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/15">
        <Icon className="size-4" aria-hidden="true" />
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/80">{eyebrow}</p>
        <h2 className="mt-0.5 text-base font-semibold tracking-[-0.015em] text-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>}
      </div>
    </div>
  )
}

function applyFilters(findings, { search, category, severity }) {
  return findings.filter((finding) => {
    if (category && finding.category !== category) return false
    if (severity && finding.severity !== severity) return false
    if (search) {
      const query = search.toLowerCase()
      if (!finding.category.includes(query) && !finding.logGroupName.toLowerCase().includes(query) &&
          !finding.evidence?.some((item) => item.message?.toLowerCase().includes(query))) return false
    }
    return true
  })
}

function formatDuration(run) {
  if (!run?.completedAt) return null
  return Math.round((new Date(run.completedAt) - new Date(run.startedAt)) / 1000)
}

export function LogIntelligencePage() {
  const reduceMotion = useReducedMotion()
  const { activeEnvKey } = useActiveEnv()
  const [timeRange, setTimeRange] = useState('24h')
  const [selectedFinding, setSelectedFinding] = useState(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState(null)
  const [severity, setSeverity] = useState(null)
  const [showMethodology, setShowMethodology] = useState(false)
  const { mutate: startRun, isPending: isStarting } = useStartReportRun()
  const { data: run, isLoading } = useLatestReportRun(timeRange)
  const isRunning = run && !TERMINAL.includes(run.status)
  const isComplete = run && TERMINAL.includes(run.status)
  const duration = formatDuration(run)

  const handleRunReport = useCallback(() => startRun(timeRange), [startRun, timeRange])
  const sampledLogGroups = useMemo(() => new Set(
    (run?.logGroupAnalyses ?? []).filter((group) => group.truncated).map((group) => group.logGroupName)
  ), [run?.logGroupAnalyses])
  const filteredFindings = isComplete ? applyFilters(run.findings ?? [], { search, category, severity }) : []

  const reportStatus = isRunning
    ? { label: 'Analysis in progress', className: 'bg-primary' }
    : run?.status === 'failed'
      ? { label: 'Analysis failed', className: 'bg-destructive' }
      : run?.status === 'partial'
        ? { label: 'Partial report', className: 'bg-amber-500' }
        : run
          ? { label: 'Report ready', className: 'bg-positive' }
          : { label: 'Ready to analyze', className: 'bg-muted-foreground' }

  return (
    <div className="log-intelligence-page relative flex min-h-full flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle_at_78%_0%,color-mix(in_srgb,var(--primary)_13%,transparent),transparent_46%)]" />

      <motion.header
        initial={reduceMotion ? false : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative border-b border-border/70 bg-background/75 px-5 py-5 backdrop-blur-xl lg:px-8"
      >
        <div className="mx-auto max-w-[1480px]">
          <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
            <div className="flex min-w-0 items-start gap-4">
              <div className="hidden size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_12px_30px_-12px_color-mix(in_srgb,var(--primary)_70%,transparent)] sm:flex">
                <BrainCircuit className="size-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl font-semibold tracking-[-0.035em] text-foreground">Log Intelligence</h1>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/70 px-2.5 py-1 text-[10px] font-medium text-muted-foreground shadow-sm">
                    <span className={`size-1.5 rounded-full ${reportStatus.className} ${isRunning ? 'animate-pulse' : ''}`} />
                    {reportStatus.label}
                  </span>
                </div>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">AI-assisted operational analysis across your CloudWatch estate.</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground/80">
                  <span className="inline-flex items-center gap-1.5"><CloudCog className="size-3" /> CloudWatch Logs</span>
                  {run && <>
                    <span className="inline-flex items-center gap-1.5"><History className="size-3" /> {new Date(run.startedAt).toLocaleString()}</span>
                    {duration != null && <span className="font-mono tabular-nums">{duration}s runtime</span>}
                    <span className="font-mono">ID {run.id.slice(0, 8)}</span>
                  </>}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/70 bg-card/65 p-1.5 shadow-sm backdrop-blur-md">
              <EnvironmentSeal env={run?.env ?? activeEnvKey} />
              <div className="hidden h-6 w-px bg-border/70 sm:block" />
              <TimeRangeToggle value={timeRange} onChange={setTimeRange} />
              <button
                onClick={handleRunReport}
                disabled={isStarting || !!isRunning}
                className="group inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-3.5 text-xs font-semibold text-primary-foreground shadow-[0_6px_18px_-7px_color-mix(in_srgb,var(--primary)_80%,transparent)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 disabled:pointer-events-none disabled:opacity-50"
              >
                {isStarting || isRunning
                  ? <><RefreshCw className="size-3.5 animate-spin" /> Running analysis</>
                  : <><Play className="size-3.5 fill-current transition-transform group-hover:scale-110" /> Run report</>}
              </button>
            </div>
          </div>

          {isComplete && run.status !== 'failed' && (
            <div className="mt-5 grid grid-cols-2 overflow-hidden rounded-xl border border-border/60 bg-card/40 sm:grid-cols-4 lg:inline-grid">
              {[
                ['Discovered', run.logGroupsDiscovered ?? 0],
                ['Analyzed', run.workersCompleted ?? 0],
                ['Failed', run.workersFailed ?? 0],
                ['Coverage', timeRange === '7d' ? '7 days' : '24 hours'],
              ].map(([label, value]) => (
                <div key={label} className="min-w-28 border-r border-border/60 px-3.5 py-2.5 last:border-r-0">
                  <p className="font-mono text-xs font-semibold tabular-nums text-foreground">{value}</p>
                  <p className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.header>

      <main className="relative mx-auto w-full max-w-[1480px] flex-1 px-5 py-6 lg:px-8 lg:py-8">
        {isLoading && <ReportSkeleton />}
        {!isLoading && !run && <NoRunYetState onRunReport={handleRunReport} />}
        {!isLoading && run && isRunning && <RunningScreen run={run} />}
        {!isLoading && isComplete && <>
          {run.status === 'failed' && <AnalysisFailedState error={run.error} onRetry={handleRunReport} />}
          {(run.status === 'complete' || run.status === 'partial') && (
            <motion.div initial="hidden" animate="visible" transition={{ staggerChildren: reduceMotion ? 0 : 0.065 }} className="space-y-8">
              <motion.section variants={REVEAL} transition={{ duration: 0.35 }} aria-label="Report overview">
                <KpiLedger kpis={run.kpis} findings={run.findings} correlationsCount={run.correlations?.length ?? 0} />
              </motion.section>

              <motion.section variants={REVEAL} transition={{ duration: 0.35 }} className="space-y-4">
                <SectionHeading eyebrow="Synthesis" title="Operational assessment" description="Machine interpretation paired with deterministic event signals." icon={BrainCircuit} />
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
                  <div className="space-y-4 xl:col-span-7">
                    <ExecutiveSummary summary={run.executiveSummary} />
                    <RootCauseCard rootCause={run.rootCause} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 xl:col-span-5 xl:grid-cols-1">
                    <TrendChart kpis={run.kpis} timeRange={timeRange} />
                    <SeverityBreakdown findings={run.findings ?? []} />
                  </div>
                </div>
              </motion.section>

              <motion.section variants={REVEAL} transition={{ duration: 0.35 }} className="space-y-4">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                  <SectionHeading eyebrow="Evidence" title="Findings workspace" description="Triage, filter, and open the underlying log evidence." icon={DatabaseZap} />
                  {(run.findings?.length ?? 0) > 0 && <FiltersBar search={search} onSearchChange={setSearch} category={category} onCategoryChange={setCategory} severity={severity} onSeverityChange={setSeverity} />}
                </div>
                <ErrorCategoryExplorer kpis={run.kpis} activeCategory={category} onCategoryClick={setCategory} />
                {(run.findings?.length ?? 0) > 0
                  ? filteredFindings.length > 0
                    ? <FindingsTable findings={filteredFindings} sampledLogGroups={sampledLogGroups} onSelect={setSelectedFinding} />
                    : <div className="rounded-2xl border border-dashed border-border bg-card/40 py-12 text-center text-sm text-muted-foreground">No findings match the current filters.</div>
                  : <NoDataState onRunReport={handleRunReport} />}
              </motion.section>

              <motion.section variants={REVEAL} transition={{ duration: 0.35 }} className="space-y-4">
                <SectionHeading eyebrow="Topology" title="Signal relationships" description="Related patterns and per-group analysis coverage." icon={CloudCog} />
                <div className="grid grid-cols-1 gap-4 2xl:grid-cols-5">
                  <div className="2xl:col-span-2"><CorrelationsList correlations={run.correlations} findings={run.findings} /></div>
                  <div className="2xl:col-span-3"><LogGroupTable logGroupAnalyses={run.logGroupAnalyses} /></div>
                </div>
              </motion.section>

              <motion.section variants={REVEAL} transition={{ duration: 0.35 }} className="border-t border-border/70 pt-5">
                <button onClick={() => setShowMethodology((value) => !value)} aria-expanded={showMethodology} className="group flex w-full items-center justify-between rounded-xl px-2 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-card/60 hover:text-foreground">
                  <span className="inline-flex items-center gap-2"><ShieldCheck className="size-3.5" /> Analysis methodology <span className="text-muted-foreground/60">{run.specialists?.length ?? 0} specialists · {run.workersSpawned} collectors</span></span>
                  <ChevronDown className={`size-4 transition-transform duration-200 ${showMethodology ? 'rotate-180' : ''}`} />
                </button>
                {showMethodology && <AgentActivityPanel run={run} />}
              </motion.section>

              {run.status === 'partial' && <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-center text-xs text-amber-600">Partial results — {run.workersFailed} collector(s) failed. Findings shown are from successfully analyzed groups.</p>}
            </motion.div>
          )}
        </>}
      </main>

      <FindingDetailDrawer finding={selectedFinding} open={!!selectedFinding} onClose={() => setSelectedFinding(null)} sampled={!!selectedFinding && sampledLogGroups.has(selectedFinding.logGroupName)} />
    </div>
  )
}
