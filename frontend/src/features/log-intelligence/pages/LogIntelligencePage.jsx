import { useState, useCallback } from 'react'
import { useStartReportRun } from '../hooks/useStartReportRun'
import { useLatestReportRun } from '../hooks/useLatestReportRun'
import { Header } from '../components/Header'
import { TimeRangeToggle } from '../components/TimeRangeToggle'
import { ExecutiveSummary } from '../components/ExecutiveSummary'
import { KpiStrip } from '../components/KpiStrip'
import { ErrorCategoryExplorer } from '../components/ErrorCategoryExplorer'
import { SeverityBreakdown } from '../components/SeverityBreakdown'
import { TrendChart } from '../components/TrendChart'
import { TopIssuesList } from '../components/TopIssuesList'
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
  return findings.filter(f => {
    if (category && f.category !== category) return false
    if (severity && f.severity !== severity) return false
    if (search) {
      const q = search.toLowerCase()
      if (!f.category.includes(q) && !f.logGroupName.toLowerCase().includes(q) &&
          !f.evidence?.some(e => e.message?.toLowerCase().includes(q))) return false
    }
    return true
  })
}

function RunMeta({ run }) {
  if (!run) return null
  const duration = run.completedAt
    ? Math.round((new Date(run.completedAt) - new Date(run.startedAt)) / 1000)
    : null
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span>Started {new Date(run.startedAt).toLocaleString()}</span>
      {duration != null && <span>· {duration}s</span>}
      {(run.specialists?.length ?? 0) > 0 && (
        <span>· {run.specialists.length} specialist agents</span>
      )}
      {run.workersFailed > 0 && (
        <span className="text-amber-500">· {run.workersFailed} collector(s) failed</span>
      )}
    </div>
  )
}

export function LogIntelligencePage() {
  const [timeRange, setTimeRange] = useState('24h')
  const [selectedFinding, setSelectedFinding] = useState(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState(null)
  const [severity, setSeverity] = useState(null)
  const [showActivity, setShowActivity] = useState(false)

  const { mutate: startRun, isPending: isStarting } = useStartReportRun()
  const { data: run, isLoading } = useLatestReportRun(timeRange)

  const isRunning = run && !TERMINAL.includes(run.status)
  const isComplete = run && TERMINAL.includes(run.status)

  const handleRunReport = useCallback(() => {
    startRun(timeRange)
  }, [startRun, timeRange])

  const filteredFindings = isComplete ? applyFilters(run.findings ?? [], { search, category, severity }) : []

  return (
    <div className="flex flex-col gap-0 min-h-full">
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-6 py-3">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-base font-semibold text-foreground">Log Intelligence</h1>
            {run && <RunMeta run={run} />}
          </div>
          <div className="flex items-center gap-2">
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

                {/* KPI strip */}
                <KpiStrip kpis={run.kpis} />

                {/* Two-column: summary + charts */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                  <div className="lg:col-span-3">
                    <ExecutiveSummary run={run} />
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
                    <TopIssuesList findings={filteredFindings} onSelect={setSelectedFinding} />
                  </div>
                ) : (
                  <NoDataState onRunReport={handleRunReport} />
                )}

                {/* Log group table */}
                <LogGroupTable logGroupAnalyses={run.logGroupAnalyses} />

                {/* Agent activity — collapsible */}
                <div>
                  <button
                    onClick={() => setShowActivity(v => !v)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                  >
                    <span>{showActivity ? '▾' : '▸'}</span>
                    Agent Activity
                    {(run.specialists?.length ?? 0) > 0 && (
                      <span className="text-muted-foreground/60">
                        ({run.specialists.length} specialists · {run.workersSpawned} collectors)
                      </span>
                    )}
                  </button>
                  {showActivity && <AgentActivityPanel run={run} />}
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
      />
    </div>
  )
}
