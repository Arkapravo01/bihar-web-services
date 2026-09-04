import { Progress } from '@/components/ui/progress'

const STAGE_LABELS = {
  queued: 'Initializing…',
  discovering: 'Discovering log groups…',
  collecting: 'Collecting log events in parallel…',
  spawning_specialists: 'Spawning specialist agents…',
  analyzing: 'Running specialist analysis…',
  correlating: 'Correlating findings…',
  generating_summary: 'Generating AI summary…',
}

const STATUS_ICON = {
  COMPLETED: '✓', FAILED: '✗', TIMED_OUT: '⏱',
  NO_DATA: '–', RUNNING: '●', QUEUED: '○',
}
const STATUS_COLOR = {
  COMPLETED: 'text-green-600 dark:text-green-400',
  FAILED: 'text-destructive', TIMED_OUT: 'text-amber-500',
  NO_DATA: 'text-muted-foreground/40', RUNNING: 'text-primary animate-pulse',
  QUEUED: 'text-muted-foreground/30',
}

export function RunningScreen({ run }) {
  if (!run) return null

  const total = run.workersSpawned || 1
  const progressValue = Math.round(((run.workersCompleted + run.workersFailed) / total) * 100)
  const specialists = run.specialists ?? []
  const activeSpecialist = specialists.find(s => s.status === 'RUNNING')

  return (
    <div className="flex flex-col gap-6 py-10">
      {/* Stage + progress */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">
            {STAGE_LABELS[run.status] ?? run.status}
          </p>
          {run.workersSpawned > 0 && (
            <span className="text-xs text-muted-foreground font-mono">
              {run.workersCompleted + run.workersFailed}/{run.workersSpawned} collectors
            </span>
          )}
        </div>
        <Progress value={progressValue} className="h-1.5" />
      </div>

      {/* Two-column: collectors + specialists */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Collector dot map */}
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Phase 1 · Log Collectors
          </p>
          <div className="grid grid-cols-3 gap-1 text-xs text-muted-foreground">
            <div>
              <p className="font-mono font-medium text-foreground text-base tabular-nums">{run.logGroupsDiscovered ?? 0}</p>
              <p>discovered</p>
            </div>
            <div>
              <p className="font-mono font-medium text-green-600 dark:text-green-400 text-base tabular-nums">{run.workersCompleted ?? 0}</p>
              <p>done</p>
            </div>
            <div>
              <p className={`font-mono font-medium text-base tabular-nums ${(run.workersFailed ?? 0) > 0 ? 'text-destructive' : 'text-foreground'}`}>
                {run.workersFailed ?? 0}
              </p>
              <p>failed</p>
            </div>
          </div>
          {(run.workers ?? []).length > 0 && (
            <div className="flex flex-wrap gap-px pt-1">
              {run.workers.map(w => (
                <span
                  key={w.agentId}
                  title={`${w.logGroupName} — ${w.status}`}
                  className={`text-[9px] font-mono leading-none ${STATUS_COLOR[w.status] ?? 'text-muted-foreground'}`}
                >
                  {STATUS_ICON[w.status] ?? '?'}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Specialist list */}
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Phase 2 · Specialist Agents
          </p>
          {specialists.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Awaiting collection…</p>
          ) : (
            <div className="space-y-1">
              {specialists.map(s => (
                <div key={s.agentId} className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-mono shrink-0 ${STATUS_COLOR[s.status] ?? 'text-muted-foreground'}`}>
                    {STATUS_ICON[s.status] ?? '○'}
                  </span>
                  <span className={`text-xs truncate ${s.status === 'RUNNING' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                    {s.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
