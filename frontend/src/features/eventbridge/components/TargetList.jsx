import { ShieldCheck, ShieldOff, RotateCcw, FileInput } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { targetKind } from '../lib/rules'
import { TargetIcon } from './TargetIcon'
import { CopyButton } from './CopyButton'
import { cn } from '@/lib/utils'

/**
 * Where a rule delivers, one row per target.
 *
 * The three facts that decide whether a delivery can be lost are given equal
 * billing with the target's name: whether there is a dead-letter queue, how many
 * times a failure is retried, and whether the event is rewritten on the way. A
 * target with no dead-letter queue is the single most common reason an event
 * "disappeared", so its absence is stated positively — "no dead-letter queue" —
 * rather than left as a missing field.
 */

function DeliveryNote({ target }) {
  const retries = target.retryPolicy?.maximumRetryAttempts
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
      {target.deadLetterArn ? (
        <span className="inline-flex items-center gap-1 text-positive" title={target.deadLetterArn}>
          <ShieldCheck className="size-3 shrink-0" aria-hidden="true" />
          dead-letter queue set
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-warning">
          <ShieldOff className="size-3 shrink-0" aria-hidden="true" />
          no dead-letter queue
        </span>
      )}

      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <RotateCcw className="size-3 shrink-0" aria-hidden="true" />
        {retries == null ? 'default retries' : retries === 0 ? 'no retries' : `retries ${retries}×`}
      </span>

      {(target.inputTransformer || target.input || target.inputPath) && (
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <FileInput className="size-3 shrink-0" aria-hidden="true" />
          {target.inputTransformer ? 'event is rewritten' : target.input ? 'fixed payload' : 'partial payload'}
        </span>
      )}

      {target.roleArn && (
        <span className="truncate font-mono text-muted-foreground" title={target.roleArn}>
          as {target.roleArn.split('/').pop()}
        </span>
      )}
    </div>
  )
}

export function TargetList({ targets, loading, className }) {
  if (loading) {
    return (
      <div className={cn('divide-y divide-border/60', className)}>
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="space-y-2 px-4 py-3">
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-3 w-40" />
          </div>
        ))}
      </div>
    )
  }

  if (!targets?.length) {
    return (
      <div className={cn('px-4 py-10 text-center', className)}>
        <p className="text-sm text-destructive">This rule has no targets.</p>
        <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
          It still matches events, and then discards them. Nothing is delivered and nothing reports an error.
        </p>
      </div>
    )
  }

  return (
    <ul className={cn('divide-y divide-border/60', className)}>
      {targets.map((target) => {
        const kind = targetKind(target.arn)
        return (
          <li key={target.id ?? target.arn} className="px-4 py-3">
            <div className="flex min-w-0 items-start gap-2.5">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-sm border border-border bg-muted/50">
                <TargetIcon icon={kind.icon} className="size-3.5 text-muted-foreground" />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-1.5">
                  <p className="truncate font-mono text-xs text-foreground" title={kind.name}>
                    {kind.name}
                  </p>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{kind.label}</span>
                </div>

                <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                  <code className="truncate font-mono text-[11px] text-muted-foreground" title={target.arn}>
                    {target.arn}
                  </code>
                  <CopyButton value={target.arn} label="target ARN" />
                </div>

                <DeliveryNote target={target} />
              </div>

              {/* The ID is what a write operation addresses, so it is worth
                  showing — but only when it says something the name has not
                  already said. */}
              {target.id && target.id !== kind.name && (
                <span className="shrink-0 font-mono text-[11px] text-muted-foreground" title="Target ID">
                  {target.id}
                </span>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
