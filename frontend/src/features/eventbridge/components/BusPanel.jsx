import { Globe2, Star } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { CopyButton } from './CopyButton'
import { cn } from '@/lib/utils'

/**
 * The buses themselves.
 *
 * A bus is a namespace, not a thing that can be wrong — which is why this sits at
 * the bottom of the page and folds away, and why it was wrong to open the old
 * page with a grid of bus cards. The one fact here that changes behaviour is
 * whether a bus carries a resource policy, because that is what lets another
 * account or service publish into it.
 */
export function BusPanel({ buses, ruleCounts, loading, activeBus, onSelectBus }) {
  if (loading) {
    return (
      <div className="divide-y divide-border/60">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="px-4 py-3">
            <Skeleton className="h-4 w-48" />
          </div>
        ))}
      </div>
    )
  }

  if (!buses.length) {
    return <p className="px-4 py-8 text-center text-sm text-muted-foreground">No event buses in this account.</p>
  }

  return (
    <ul className="divide-y divide-border/60">
      {buses.map((bus) => {
        const count = ruleCounts[bus.name] ?? 0
        const isDefault = bus.name === 'default'
        const isActive = activeBus === bus.name
        return (
          <li key={bus.arn ?? bus.name}>
            <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5', isActive && 'bg-accent/40')}>
              <button
                type="button"
                onClick={() => onSelectBus(isActive ? null : bus.name)}
                aria-pressed={isActive}
                className="flex min-w-0 items-center gap-1.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                title={isActive ? 'Show rules from every bus' : `Show only rules on ${bus.name}`}
              >
                {isDefault ? (
                  <Star className="size-3.5 shrink-0 text-muted-foreground" aria-label="Default bus" />
                ) : (
                  <Globe2 className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                )}
                <span className="truncate font-mono text-xs text-foreground underline-offset-2 hover:underline">
                  {bus.name}
                </span>
              </button>

              <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                {count} {count === 1 ? 'rule' : 'rules'}
              </span>

              {bus.policyText && (
                <span className="text-[11px] text-muted-foreground">accepts events from outside this account</span>
              )}

              <div className="ml-auto flex min-w-0 items-center gap-1.5">
                {bus.createdAt && (
                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                    {new Date(bus.createdAt).toLocaleDateString()}
                  </span>
                )}
                {bus.arn && <CopyButton value={bus.arn} label={`ARN for ${bus.name}`} />}
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
