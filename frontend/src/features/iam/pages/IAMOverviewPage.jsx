import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  AlertCircle,
  ChevronRight,
  KeyRound,
  Search,
  ShieldAlert,
  UserPlus,
} from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useActiveEnv } from '@/app/providers/ActiveEnvProvider'
import { useUsers } from '../hooks/useUsers'
import { useRoles } from '../hooks/useRoles'
import { usePolicies } from '../hooks/usePolicies'
import { useAccessKeys } from '../hooks/useAccessKeys'
import { useUpdateAccessKeyStatus, useDeleteAccessKey } from '../hooks/useAccessKeyMutations'
import { IAMAiQueryBar } from '../components/IAMAiQueryBar'
import { IAMTable } from '../components/IAMTable'
import { CreateUserDialog } from '../components/CreateUserDialog'
import { CreateAccessKeyDialog } from '../components/CreateAccessKeyDialog'
import { KeyPostureBar } from '../components/KeyPostureBar'
import { AccessKeyLedger } from '../components/AccessKeyLedger'
import { PermissionsPanel } from '../components/PermissionsPanel'
import {
  DEFAULT_ROTATION_DAYS,
  attentionSummary,
  keyState,
  needsAttention,
  summarize,
} from '../lib/rotation'
import { cn } from '@/lib/utils'

/**
 * IAM, arranged around the three things this account is actually used for:
 * issuing an access key, checking what a user can do, and finding credentials
 * that have gone stale.
 *
 * The previous layout opened with four equal buttons that swapped between four
 * equal tables, which made "users", "roles", "policies" and "keys" look like
 * four equally likely destinations. They are not: roles and policies are read
 * rarely, and keys are the daily work. So keys lead, permissions follow, and
 * the directory is available but folded away.
 */

