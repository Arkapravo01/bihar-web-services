import { AlertTriangle, Check, Lock, Pause } from 'lucide-react'
import { motion } from 'motion/react'
import { RULE_STATES, STATE_ORDER } from '../lib/rules'
import { cn } from '@/lib/utils'

/**
 * Every rule in the account as one bar, and the page's opening statement.
 *
 * It is a control, not a readout: segment widths are the share of rules in each
 * state and clicking one filters the ledger below. Four stat tiles would show the
 * same four numbers while hiding their proportions, and would not be actionable —
 * "1 dead end" means something very different among 4 rules than among 400.
 *
 * The bar carries a 2px surface gap between fills so adjacent segments never read
 * as one mass, and every state appears in the legend as icon plus word plus count,
 * because this palette's positive and destructive steps are nearly identical under
 * red-green colour blindness.
 */

const ICONS = { alert: AlertTriangle, pause: Pause, lock: Lock, check: Check }

export function RulePostureBar({
  summary,
  activeState,
  onStateChange,
  buses = [],
  activeBus,
  onBusChange,
}) {
  const { counts, total } = summary
  const present = STATE_ORDER.filter((id) => counts[id] > 0)

  return (
    <section aria-labelledby="posture-heading" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="posture-heading" className="text-sm font-medium text-foreground">
            Routing posture
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {total === 0
              ? 'No rules on any bus in this account yet.'
              : summary.attention === 0
                ? `All ${total} rules deliver somewhere. ${summary.targets} targets across ${summary.buses} ${summary.buses === 1 ? 'bus' : 'buses'}.`
                : `${summary.attention} of ${total} rules are switched on but deliver nowhere.`}
          </p>
        </div>

        {buses.length > 1 && (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Bus
            <select
              value={activeBus ?? ''}
              onChange={(e) => onBusChange(e.target.value || null)}
              className="h-7 rounded-sm border border-border bg-card px-2 font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
            >
              <option value="">All buses</option>
              {buses.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {total > 0 && (
        <>
          <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-sm bg-muted">
            {present.map((id) => {
              const state = RULE_STATES[id]
              const pct = (counts[id] / total) * 100
              const isActive = activeState === id
              const dimmed = activeState && !isActive
              return (
                <motion.button
                  key={id}
                  type="button"
                  onClick={() => onStateChange(isActive ? null : id)}
                  /* The page's one piece of unprompted motion: the posture
                     resolving itself on arrival. Everything after this moves only
                     in answer to a click. */
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
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

          <div className="flex flex-wrap items-center gap-1">
            {STATE_ORDER.map((id) => {
              const state = RULE_STATES[id]
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
            {(activeState || activeBus) && (
              <button
                type="button"
                onClick={() => {
                  onStateChange(null)
                  onBusChange(null)
                }}
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
