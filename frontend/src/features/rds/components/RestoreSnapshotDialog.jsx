import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export function RestoreSnapshotDialog({ snapshot, restoring, onCancel, onConfirm }) {
  const [newInstanceId, setNewInstanceId] = useState('')

  useEffect(() => {
    setNewInstanceId(snapshot ? `${snapshot.instanceId || snapshot.id}-restored` : '')
  }, [snapshot])

  if (!snapshot) return null

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Restore from snapshot</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            This creates a <strong>brand-new instance</strong> from <span className="font-mono">{snapshot.id}</span>. It doesn't touch the original instance or any existing data.
          </p>
          <div>
            <label className="block text-sm font-medium mb-1.5">New instance identifier</label>
            <Input
              value={newInstanceId}
              onChange={(e) => setNewInstanceId(e.target.value)}
              placeholder="e.g. posis-db-restored"
              disabled={restoring}
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel} disabled={restoring}>
            Cancel
          </Button>
          <Button
            disabled={!newInstanceId.trim() || restoring}
            onClick={() => onConfirm({ snapshotId: snapshot.id, newInstanceId: newInstanceId.trim() })}
          >
            {restoring ? 'Restoring…' : 'Restore'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
