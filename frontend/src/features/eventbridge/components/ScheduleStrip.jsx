import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { clockUTC, nextFireTimes, parseSchedule, ruleState, RULE_STATES, untilLabel } from '../lib/rules'
import { cn } from '@/lib/utils'

/**
 * Today, as EventBridge will actually run it.
 *
 * Scheduled rules are the part of this service that has a shape in time, and no
 * table can show that shape: a column of cron strings tells you a rule exists,
 * not that four separate jobs all fire at 02:00 and nothing runs for the eight
 * hours after. One shared 24-hour axis makes both facts visible at a glance, and
 * the "now" line turns it from a description into a position — what already ran
 * today is behind the line, what is still coming is in front of it.
 *
 * Two honesty rules govern what gets drawn:
 *
 * A `rate(...)` schedule fires from whenever its rule was last created or
 * re-enabled, and no API returns that instant. The phase is unknowable, so rate
 * rules are drawn as a hatched band across the whole day rather than as ticks at
 * invented times. A dense cron schedule — anything firing more often than every
 * half hour — becomes the same band, because 288 tick marks is a smear, and a
 * smear is what "continuously" looks like anyway.
 *
 * Disabled rules and rules whose schedule does not land today are excluded and
 * counted in the caption. A timeline that shows things which will not happen is
 * worse than no timeline.
 */

const HOURS = [0, 6, 12, 18]
const DAY_MINUTES = 1440
/** More often than every 30 minutes reads as continuous, not as events. */
const BAND_THRESHOLD = 48

function buildLane(rule, dayStart, dayEnd, now) {
  const schedule = parseSchedule(rule.scheduleExpression)
  if (!schedule) return null

  if (schedule.kind === 'rate') {
    return {
      rule,
      schedule,
      mode: 'band',
      firesToday: true,
      ticks: [],
      next: null,
    }
  }

  if (!schedule.parsed) {
    return { rule, schedule, mode: 'unparsed', firesToday: false, ticks: [], next: null }
  }

  // Scanning starts a minute before midnight so a rule firing at 00:00 is caught.
  const times = nextFireTimes(schedule, {
    from: new Date(dayStart.getTime() - 60_000),
    count: 400,
    horizonHours: 25,
  }).filter((t) => t >= dayStart && t < dayEnd)

  if (times.length === 0) {
    return { rule, schedule, mode: 'none', firesToday: false, ticks: [], next: nextFireTimes(schedule, { from: now, count: 1 })[0] ?? null }
  }

  return {
    rule,
    schedule,
    mode: times.length > BAND_THRESHOLD ? 'band' : 'ticks',
    firesToday: true,
    ticks: times,
    next: times.find((t) => t > now) ?? null,
  }
}

function localOffsetNote() {
  // getTimezoneOffset is minutes behind UTC, so its sign is inverted.
  const minutes = -new Date().getTimezoneOffset()
  if (minutes === 0) return 'Times are UTC, which matches your clock.'
  const hours = Math.abs(minutes) / 60
  const amount = Number.isInteger(hours) ? `${hours} ${hours === 1 ? 'hour' : 'hours'}` : `${(minutes / 60).toFixed(1)} hours`
  return `Times are UTC. Your clock is ${amount} ${minutes > 0 ? 'ahead' : 'behind'}.`
}

