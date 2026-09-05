import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Clock,
  ExternalLink,
  Filter,
  Lock,
  MoreHorizontal,
  Pause,
  Power,
  Radio,
  Route,
  ShieldOff,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  RULE_STATES,
  clockUTC,
  nextFireTimes,
  parseSchedule,
  patternSummary,
  ruleConcern,
  ruleState,
  targetSummary,
  triggerKind,
  untilLabel,
} from '../lib/rules'
import { TargetIcon } from './TargetIcon'
import { cn } from '@/lib/utils'

/**
 * One row per rule, read left to right as the wire it describes: what fires it,
 * what it is called, and where it delivers.
 *
 * The arrow is load-bearing rather than decorative — it is the only thing on the
 * row that states direction, and direction is most of what a rule is. Rules that
 * deliver nowhere get the arrow pointing at a stated absence instead of an empty
 * cell, because an empty cell reads as missing data rather than as the fault it is.
 */

const STATE_ICONS = { alert: AlertTriangle, pause: Pause, lock: Lock, check: Check }

function StateChip({ stateId }) {
  const state = RULE_STATES[stateId]
  const Icon = STATE_ICONS[state.icon]
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap text-xs', state.text)}>
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      {state.label}
    </span>
  )
}

/**
 * A rule's trigger in two lines: the reading, then the expression itself.
 *
 * Both are shown because they answer different questions — "daily at 02:00 UTC"
 * is what someone needs to know, and `cron(0 2 * * ? *)` is what they need to
 * copy or search for.
 */
function TriggerCell({ rule, now }) {
  const kind = triggerKind(rule)

  if (kind === 'schedule') {
    const schedule = parseSchedule(rule.scheduleExpression)
    const next = schedule?.kind === 'cron' ? nextFireTimes(schedule, { from: now, count: 1 })[0] : null
    return (
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 truncate text-xs text-foreground">
          <Clock className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          {schedule?.label ?? rule.scheduleExpression}
        </p>
        <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground" title={rule.scheduleExpression}>
          {next
            ? `next ${clockUTC(next)} UTC · ${untilLabel(next, now)}`
            : schedule?.kind === 'rate'
              ? rule.scheduleExpression
              : 'not in the next two days'}
        </p>
      </div>
    )
  }

  if (kind === 'pattern') {
    const pattern = patternSummary(rule.eventPattern)
    return (
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 truncate text-xs text-foreground" title={pattern.label}>
          <Radio className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          {pattern.source ?? 'custom pattern'}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground" title={pattern.detailType ?? undefined}>
          {pattern.detailType ?? `${pattern.keys.length} pattern ${pattern.keys.length === 1 ? 'field' : 'fields'}`}
        </p>
      </div>
    )
  }

  return <span className="text-xs text-muted-foreground">nothing can trigger it</span>
}

function TargetsCell({ rule }) {
  if (rule.targetCount == null) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ArrowRight className="size-3.5 shrink-0 opacity-40" aria-hidden="true" />
        could not be read
      </span>
    )
  }

  if (rule.targetCount === 0) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-destructive">
        <ArrowRight className="size-3.5 shrink-0" aria-hidden="true" />
        nowhere
      </span>
    )
  }

  const groups = targetSummary(rule.targets)
  const shown = groups.slice(0, 2)
  const rest = groups.slice(2).reduce((n, g) => n + g.count, 0)
  const unprotected = (rule.targets ?? []).filter((t) => !t.deadLetterArn).length

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="flex min-w-0 flex-wrap items-center gap-1">
        {shown.map((g) => (
          <span
            key={g.label}
            className="inline-flex min-w-0 max-w-[13rem] items-center gap-1 rounded-sm border border-border bg-muted/50 px-1.5 py-0.5"
            title={`${g.label}: ${g.firstName}${g.count > 1 ? ` and ${g.count - 1} more` : ''}`}
          >
            <TargetIcon icon={g.icon} className="size-3 shrink-0 text-muted-foreground" />
            <span className="truncate font-mono text-[11px] text-foreground">{g.firstName}</span>
            {g.count > 1 && (
              <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">×{g.count}</span>
            )}
          </span>
        ))}
        {rest > 0 && <span className="shrink-0 text-[11px] text-muted-foreground">+{rest} more</span>}
        {unprotected > 0 && (
          <ShieldOff
            className="size-3 shrink-0 text-warning"
            aria-label={`${unprotected} of these targets have no dead-letter queue`}
          />
        )}
      </div>
    </div>
  )
}

function EmptyState({ filtered, onClear }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
      {filtered ? (
        <>
          <Filter className="size-6 text-muted-foreground/50" aria-hidden="true" />
          <p className="text-sm text-foreground">No rules match this filter.</p>
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Show all rules
          </button>
        </>
      ) : (
        <>
          <Route className="size-6 text-muted-foreground/50" aria-hidden="true" />
          <p className="text-sm text-foreground">No rules on any bus yet.</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            A rule matches events or runs on a schedule, then delivers to targets like a Lambda or a queue.
          </p>
        </>
      )}
    </div>
  )
}

