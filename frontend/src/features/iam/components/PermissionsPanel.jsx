import { useState } from 'react'
import { ChevronRight, ShieldCheck, ShieldOff, KeyRound, Users2, FileText } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useUserDetail } from '../hooks/useUserDetail'
import { cn } from '@/lib/utils'

/**
 * Who can do what.
 *
 * Permissions are fetched per user on expand rather than for everyone up front,
 * because each user costs four IAM calls and the answer is only ever wanted for
 * one user at a time. A user's access is the union of attached managed policies,
 * inline policies and group membership — reporting only the first, as the old
 * detail view did, can show "no policies" for a user who has plenty through a
 * group.
 */
export function PermissionsPanel({ users, keysByUser, loading, onInspect, onCreateKey }) {
  const [expanded, setExpanded] = useState(null)

  if (loading) {
    return (
      <div className="divide-y divide-border/60">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="ml-auto h-4 w-24" />
          </div>
        ))}
      </div>
    )
  }

  if (!users.length) {
    return (
      <p className="px-4 py-10 text-center text-sm text-muted-foreground">
        No IAM users in this account.
      </p>
    )
  }

  return (
    <div className="divide-y divide-border/60">
      {users.map((user) => {
        const isOpen = expanded === user.name
        const userKeys = keysByUser[user.name] ?? []
        const activeKeys = userKeys.filter((k) => k.status === 'Active').length

        return (
          <div key={user.name}>
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? null : user.name)}
              aria-expanded={isOpen}
              className="group flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <ChevronRight
                className={cn(
                  'size-3.5 shrink-0 text-muted-foreground transition-transform',
                  isOpen && 'rotate-90',
                )}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">
                {user.name}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {activeKeys === 0 ? (
                  'no active key'
                ) : (
                  <>
                    <span className="font-mono tabular-nums text-foreground">{activeKeys}</span> active
                    {activeKeys === 1 ? ' key' : ' keys'}
                  </>
                )}
              </span>
            </button>

            {isOpen && (
              <UserPermissions
                userName={user.name}
                onInspect={onInspect}
                onCreateKey={onCreateKey}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function UserPermissions({ userName, onInspect, onCreateKey }) {
  const { data, isLoading, error } = useUserDetail(userName)

  if (isLoading) {
    return (
      <div className="space-y-2 border-t border-border/40 bg-muted/20 px-4 py-3 pl-10">
        <Skeleton className="h-3 w-52" />
        <Skeleton className="h-3 w-40" />
      </div>
    )
  }

  if (error) {
    return (
      <p className="border-t border-border/40 bg-muted/20 px-4 py-3 pl-10 text-xs text-destructive">
        Could not load permissions for {userName}: {error.message}
      </p>
    )
  }

  const attached = data?.attachedPolicies ?? []
  const inline = data?.inlinePolicies ?? []
  const groups = data?.groups ?? []
  const total = attached.length + inline.length + groups.length

  return (
    <div className="space-y-3 border-t border-border/40 bg-muted/20 px-4 py-3 pl-10">
      {total === 0 ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldOff className="size-3.5 shrink-0" aria-hidden="true" />
          No policies, inline policies or group memberships. This user cannot do anything.
        </p>
      ) : (
        <div className="space-y-2.5">
          {attached.length > 0 && (
            <PermissionGroup icon={ShieldCheck} title="Managed policies">
              {attached.map((p) => (
                <Chip key={p.PolicyArn ?? p.PolicyName}>{p.PolicyName}</Chip>
              ))}
            </PermissionGroup>
          )}
          {inline.length > 0 && (
            <PermissionGroup icon={FileText} title="Inline policies">
              {inline.map((name) => (
                <Chip key={name}>{name}</Chip>
              ))}
            </PermissionGroup>
          )}
          {groups.length > 0 && (
            <PermissionGroup icon={Users2} title="Groups">
              {groups.map((g) => (
                <Chip key={g.arn ?? g.name}>{g.name}</Chip>
              ))}
            </PermissionGroup>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-3 pt-0.5">
        <button
          type="button"
          onClick={() => onCreateKey(userName)}
          className="inline-flex items-center gap-1.5 text-xs text-primary underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <KeyRound className="size-3.5" aria-hidden="true" />
          Create an access key
        </button>
        <button
          type="button"
          onClick={() => onInspect(userName)}
          className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          Ask the agent about {userName}
        </button>
      </div>
    </div>
  )
}

function PermissionGroup({ icon: Icon, title, children }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{title}</p>
        <div className="mt-1 flex flex-wrap gap-1">{children}</div>
      </div>
    </div>
  )
}

function Chip({ children }) {
  return (
    <span className="rounded-sm border border-border bg-card px-1.5 py-0.5 font-mono text-[11px] text-foreground">
      {children}
    </span>
  )
}