export function ScheduleStrip({ rules, now = new Date() }) {
  const { lanes, hidden } = useMemo(() => {
    const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    const dayEnd = new Date(dayStart.getTime() + DAY_MINUTES * 60_000)

    const scheduled = rules.filter((r) => r.scheduleExpression)
    const enabled = scheduled.filter((r) => r.state === 'ENABLED')

    const built = enabled.map((r) => buildLane(r, dayStart, dayEnd, now)).filter(Boolean)

    return {
      lanes: built.filter((l) => l.firesToday),
      hidden: {
        disabled: scheduled.length - enabled.length,
        notToday: built.filter((l) => l.mode === 'none').length,
        unparsed: built.filter((l) => l.mode === 'unparsed').length,
      },
    }
  }, [rules, now])

  const nowPct = ((now.getUTCHours() * 60 + now.getUTCMinutes()) / DAY_MINUTES) * 100

  const notes = [
    hidden.disabled > 0 && `${hidden.disabled} disabled`,
    hidden.notToday > 0 && `${hidden.notToday} not firing today`,
    hidden.unparsed > 0 && `${hidden.unparsed} with a schedule this view can't read`,
  ].filter(Boolean)

  return (
    <div className="px-4 py-4">
      {/* The axis, and the only place hour numbers appear — every lane below
          shares it, which is the whole point of the strip. */}
      <div className="relative mb-2 ml-[max(9rem,22%)] mr-14 h-4">
        {HOURS.map((h) => (
          <span
            key={h}
            className="absolute top-0 font-mono text-[10px] tabular-nums text-muted-foreground"
            style={{ left: `${(h / 24) * 100}%`, transform: h === 0 ? 'none' : 'translateX(-50%)' }}
          >
            {String(h).padStart(2, '0')}
          </span>
        ))}
        <span className="absolute right-0 top-0 font-mono text-[10px] tabular-nums text-muted-foreground">24</span>
      </div>

      {lanes.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Nothing is scheduled to fire today.
        </p>
      ) : (
        <ul className="space-y-1">
          {lanes.map((lane) => {
            const state = RULE_STATES[ruleState(lane.rule)]
            return (
              <li key={`${lane.rule.eventBusName}/${lane.rule.name}`} className="group flex items-center gap-3">
                <div className="w-[max(9rem,22%)] min-w-0 shrink-0">
                  <Link
                    to={`/eventbridge/buses/${encodeURIComponent(lane.rule.eventBusName)}/rules/${encodeURIComponent(lane.rule.name)}`}
                    className="block truncate font-mono text-xs text-foreground underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    title={lane.rule.name}
                  >
                    {lane.rule.name}
                  </Link>
                  <p className="truncate text-[11px] text-muted-foreground">{lane.schedule.label}</p>
                </div>

                <div className="relative h-5 flex-1 overflow-hidden rounded-sm bg-muted/60">
                  {/* Six-hour gridlines, faint enough to read as structure rather
                      than as data. */}
                  {[6, 12, 18].map((h) => (
                    <span
                      key={h}
                      aria-hidden="true"
                      className="absolute top-0 h-full w-px bg-border"
                      style={{ left: `${(h / 24) * 100}%` }}
                    />
                  ))}

                  {lane.mode === 'band' ? (
                    <span
                      className={cn('absolute inset-y-1 left-0 right-0 rounded-[2px]', state.text)}
                      style={{
                        backgroundImage:
                          'repeating-linear-gradient(45deg, currentColor 0 1.5px, transparent 1.5px 5px)',
                        opacity: 0.55,
                      }}
                      role="img"
                      aria-label={`fires ${lane.schedule.label}, throughout the day`}
                    />
                  ) : (
                    lane.ticks.map((t) => (
                      <span
                        key={t.toISOString()}
                        title={`${clockUTC(t)} UTC`}
                        className={cn('absolute inset-y-0.5 w-[3px] rounded-full', state.fill)}
                        style={{
                          left: `${((t.getUTCHours() * 60 + t.getUTCMinutes()) / DAY_MINUTES) * 100}%`,
                          opacity: t < now ? 0.35 : 1,
                        }}
                      />
                    ))
                  )}

                  <span
                    aria-hidden="true"
                    className="absolute top-0 h-full w-px bg-foreground"
                    style={{ left: `${nowPct}%` }}
                  />
                </div>

                <div className="w-14 shrink-0 text-right">
                  {lane.mode === 'band' ? (
                    <span className="font-mono text-[11px] text-muted-foreground">ongoing</span>
                  ) : lane.next ? (
                    <span className="font-mono text-[11px] tabular-nums text-foreground" title={untilLabel(lane.next, now)}>
                      {clockUTC(lane.next)}
                    </span>
                  ) : (
                    <span className="font-mono text-[11px] text-muted-foreground">done</span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <p className="mt-3 border-t border-border pt-2 text-[11px] text-muted-foreground">
        {localOffsetNote()} The line marks now, at {clockUTC(now)} UTC.
        {notes.length > 0 && ` Not shown: ${notes.join(', ')}.`}
      </p>
    </div>
  )
}