/**
 * Five columns on a desktop, where this page lives. Below that the row folds into
 * a block — name and state on the first line, then trigger, then targets —
 * because five truncated columns at 400px are five columns of ellipsis.
 *
 * The narrow layout is flex rather than grid on purpose: in a two-track grid, a
 * cell spanning both tracks still feeds its own width into their sizing, so one
 * row with wide target chips shrinks the name column to nothing for that row. A
 * `basis-full` flex item takes its own line and leaves the line above alone.
 * `md:order-none` resets every cell so the desktop grid fills in DOM order.
 */
const COLUMNS =
  'flex flex-wrap items-center gap-x-3 gap-y-1.5 md:grid md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.1fr)_minmax(0,1.2fr)_auto_auto] md:gap-4'
const CELL_NAME = 'order-1 min-w-0 flex-1 basis-0 md:order-none'
const CELL_STATE = 'order-2 shrink-0 md:order-none'
const CELL_ACTIONS = 'order-3 shrink-0 md:order-none md:justify-self-end'
const CELL_TRIGGER = 'order-4 min-w-0 basis-full md:order-none md:basis-auto'
const CELL_TARGETS = 'order-5 min-w-0 basis-full md:order-none md:basis-auto'

export function RuleLedger({
  rules,
  loading,
  filtered,
  onClearFilter,
  onToggleState,
  busyRule,
  consoleUrl,
  showBus = true,
  now = new Date(),
}) {
  if (loading) {
    return (
      <div className="divide-y divide-border/60">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="ml-auto h-4 w-16" />
          </div>
        ))}
      </div>
    )
  }

  if (!rules.length) return <EmptyState filtered={filtered} onClear={onClearFilter} />

  return (
    <div role="table" className="text-sm">
      <div
        role="row"
        className={cn(
          COLUMNS,
          'hidden border-b border-border px-4 py-2 text-xs font-medium text-muted-foreground md:grid',
        )}
      >
        <span role="columnheader">Rule</span>
        <span role="columnheader">Trigger</span>
        <span role="columnheader">Delivers to</span>
        <span role="columnheader">State</span>
        <span role="columnheader" className="sr-only">
          Actions
        </span>
      </div>

      <div className="divide-y divide-border/60">
        {rules.map((rule) => {
          const stateId = ruleState(rule)
          const concern = ruleConcern(rule)
          const busy = busyRule === `${rule.eventBusName}/${rule.name}`
          const enabled = rule.state === 'ENABLED'
          const href = `/eventbridge/buses/${encodeURIComponent(rule.eventBusName)}/rules/${encodeURIComponent(rule.name)}`

          return (
            <div
              key={`${rule.eventBusName}/${rule.name}`}
              role="row"
              className={cn(COLUMNS, 'group px-4 py-2.5 transition-colors hover:bg-accent/40', busy && 'opacity-50')}
            >
              <div role="cell" className={cn('min-w-0', CELL_NAME)}>
                <Link
                  to={href}
                  className="block truncate font-mono text-xs text-foreground underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  title={rule.name}
                >
                  {rule.name}
                </Link>
                {/* One line of explanation, and only when something is actually
                    wrong. Otherwise the space says which bus the rule is on,
                    which is the fact a reader is most likely to want next. */}
                {concern ? (
                  <p
                    className={cn(
                      'mt-0.5 truncate text-[11px]',
                      stateId === 'deadEnd' ? 'text-destructive' : 'text-muted-foreground',
                    )}
                    title={concern}
                  >
                    {concern}
                  </p>
                ) : (
                  showBus && (
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">on {rule.eventBusName}</p>
                  )
                )}
              </div>

              <div role="cell" className={cn('min-w-0', CELL_TRIGGER)}>
                <TriggerCell rule={rule} now={now} />
              </div>

              <div role="cell" className={cn('min-w-0', CELL_TARGETS)}>
                <TargetsCell rule={rule} />
              </div>

              <div role="cell" className={CELL_STATE}>
                <StateChip stateId={stateId} />
              </div>

              <div role="cell" className={CELL_ACTIONS}>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    disabled={busy}
                    /* Revealed on hover at desktop width, always visible on a
                       touch screen where there is no hover to reveal it. */
                    className="flex size-7 items-center justify-center rounded-sm text-muted-foreground transition-opacity hover:bg-accent hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring/40 data-[state=open]:opacity-100 md:opacity-0 md:group-hover:opacity-100"
                  >
                    <MoreHorizontal className="size-4" />
                    <span className="sr-only">Actions for {rule.name}</span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem asChild>
                      <Link to={href}>
                        <Route className="size-3.5" />
                        Open this rule
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={Boolean(rule.managedBy)}
                      onClick={() => onToggleState(rule, !enabled)}
                    >
                      <Power className="size-3.5" />
                      {rule.managedBy
                        ? `Owned by ${rule.managedBy}`
                        : enabled
                          ? 'Turn this rule off'
                          : 'Turn this rule on'}
                    </DropdownMenuItem>
                    {consoleUrl && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <a href={consoleUrl(rule)} target="_blank" rel="noreferrer">
                            <ExternalLink className="size-3.5" />
                            View in the AWS console
                          </a>
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
