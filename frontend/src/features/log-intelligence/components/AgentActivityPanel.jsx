import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

const STATUS_ICON = {
  COMPLETED: '✓', FAILED: '✗', TIMED_OUT: '⏱',
  NO_DATA: '–', RUNNING: '●', QUEUED: '○', CANCELLED: '⊘',
}
const STATUS_COLOR = {
  COMPLETED: 'text-green-600 dark:text-green-400',
  FAILED: 'text-destructive',
  TIMED_OUT: 'text-amber-500',
  NO_DATA: 'text-muted-foreground',
  RUNNING: 'text-primary animate-pulse',
  QUEUED: 'text-muted-foreground/50',
  CANCELLED: 'text-muted-foreground/50',
}
const SPECIALIST_STATUS_VARIANT = {
  COMPLETED: 'outline', FAILED: 'destructive', RUNNING: 'secondary',
  QUEUED: 'outline', TIMED_OUT: 'destructive',
}

const STAGE_LABELS = {
  queued: 'Initializing',
  discovering: 'Discovering log groups',
  collecting: 'Collecting log events',
  spawning_specialists: 'Spawning specialist agents',
  analyzing: 'Running specialist analysis',
  correlating: 'Correlating findings',
  generating_summary: 'Generating AI summary',
  complete: 'Analysis complete',
  partial: 'Partial results (some workers failed)',
  failed: 'Analysis failed',
}

export function AgentActivityPanel({ run }) {
  if (!run) return null

  const isRunning = !['complete', 'partial', 'failed'].includes(run.status)
  const collectors = run.workers ?? []
  const specialists = run.specialists ?? []

  const collectorDone = collectors.filter(w => ['COMPLETED', 'NO_DATA'].includes(w.status)).length
  const collectorFailed = collectors.filter(w => ['FAILED', 'TIMED_OUT'].includes(w.status)).length
  const total = run.workersSpawned || 1
  const progressValue = Math.round(((run.workersCompleted + run.workersFailed) / total) * 100)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Agent Activity</CardTitle>
          <span className="text-xs text-muted-foreground">{STAGE_LABELS[run.status] ?? run.status}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Phase 1 — Log Collectors */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Phase 1 — Log Collectors
            </p>
            <span className="text-xs text-muted-foreground font-mono">
              {run.workersCompleted}/{run.workersSpawned}
            </span>
          </div>
          {isRunning && <Progress value={progressValue} className="h-1 mb-2" />}
          <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-xs text-muted-foreground">
            <span>Discovered: <strong className="text-foreground">{run.logGroupsDiscovered}</strong></span>
            <span>Spawned: <strong className="text-foreground">{run.workersSpawned}</strong></span>
            <span>Completed: <strong className="text-green-600 dark:text-green-400">{run.workersCompleted}</strong></span>
            <span>Failed: <strong className={run.workersFailed > 0 ? 'text-destructive' : 'text-foreground'}>{run.workersFailed}</strong></span>
          </div>
          {collectors.length > 0 && (
            <div className="flex flex-wrap gap-px mt-2">
              {collectors.map((w) => (
                <span
                  key={w.agentId}
                  title={`${w.logGroupName} — ${w.status}${w.error ? ': ' + w.error : ''}`}
                  className={`text-[10px] font-mono leading-none ${STATUS_COLOR[w.status] ?? 'text-muted-foreground'}`}
                >
                  {STATUS_ICON[w.status] ?? '?'}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Phase 2 — Specialist Agents */}
        {specialists.length > 0 && (
          <>
            <Separator />
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Phase 2 — Specialist Agents
              </p>
              <div className="space-y-1.5">
                {specialists.map((s) => (
                  <div key={s.agentId} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`text-xs font-mono shrink-0 ${STATUS_COLOR[s.status] ?? 'text-muted-foreground'}`}>
                        {STATUS_ICON[s.status] ?? '?'}
                      </span>
                      <span className="text-xs text-foreground truncate">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {s.findingsCount > 0 && (
                        <span className="text-[10px] text-muted-foreground font-mono">{s.findingsCount} findings</span>
                      )}
                      <Badge
                        variant={SPECIALIST_STATUS_VARIANT[s.status] ?? 'outline'}
                        className="text-[9px] px-1 py-0 h-4"
                      >
                        {s.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

      </CardContent>
    </Card>
  )
}
