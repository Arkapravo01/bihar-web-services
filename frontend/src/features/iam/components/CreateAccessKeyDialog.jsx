import { useEffect, useMemo, useState } from 'react'
import { Check, Copy, Download, KeyRound, ShieldAlert, TriangleAlert } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useCreateAccessKey } from '../hooks/useAccessKeyMutations'
import { cn } from '@/lib/utils'

/**
 * Two states in one dialog: choose a user, then read the secret.
 *
 * AWS returns the secret access key exactly once and cannot show it again, so
 * the second state is the only chance to capture it. It is therefore explicit
 * about that, offers copy and download, and does not close on an outside click
 * or Escape — a stray click on the backdrop would otherwise destroy a
 * credential the operator has not saved.
 */
export function CreateAccessKeyDialog({ open, onOpenChange, users, presetUser, existingKeyCounts }) {
  const [selectedUser, setSelectedUser] = useState(presetUser ?? '')
  const [created, setCreated] = useState(null)
  const [acknowledged, setAcknowledged] = useState(false)
  const createKey = useCreateAccessKey()

  useEffect(() => {
    if (open) {
      setSelectedUser(presetUser ?? '')
      setCreated(null)
      setAcknowledged(false)
      createKey.reset()
    }
    // createKey identity is stable per render cycle; resetting on open only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, presetUser])

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => a.name.localeCompare(b.name)),
    [users],
  )

  // AWS allows at most two access keys per user; a third call fails, so say so
  // before the operator hits it.
  const keyCount = existingKeyCounts?.[selectedUser] ?? 0
  const atKeyLimit = keyCount >= 2

  async function handleCreate() {
    const result = await createKey.mutateAsync(selectedUser)
    setCreated(result.accessKey)
  }

  function handleClose() {
    onOpenChange(false)
  }

  const secretPanel = created != null

  return (
    <Dialog open={open} onOpenChange={secretPanel ? undefined : onOpenChange}>
      <DialogContent
        className="sm:max-w-lg"
        onInteractOutside={secretPanel ? (e) => e.preventDefault() : undefined}
        onEscapeKeyDown={secretPanel ? (e) => e.preventDefault() : undefined}
        showCloseButton={!secretPanel}
      >
        {!secretPanel ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="size-4" aria-hidden="true" />
                Create an access key
              </DialogTitle>
              <DialogDescription>
                The new key gives this user programmatic access straight away, with whatever
                permissions the user already has.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-foreground">User</span>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="h-9 w-full rounded-sm border border-border bg-card px-2 font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
                >
                  <option value="">Select a user…</option>
                  {sortedUsers.map((u) => (
                    <option key={u.name} value={u.name}>
                      {u.name}
                      {existingKeyCounts?.[u.name] ? ` (${existingKeyCounts[u.name]} existing)` : ''}
                    </option>
                  ))}
                </select>
              </label>

              {atKeyLimit && (
                <p className="flex items-start gap-2 rounded-sm border border-warning/30 bg-warning/10 p-2.5 text-xs text-foreground">
                  <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden="true" />
                  <span>
                    {selectedUser} already has two access keys, which is the AWS limit. Delete or
                    disable one before creating another.
                  </span>
                </p>
              )}

              {createKey.isError && (
                <p className="flex items-start gap-2 rounded-sm border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-foreground">
                  <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-destructive" aria-hidden="true" />
                  <span>{createKey.error?.message ?? 'The key could not be created.'}</span>
                </p>
              )}
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!selectedUser || atKeyLimit || createKey.isPending}
              >
                {createKey.isPending ? 'Creating…' : 'Create access key'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Check className="size-4 text-positive" aria-hidden="true" />
                Access key created for {created.userName}
              </DialogTitle>
              <DialogDescription>
                Save the secret now. AWS does not store it and this is the only time it can be
                shown.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <SecretField label="Access key ID" value={created.accessKeyId} />
              <SecretField label="Secret access key" value={created.secretAccessKey} mono />

              <div className="flex gap-2 pt-1">
                <Button variant="secondary" size="sm" onClick={() => downloadCsv(created)}>
                  <Download className="size-3.5" />
                  Download .csv
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    copy(
                      `[${created.userName}]\naws_access_key_id = ${created.accessKeyId}\naws_secret_access_key = ${created.secretAccessKey}\n`,
                    )
                  }
                >
                  <Copy className="size-3.5" />
                  Copy as AWS profile
                </Button>
              </div>
            </div>

            <label className="flex items-start gap-2 rounded-sm border border-border bg-muted/40 p-2.5 text-xs text-foreground">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-0.5 size-3.5 shrink-0 accent-[var(--primary)]"
              />
              I have saved the secret access key somewhere safe.
            </label>

            <DialogFooter>
              <Button onClick={handleClose} disabled={!acknowledged}>
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function SecretField({ label, value, mono }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2 rounded-sm border border-border bg-muted/40 p-2">
        <code className={cn('min-w-0 flex-1 break-all text-xs text-foreground', mono && 'font-mono')}>
          {value}
        </code>
        <button
          type="button"
          onClick={async () => {
            await copy(value)
            setCopied(true)
            setTimeout(() => setCopied(false), 1200)
          }}
          className="shrink-0 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
          title={`Copy ${label.toLowerCase()}`}
        >
          {copied ? <Check className="size-3.5 text-positive" /> : <Copy className="size-3.5" />}
          <span className="sr-only">Copy {label}</span>
        </button>
      </div>
    </div>
  )
}

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    /* clipboard unavailable — values remain selectable on screen */
  }
}

function downloadCsv(key) {
  const csv = `User name,Access key ID,Secret access key\n${key.userName},${key.accessKeyId},${key.secretAccessKey}\n`
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${key.userName}_accessKeys.csv`
  a.click()
  URL.revokeObjectURL(url)
}
