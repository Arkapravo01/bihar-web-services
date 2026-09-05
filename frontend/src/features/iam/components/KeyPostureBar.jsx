import { AlertTriangle, Clock, Check, Pause } from 'lucide-react'
import { KEY_STATES, STATE_ORDER, ROTATION_WINDOWS, rotationWindowLabel } from '../lib/rotation'
import { cn } from '@/lib/utils'

/**
 * The fleet's rotation posture, as one bar.
 *
 * This is the page's opening statement, and it is a control rather than a
 * readout: the segments are proportional to how many keys sit in each state,
 * and clicking one filters the ledger below. A row of separate stat tiles would
 * have shown the same four numbers without showing their relative weight, and
 * would not have been actionable.
 *
 * Segments carry a 2px surface gap so adjacent fills never read as one mass,
 * and every state appears in the legend with an icon and a word, because the
 * green and red in this palette are nearly identical under red-green colour
 * blindness — colour alone would tell some readers nothing.
 */

const ICONS = { alert: AlertTriangle, clock: Clock, check: Check, pause: Pause }

export function KeyPostureBar({
  summary,
  rotationDays,
  onRotationDaysChange,
  activeState,
  onStateChange,
}) {
  const { counts, total } = summary
  const present = STATE_ORDER.filter((id) => counts[id] > 0)

  return (
    <section aria-labelledby="posture-heading" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="posture-heading" className="text-sm font-medium text-foreground">
            Rotation posture
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {total === 0
              ? 'No access keys in this account yet.'
              : summary.attention === 0
                ? `All ${total} keys are within the ${rotationWindowLabel(rotationDays)} window.`
                : `${summary.attention} of ${total} keys need attention. Oldest is ${summary.oldestAge} days.`}
          </p>
        </div>

        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Rotate keys after
          <select
            value={rotationDays}
            onChange={(e) => onRotationDaysChange(Number(e.target.value))}
            className="h-7 rounded-sm border border-border bg-card px-2 font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
          >
            {ROTATION_WINDOWS.map((d) => (
              <option key={d} value={d}>
                {rotationWindowLabel(d)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {total > 0 && (
        <>
          {/* The bar. gap-0.5 supplies the 2px surface gap between fills. */}
          <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-sm bg-muted">
            {present.map((id) => {
              const state = KEY_STATES[id]
              const pct = (counts[id] / total) * 100
              const isActive = activeState === id
              const dimmed = activeState && !isActive
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onStateChange(isActive ? null : id)}
                  style={{ width: `${pct}%` }}
                  title={`${counts[id]} ${state.label.toLowerCase()} — click to ${isActive ? 'clear filter' : 'filter'}`}
                  aria-pressed={isActive}
                  aria-label={`${counts[id]} ${state.label}`}
                  className={cn(
                    'h-full min-w-[3px] rounded-[2px] transition-opacity',
                    state.fill,
                    dimmed ? 'opacity-25' : 'opacity-100',
                    'hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background',
                  )}
                />
              )
            })}
          </div>

          {/* Legend and filter in one row. Icon + label + count: identity never
              depends on the colour of the swatch beside them. */}
          <div className="flex flex-wrap items-center gap-1">
            {STATE_ORDER.map((id) => {
              const state = KEY_STATES[id]
              const Icon = ICONS[state.icon]
              const isActive = activeState === id
              const count = counts[id]
              return (
                <button
                  key={id}
                  type="button"
                  disabled={count === 0}
                  onClick={() => onStateChange(isActive ? null : id)}
                  aria-pressed={isActive}
                  className={cn(
                    'flex items-center gap-1.5 rounded-sm border px-2 py-1 text-xs transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-ring/40',
                    isActive
                      ? 'border-border bg-accent text-accent-foreground'
                      : 'border-transparent text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                    count === 0 && 'cursor-default opacity-40 hover:bg-transparent',
                  )}
                >
                  <Icon className={cn('size-3.5 shrink-0', state.text)} aria-hidden="true" />
                  <span>{state.label}</span>
                  <span className="font-mono tabular-nums text-foreground">{count}</span>
                </button>
              )
            })}
            {activeState && (
              <button
                type="button"
                onClick={() => onStateChange(null)}
                className="ml-1 rounded-sm px-2 py-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus:outline-none focus:ring-2 focus:ring-ring/40"
              >
                Show all
              </button>
            )}
          </div>
        </>
      )}
    </section>
  )
}
