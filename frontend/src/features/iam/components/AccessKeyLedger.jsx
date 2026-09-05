import { useState } from 'react'
import { AlertTriangle, Clock, Check, Pause, CircleSlash, Copy, MoreHorizontal, Power, Trash2, KeyRound } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  KEY_STATES,
  keyState,
  displayKeyState,
  keyFlags,
  needsAttention,
  rotateByDate,
  relativeDays,
} from '../lib/rotation'
import { cn } from '@/lib/utils'

/**
 * One row per access key — the unit of work. The old page listed keys as a
 * flat table of user / id / status / created, which could not answer the only
 * two questions that matter about a credential: how long has this been valid,
 * and is anything still using it.
 *
 * The age meter is deliberately recessive: the number beside it is the fact,
 * the bar just makes twenty rows scannable in one pass. Its fill length is the
 * age against the rotation window and its colour is the key's state, so length
 * and hue say different things.
 */

const ICONS = { alert: AlertTriangle, clock: Clock, check: Check, pause: Pause, unused: CircleSlash }

function StateChip({ stateId }) {
  const state = KEY_STATES[stateId]
  const Icon = ICONS[state.icon]
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs', state.text)}>
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      {state.label}
    </span>
  )
}

function AgeMeter({ ageDays, rotationDays, stateId }) {
  const pct = Math.min(100, ((ageDays ?? 0) / rotationDays) * 100)
  const state = KEY_STATES[stateId]
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 shrink-0 text-right font-mono text-xs tabular-nums text-foreground">
        {ageDays == null ? '—' : `${ageDays}d`}
      </span>
      <div
        className="relative h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`${ageDays} days old, ${pct >= 100 ? 'past' : 'within'} the ${rotationDays} day window`}
      >
        <div
          className={cn('h-full rounded-full', state.fill)}
          style={{ width: `${Math.max(6, pct)}%`, minWidth: '5px' }}
        />
        {/* Where "due soon" begins, so distance from the deadline is visible. */}
        <span
          aria-hidden="true"
          className="absolute inset-y-0 w-px bg-border"
          style={{ left: '75%' }}
        />
      </div>
    </div>
  )
}

function CopyButton({ value, label }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 1200)
        } catch {
          /* clipboard unavailable — the value is selectable on screen */
        }
      }}
      title={`Copy ${label}`}
      className="text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none group-hover:opacity-100"
    >
      {copied ? <Check className="size-3.5 text-positive" /> : <Copy className="size-3.5" />}
      <span className="sr-only">Copy {label}</span>
    </button>
  )
}

function EmptyState({ filtered, onClear }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
      <KeyRound className="size-6 text-muted-foreground/50" aria-hidden="true" />
      {filtered ? (
        <>
          <p className="text-sm text-foreground">No keys match this filter.</p>
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Show all keys
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-foreground">No access keys yet.</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Create one to give a user programmatic access to this account.
          </p>
        </>
      )}
    </div>
  )
}

export function AccessKeyLedger({
  keys,
  rotationDays,
  loading,
  filtered,
  onClearFilter,
  onToggleStatus,
  onDelete,
  onCreateForUser,
  busyKeyId,
}) {
  if (loading) {
    return (
      <div className="divide-y divide-border/60">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="ml-auto h-4 w-20" />
          </div>
        ))}
      </div>
    )
  }

  if (!keys.length) return <EmptyState filtered={filtered} onClear={onClearFilter} />

  return (
    <div role="table" className="text-sm">
      <div
        role="row"
        className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1.3fr)_auto_auto_minmax(0,1fr)_auto] items-center gap-4 border-b border-border px-4 py-2 text-xs font-medium text-muted-foreground"
      >
        <span role="columnheader">User</span>
        <span role="columnheader">Access key</span>
        <span role="columnheader">Age</span>
        <span role="columnheader">Last used</span>
        <span role="columnheader">Status</span>
        <span role="columnheader" className="sr-only">
          Actions
        </span>
      </div>

      <div className="divide-y divide-border/60">
        {keys.map((k) => {
          const stateId = displayKeyState(k, rotationDays)
          const meterStateId = keyState(k, rotationDays)
          const flags = keyFlags(k, rotationDays)
          // A note only earns a status colour when the key actually needs
          // action. "not used yet" on a three-day-old key is context, not a
          // warning, and colouring it made calm rows look alarming.
          const flagIsConcern = needsAttention(k, rotationDays)
          const rotateBy = rotateByDate(k, rotationDays)
          const busy = busyKeyId === k.accessKeyId

          return (
            <div
              key={k.accessKeyId}
              role="row"
              className={cn(
                'group grid grid-cols-[minmax(0,1.4fr)_minmax(0,1.3fr)_auto_auto_minmax(0,1fr)_auto] items-center gap-4 px-4 py-2.5 transition-colors hover:bg-accent/40',
                busy && 'opacity-50',
              )}
            >
              <div role="cell" className="min-w-0">
                <p className="truncate font-mono text-xs text-foreground" title={k.userName}>
                  {k.userName}
                </p>
                {flags.length > 0 && (
                  <p
                    className={cn(
                      'mt-0.5 truncate text-[11px]',
                      flagIsConcern ? KEY_STATES[stateId].text : 'text-muted-foreground',
                    )}
                    title={flags.join(' · ')}
                  >
                    {flags[0]}
                  </p>
                )}
              </div>

              <div role="cell" className="flex min-w-0 items-center gap-1.5">
                <code className="truncate font-mono text-xs text-muted-foreground">{k.accessKeyId}</code>
                <CopyButton value={k.accessKeyId} label="access key ID" />
              </div>

              <div role="cell">
                <AgeMeter ageDays={k.ageDays} rotationDays={rotationDays} stateId={meterStateId} />
              </div>

              <div role="cell" className="whitespace-nowrap">
                <span
                  className={cn(
                    'font-mono text-xs tabular-nums',
                    k.neverUsed ? 'text-muted-foreground' : 'text-foreground',
                  )}
                  title={k.lastUsedDate ? new Date(k.lastUsedDate).toLocaleString() : 'Never used'}
                >
                  {relativeDays(k.lastUsedDaysAgo)}
                </span>
                {k.lastUsedService && (
                  <span className="ml-1.5 text-[11px] text-muted-foreground">{k.lastUsedService}</span>
                )}
              </div>

              <div role="cell" className="min-w-0">
                <StateChip stateId={stateId} />
                {rotateBy && k.status === 'Active' && (
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    rotate by {rotateBy.toLocaleDateString()}
                  </p>
                )}
              </div>

              <div role="cell" className="justify-self-end">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    disabled={busy}
                    className="flex size-7 items-center justify-center rounded-sm text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring/40 group-hover:opacity-100 data-[state=open]:opacity-100"
                  >
                    <MoreHorizontal className="size-4" />
                    <span className="sr-only">Actions for {k.accessKeyId}</span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem onClick={() => onCreateForUser(k.userName)}>
                      <KeyRound className="size-3.5" />
                      Create a new key for {k.userName.length > 14 ? 'this user' : k.userName}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onToggleStatus(k, k.status === 'Active' ? 'Inactive' : 'Active')}
                    >
                      <Power className="size-3.5" />
                      {k.status === 'Active' ? 'Disable this key' : 'Enable this key'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => onDelete(k)}>
                      <Trash2 className="size-3.5" />
                      Delete this key
                    </DropdownMenuItem>
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