function Panel({ title, description, children, actions, className }) {
  return (
    <section className={cn('rounded-md border border-border bg-card', className)}>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-medium text-foreground">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  )
}

export function IAMOverviewPage() {
  const { activeEnvKey } = useActiveEnv()

  const { data: usersData = {}, isLoading: usersLoading, error: usersError } = useUsers()
  const { data: rolesData = {}, isLoading: rolesLoading } = useRoles()
  const { data: policiesData = {}, isLoading: policiesLoading } = usePolicies()
  const { data: keysData = {}, isLoading: keysLoading } = useAccessKeys()

  const users = useMemo(() => usersData.users ?? [], [usersData])
  const roles = useMemo(() => rolesData.roles ?? [], [rolesData])
  const policies = useMemo(() => policiesData.policies ?? [], [policiesData])
  const accessKeys = useMemo(() => keysData.accessKeys ?? [], [keysData])

  const [rotationDays, setRotationDays] = useState(DEFAULT_ROTATION_DAYS)
  const [stateFilter, setStateFilter] = useState(null)
  const [search, setSearch] = useState('')
  const [showDirectory, setShowDirectory] = useState(false)
  const [createKeyFor, setCreateKeyFor] = useState(null)
  const [createKeyOpen, setCreateKeyOpen] = useState(false)
  const [createUserOpen, setCreateUserOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)
  // Lets the agent bar answer questions about whoever the operator last opened.
  const [focusedUser, setFocusedUser] = useState(null)

  const updateStatus = useUpdateAccessKeyStatus()
  const deleteKey = useDeleteAccessKey()

  const summary = useMemo(() => summarize(accessKeys, rotationDays), [accessKeys, rotationDays])

  const keysByUser = useMemo(() => {
    const map = {}
    for (const k of accessKeys) (map[k.userName] ??= []).push(k)
    return map
  }, [accessKeys])

  const keyCounts = useMemo(() => {
    const counts = {}
    for (const k of accessKeys) counts[k.userName] = (counts[k.userName] ?? 0) + 1
    return counts
  }, [accessKeys])

  const attention = useMemo(
    () => accessKeys.filter((k) => needsAttention(k, rotationDays)),
    [accessKeys, rotationDays],
  )

  // Worst first, then oldest — the order someone working through a backlog wants.
  const ledgerKeys = useMemo(() => {
    const rank = { overdue: 0, due: 1, healthy: 2, inactive: 3 }
    const q = search.trim().toLowerCase()
    return accessKeys
      .filter((k) => !stateFilter || keyState(k, rotationDays) === stateFilter)
      .filter(
        (k) =>
          !q ||
          k.userName.toLowerCase().includes(q) ||
          k.accessKeyId.toLowerCase().includes(q),
      )
      .sort(
        (a, b) =>
          rank[keyState(a, rotationDays)] - rank[keyState(b, rotationDays)] ||
          (b.ageDays ?? 0) - (a.ageDays ?? 0) ||
          a.userName.localeCompare(b.userName),
      )
  }, [accessKeys, stateFilter, search, rotationDays])

  function openCreateKey(userName = null) {
    setCreateKeyFor(userName)
    setCreateKeyOpen(true)
  }

  async function runPendingAction() {
    const action = pendingAction
    if (!action) return
    setPendingAction(null)
    try {
      if (action.type === 'delete') {
        await deleteKey.mutateAsync({ userName: action.key.userName, accessKeyId: action.key.accessKeyId })
        toast.success(`Deleted key for ${action.key.userName}`)
      } else {
        await updateStatus.mutateAsync({
          userName: action.key.userName,
          accessKeyId: action.key.accessKeyId,
          status: action.status,
        })
        toast.success(
          action.status === 'Inactive'
            ? `Disabled key for ${action.key.userName}`
            : `Enabled key for ${action.key.userName}`,
        )
      }
    } catch (err) {
      toast.error(err?.message ?? 'The change could not be applied.')
    }
  }

  if (usersError) {
    const isNetworkError = !usersError.status
    return (
      <PageContainer>
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold">
            <ShieldAlert className="size-5" /> IAM
          </h1>
          <p className="text-sm text-muted-foreground">Access keys, permissions, users</p>
        </div>
        <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-destructive/30 bg-destructive/5 py-20 text-center">
          <AlertCircle className="size-8 text-destructive/60" />
          <p className="text-sm font-semibold text-destructive">
            {isNetworkError ? 'Backend not reachable' : `Not configured for ${activeEnvKey.toUpperCase()}`}
          </p>
          <p className="max-w-sm text-xs text-muted-foreground">
            {isNetworkError ? (
              'The backend server is not running. Start it with npm run dev.'
            ) : (
              <>
                The AWS profile{' '}
                <code className="rounded bg-destructive/10 px-2 py-1 font-mono">
                  claude-iam-{activeEnvKey === 'prod' ? 'prd' : 'qa'}
                </code>{' '}
                is not set up or has no permissions.
              </>
            )}
          </p>
        </div>
      </PageContainer>
    )
  }

  const busyKeyId =
    updateStatus.isPending || deleteKey.isPending
      ? (updateStatus.variables?.accessKeyId ?? deleteKey.variables?.accessKeyId)
      : null

  return (
    <PageContainer>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Access keys</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {keysLoading
              ? 'Reading credentials from AWS…'
              : `${summary.total} keys across ${summary.users} users in ${activeEnvKey.toUpperCase()}.`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setCreateUserOpen(true)}>
            <UserPlus className="size-3.5" />
            New user
          </Button>
          <Button size="sm" onClick={() => openCreateKey(null)}>
            <KeyRound className="size-3.5" />
            Create access key
          </Button>
        </div>
      </header>

      <IAMAiQueryBar userName={focusedUser} />

      <KeyPostureBar
        summary={summary}
        rotationDays={rotationDays}
        onRotationDaysChange={setRotationDays}
        activeState={stateFilter}
        onStateChange={setStateFilter}
        loading={keysLoading}
      />

      {/* Only shown when there is something to act on, so it never becomes
          furniture the operator learns to scroll past. */}
      {!keysLoading && attention.length > 0 && (
        <Panel
          title="Needs attention"
          description={attentionSummary(accessKeys, rotationDays)}
        >
          <AccessKeyLedger
            keys={attention.slice(0, 6)}
            rotationDays={rotationDays}
            onToggleStatus={(key, status) => setPendingAction({ type: 'status', key, status })}
            onDelete={(key) => setPendingAction({ type: 'delete', key })}
            onCreateForUser={openCreateKey}
            busyKeyId={busyKeyId}
          />
        </Panel>
      )}

      <Panel
        title="All keys"
        description={
          stateFilter || search
            ? `${ledgerKeys.length} of ${summary.total} shown`
            : 'Every access key in this account, worst first.'
        }
        actions={
          <label className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <span className="sr-only">Search keys by user or key ID</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user or key ID"
              className="h-8 w-56 rounded-sm border border-border bg-background pl-8 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </label>
        }
      >
        <AccessKeyLedger
          keys={ledgerKeys}
          rotationDays={rotationDays}
          loading={keysLoading}
          filtered={Boolean(stateFilter || search)}
          onClearFilter={() => {
            setStateFilter(null)
            setSearch('')
          }}
          onToggleStatus={(key, status) => setPendingAction({ type: 'status', key, status })}
          onDelete={(key) => setPendingAction({ type: 'delete', key })}
          onCreateForUser={openCreateKey}
          busyKeyId={busyKeyId}
        />
      </Panel>

      <Panel
        title="Permissions"
        description="Expand a user to see every policy, inline policy and group that grants them access."
      >
        <PermissionsPanel
          users={users}
          keysByUser={keysByUser}
          loading={usersLoading}
          keysLoading={keysLoading}
          onInspect={setFocusedUser}
          onCreateKey={openCreateKey}
        />
      </Panel>

      {/* Roles and policies are still here, just not competing for attention
          with the credential work. */}
      <section className="rounded-md border border-border bg-card">
        <button
          type="button"
          onClick={() => setShowDirectory((v) => !v)}
          aria-expanded={showDirectory}
          className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-accent/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <ChevronRight
            className={cn(
              'size-3.5 shrink-0 text-muted-foreground transition-transform',
              showDirectory && 'rotate-90',
            )}
            aria-hidden="true"
          />
          <span className="text-sm font-medium text-foreground">Roles and policies</span>
          <span className="text-xs text-muted-foreground">
            {roles.length} roles, {policies.length} customer-managed policies
          </span>
        </button>

        {showDirectory && (
          <div className="grid gap-4 border-t border-border p-4 lg:grid-cols-2">
            <div className="min-w-0">
              <h3 className="mb-2 text-xs font-medium text-muted-foreground">Roles</h3>
              <div className="overflow-hidden rounded-sm border border-border">
                <IAMTable
                  columns={[
                    {
                      id: 'name',
                      header: 'Name',
                      cell: (row) => <span className="font-mono text-xs">{row.name}</span>,
                    },
                    {
                      id: 'created',
                      header: 'Created',
                      cell: (row) => (
                        <span className="font-mono text-xs text-muted-foreground">
                          {new Date(row.createDate).toLocaleDateString()}
                        </span>
                      ),
                    },
                  ]}
                  rows={roles}
                  rowKey={(r) => r.name}
                  loading={rolesLoading}
                  emptyMessage="No roles found"
                />
              </div>
            </div>
            <div className="min-w-0">
              <h3 className="mb-2 text-xs font-medium text-muted-foreground">Policies</h3>
              <div className="overflow-hidden rounded-sm border border-border">
                <IAMTable
                  columns={[
                    {
                      id: 'name',
                      header: 'Name',
                      cell: (row) => <span className="font-mono text-xs">{row.name}</span>,
                    },
                    {
                      id: 'attached',
                      header: 'Attached to',
                      cell: (row) => (
                        <span className="font-mono text-xs tabular-nums">
                          {row.attachmentCount ?? 0}
                        </span>
                      ),
                    },
                  ]}
                  rows={policies}
                  rowKey={(p) => p.arn}
                  loading={policiesLoading}
                  emptyMessage="No customer-managed policies found"
                />
              </div>
            </div>
          </div>
        )}
      </section>

      <CreateAccessKeyDialog
        open={createKeyOpen}
        onOpenChange={setCreateKeyOpen}
        users={users}
        presetUser={createKeyFor}
        existingKeyCounts={keyCounts}
      />
      <CreateUserDialog open={createUserOpen} onOpenChange={setCreateUserOpen} />

      <ConfirmKeyActionDialog
        action={pendingAction}
        onCancel={() => setPendingAction(null)}
        onConfirm={runPendingAction}
      />
    </PageContainer>
  )
}

/**
 * Both actions can break a running integration, so both are confirmed and both
 * name the user and key. Deletion is called out as permanent because, unlike
 * disabling, it cannot be walked back.
 */
function ConfirmKeyActionDialog({ action, onCancel, onConfirm }) {
  const isDelete = action?.type === 'delete'
  const isDisable = action?.type === 'status' && action.status === 'Inactive'

  return (
    <Dialog open={Boolean(action)} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        {action && (
          <>
            <DialogHeader>
              <DialogTitle>
                {isDelete ? 'Delete this access key?' : isDisable ? 'Disable this access key?' : 'Enable this access key?'}
              </DialogTitle>
              <DialogDescription>
                {isDelete
                  ? 'The key stops working immediately and cannot be restored. Anything still using it will start failing.'
                  : isDisable
                    ? 'The key stops working immediately. You can enable it again later.'
                    : 'The key will start working again straight away.'}
              </DialogDescription>
            </DialogHeader>

            <dl className="space-y-1 rounded-sm border border-border bg-muted/40 p-3 text-xs">
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 text-muted-foreground">User</dt>
                <dd className="min-w-0 break-all font-mono text-foreground">{action.key.userName}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 text-muted-foreground">Key</dt>
                <dd className="min-w-0 break-all font-mono text-foreground">{action.key.accessKeyId}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 text-muted-foreground">Last used</dt>
                <dd className="font-mono text-foreground">
                  {action.key.neverUsed
                    ? 'never'
                    : new Date(action.key.lastUsedDate).toLocaleDateString()}
                </dd>
              </div>
            </dl>

            <DialogFooter>
              <Button variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
              <Button variant={isDelete ? 'destructive' : 'default'} onClick={onConfirm}>
                {isDelete ? 'Delete key' : isDisable ? 'Disable key' : 'Enable key'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
