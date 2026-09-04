import { useMemo, useState, useCallback } from 'react'
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
import { Separator } from '@/components/ui/separator'

const TERMINAL = ['complete', 'partial', 'failed']

function applyFilters(findings, { search, category, severity }) {
  return findings.filter((f) => {
    if (category && f.category !== category) return false
    if (severity && f.severity !== severity) return false
    if (search) {
      const q = search.toLowerCase()
      if (!f.category.includes(q) && !f.logGroupName.toLowerCase().includes(q) &&
          !f.evidence?.some((e) => e.message?.toLowerCase().includes(q))) return false
    }
    return true
  })
}

function formatDuration(run) {
  if (!run?.completedAt) return null
  return Math.round((new Date(run.completedAt) - new Date(run.startedAt)) / 1000)
}

export function LogIntelligencePage() {
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

  const handleRunReport = useCallback(() => {
    startRun(timeRange)
  }, [startRun, timeRange])

  const sampledLogGroups = useMemo(() => {
    return new Set((run?.logGroupAnalyses ?? []).filter((lg) => lg.truncated).map((lg) => lg.logGroupName))
  }, [run?.logGroupAnalyses])

  const filteredFindings = isComplete ? applyFilters(run.findings ?? [], { search, category, severity }) : []

  return (
    <div className="flex flex-col gap-0 min-h-full">
      {/* ── Masthead ── */}
      <div className="border-b border-border px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Log Intelligence</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Operational report — CloudWatch Logs</p>
            {run && (
              <p className="text-[11px] font-mono text-muted-foreground/70 mt-2 flex items-center gap-x-3 gap-y-1 flex-wrap">
                <span>Generated {new Date(run.startedAt).toLocaleString()}</span>
                {duration != null && <span>· {duration}s</span>}
                <span>· run {run.id.slice(0, 8)}</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <EnvironmentSeal env={run?.env ?? activeEnvKey} />
            <TimeRangeToggle value={timeRange} onChange={setTimeRange} />
            <button
              onClick={handleRunReport}
              disabled={isStarting || !!isRunning}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isStarting || isRunning ? (
                <><span className="animate-spin text-xs">↻</span> Running…</>
              ) : '↻ Run Report'}
            </button>
          </div>
        </div>

        {/* Scope & methodology strip — the report's own honesty about what it covers */}
        {isComplete && run.status !== 'failed' && (
          <p className="max-w-screen-xl mx-auto mt-3 text-[11px] font-mono text-muted-foreground border-t border-border pt-2.5">
            {run.logGroupsDiscovered ?? 0} log groups discovered · {run.workersCompleted ?? 0} analyzed
            {(run.workersFailed ?? 0) > 0 && <> · {run.workersFailed} failed</>}
            {sampledLogGroups.size > 0 && <> · {sampledLogGroups.size} sampled (capped at 500 events)</>}
            {' '}· {timeRange === '7d' ? '7 day' : '24 hour'} window ending {new Date(run.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 px-6 py-5 max-w-screen-xl mx-auto w-full">

        {isLoading && <ReportSkeleton />}

        {!isLoading && !run && (
          <NoRunYetState onRunReport={handleRunReport} />
        )}

        {!isLoading && run && isRunning && (
          <RunningScreen run={run} />
        )}

        {!isLoading && isComplete && (
          <>
            {run.status === 'failed' && (
              <AnalysisFailedState error={run.error} onRetry={handleRunReport} />
            )}

            {(run.status === 'complete' || run.status === 'partial') && (
              <div className="space-y-5">

                {/* KPI ledger — deterministic ground truth */}
                <KpiLedger kpis={run.kpis} findings={run.findings} correlationsCount={run.correlations?.length ?? 0} />

                {/* AI interpretation column + ground-truth charts column */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                  <div className="lg:col-span-3 space-y-4">
                    <ExecutiveSummary summary={run.executiveSummary} />
                    <RootCauseCard rootCause={run.rootCause} />
                  </div>
                  <div className="lg:col-span-2 space-y-4">
                    <TrendChart kpis={run.kpis} timeRange={timeRange} />
                    <SeverityBreakdown findings={run.findings ?? []} />
                  </div>
                </div>

                {/* Category explorer */}
                <ErrorCategoryExplorer
                  kpis={run.kpis}
                  activeCategory={category}
                  onCategoryClick={setCategory}
                />

                <Separator />

                {/* Findings */}
                {(run.findings?.length ?? 0) > 0 ? (
                  <div className="space-y-3">
                    <FiltersBar
                      search={search} onSearchChange={setSearch}
                      category={category} onCategoryChange={setCategory}
                      severity={severity} onSeverityChange={setSeverity}
                    />
                    {filteredFindings.length > 0 ? (
                      <FindingsTable findings={filteredFindings} sampledLogGroups={sampledLogGroups} onSelect={setSelectedFinding} />
                    ) : (
                      <p className="text-sm text-muted-foreground py-8 text-center">No findings match the current filters.</p>
                    )}
                  </div>
                ) : (
                  <NoDataState onRunReport={handleRunReport} />
                )}

                {/* Correlations */}
                <CorrelationsList correlations={run.correlations} findings={run.findings} />

                {/* Log group table */}
                <LogGroupTable logGroupAnalyses={run.logGroupAnalyses} />

                {/* Methodology — collapsible */}
                <div>
                  <button
                    onClick={() => setShowMethodology((v) => !v)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                  >
                    <span>{showMethodology ? '▾' : '▸'}</span>
                    Methodology
                    {(run.specialists?.length ?? 0) > 0 && (
                      <span className="text-muted-foreground/60">
                        ({run.specialists.length} specialists · {run.workersSpawned} collectors)
                      </span>
                    )}
                  </button>
                  {showMethodology && <AgentActivityPanel run={run} />}
                </div>

                {run.status === 'partial' && (
                  <p className="text-xs text-amber-500 text-center pb-2">
                    ⚠ Partial results — {run.workersFailed} collector(s) failed. Findings shown are from successfully analyzed groups.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <FindingDetailDrawer
        finding={selectedFinding}
        open={!!selectedFinding}
        onClose={() => setSelectedFinding(null)}
        sampled={!!selectedFinding && sampledLogGroups.has(selectedFinding.logGroupName)}
      />
    </div>
  )
}
