import { Clock, Radio } from 'lucide-react'
import { clockUTC, nextFireTimes, parseSchedule, untilLabel } from '../lib/rules'
import { CopyButton } from './CopyButton'

/**
 * What sets a rule off, in full.
 *
 * A schedule and an event pattern are the same thing — a trigger — but they need
 * opposite treatments. A schedule's expression is short and its consequence is
 * hard to picture, so the consequence is shown: the next five times it will
 * actually run. A pattern's consequence is easy to state and its expression is
 * long, so the expression is shown in full, with the constraints it places on an
 * event summarised above it in words.
 */

function readablePattern(parsed) {
  const lines = []
  const list = (v) => (Array.isArray(v) ? v : [v])

  for (const [key, value] of Object.entries(parsed)) {
    if (key === 'detail') continue
    const values = list(value).filter((v) => typeof v === 'string' || typeof v === 'number')
    if (values.length === 0) continue
    lines.push({
      key,
      text:
        values.length === 1
          ? `${key} is ${values[0]}`
          : `${key} is one of ${values.slice(0, 3).join(', ')}${values.length > 3 ? ` and ${values.length - 3} more` : ''}`,
    })
  }

  if (parsed.detail && typeof parsed.detail === 'object') {
    const keys = Object.keys(parsed.detail)
    lines.push({
      key: 'detail',
      text: `the event body is filtered on ${keys.slice(0, 3).join(', ')}${keys.length > 3 ? ` and ${keys.length - 3} more` : ''}`,
    })
  }

  return lines
}

export function TriggerPanel({ rule, now = new Date() }) {
  if (rule.scheduleExpression) {
    const schedule = parseSchedule(rule.scheduleExpression)
    const upcoming = schedule?.kind === 'cron' ? nextFireTimes(schedule, { from: now, count: 5, horizonHours: 24 * 40 }) : []

    return (
      <div className="space-y-3 px-4 py-4">
        <div className="flex items-start gap-2.5">
          <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm text-foreground">{schedule?.label ?? rule.scheduleExpression}</p>
            <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
              <code className="truncate font-mono text-xs text-muted-foreground">{rule.scheduleExpression}</code>
              <CopyButton value={rule.scheduleExpression} label="schedule expression" />
            </div>
          </div>
        </div>

        {schedule?.kind === 'rate' ? (
          <p className="rounded-sm border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            A rate schedule counts from whenever the rule was created or last re-enabled. AWS does not report that
            instant, so the exact clock times cannot be shown — only the interval.
          </p>
        ) : upcoming.length > 0 ? (
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Next runs</p>
            <ul className="divide-y divide-border/60 rounded-sm border border-border">
              {upcoming.map((t) => (
                <li key={t.toISOString()} className="flex items-baseline justify-between gap-3 px-3 py-1.5">
                  <span className="font-mono text-xs tabular-nums text-foreground">
                    {t.toISOString().slice(0, 10)} {clockUTC(t)} UTC
                  </span>
                  <span className="text-[11px] text-muted-foreground">{untilLabel(t, now)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            This view could not read the schedule closely enough to list its next runs.
          </p>
        )}

        {rule.state !== 'ENABLED' && (
          <p className="text-xs text-warning">
            The rule is switched off, so none of these runs will happen until it is turned back on.
          </p>
        )}
      </div>
    )
  }

  if (rule.eventPattern) {
    let parsed = null
    try {
      parsed = JSON.parse(rule.eventPattern)
    } catch {
      parsed = null
    }
    const lines = parsed ? readablePattern(parsed) : []

    return (
      <div className="space-y-3 px-4 py-4">
        <div className="flex items-start gap-2.5">
          <Radio className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm text-foreground">Fires on any event that matches this pattern</p>
            {lines.length > 0 && (
              <ul className="mt-1 space-y-0.5">
                {lines.map((l) => (
                  <li key={l.key} className="text-xs text-muted-foreground">
                    {l.text}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="relative">
          <pre className="max-h-80 overflow-auto rounded-sm border border-border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed text-foreground">
            {parsed ? JSON.stringify(parsed, null, 2) : rule.eventPattern}
          </pre>
          <CopyButton
            value={rule.eventPattern}
            label="event pattern"
            className="absolute right-2 top-2 rounded-sm bg-card p-1"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-10 text-center">
      <p className="text-sm text-destructive">This rule has no schedule and no event pattern.</p>
      <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
        Nothing can trigger it, so its targets will never receive anything.
      </p>
    </div>
  )
}
