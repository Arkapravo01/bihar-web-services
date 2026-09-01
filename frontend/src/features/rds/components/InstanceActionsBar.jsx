import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useStartInstance } from '../hooks/useStartInstance'
import { useStopInstance } from '../hooks/useStopInstance'
import { useRebootInstance } from '../hooks/useRebootInstance'
import { useCreateSnapshot } from '../hooks/useCreateSnapshot'
import { useDeleteInstance } from '../hooks/useDeleteInstance'
import { DeleteInstanceDialog } from './DeleteInstanceDialog'
import { Play, Square, RotateCw, Camera, Trash2 } from 'lucide-react'

const ACTION_COPY = {
  start: { title: 'Start this instance?', body: 'It will begin booting up and become available shortly.', variant: 'default' },
  stop: { title: 'Stop this instance?', body: 'Anything using this database will lose its connection until it is started again.', variant: 'destructive' },
  reboot: { title: 'Reboot this instance?', body: 'Brief downtime while it restarts, then it recovers on its own.', variant: 'default' },
}

export function InstanceActionsBar({ instanceId, status, onDeleted }) {
  const { mutate: start, isPending: isStarting } = useStartInstance()
  const { mutate: stop, isPending: isStopping } = useStopInstance()
  const { mutate: reboot, isPending: isRebooting } = useRebootInstance()
  const { mutate: snapshot, isPending: isSnapshotting } = useCreateSnapshot()
  const { mutate: remove, isPending: isDeleting } = useDeleteInstance()

  const [pendingAction, setPendingAction] = useState(null)
  const [snapshotOpen, setSnapshotOpen] = useState(false)
  const [snapshotName, setSnapshotName] = useState(`${instanceId}-${Date.now()}`)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const isBusy = isStarting || isStopping || isRebooting || isDeleting
  const canStart = status === 'stopped'
  const canStop = status === 'available'
  const canReboot = status === 'available'

  function runAction(action) {
    setPendingAction(null)
    const mutators = { start, stop, reboot }
    const labels = { start: 'started', stop: 'stopped', reboot: 'rebooted' }
    mutators[action](instanceId, {
      onSuccess: () => toast.success(`${instanceId} ${action === 'start' ? 'starting' : action === 'stop' ? 'stopping' : 'rebooting'}`),
      onError: (err) => toast.error(`Failed to ${action}`, { description: err.message }),
    })
  }

  function handleCreateSnapshot() {
    if (!snapshotName.trim()) return
    snapshot(
      { instanceId, snapshotId: snapshotName.trim() },
      {
        onSuccess: () => {
          toast.success(`Snapshot ${snapshotName.trim()} started`)
          setSnapshotOpen(false)
        },
        onError: (err) => toast.error('Snapshot failed', { description: err.message }),
      }
    )
  }

  function handleDelete({ instanceId: id, skipFinalSnapshot, finalSnapshotIdentifier }) {
    remove(
      { instanceId: id, skipFinalSnapshot, finalSnapshotIdentifier },
      {
        onSuccess: () => {
          toast.success(`${id} deletion started`)
          setDeleteOpen(false)
          onDeleted?.()
        },
        onError: (err) => toast.error('Delete failed', { description: err.message }),
      }
    )
  }

  const active = pendingAction ? ACTION_COPY[pendingAction] : null

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" className="gap-1.5" disabled={!canStart || isBusy} onClick={() => setPendingAction('start')}>
        <Play className="size-3.5" /> Start
      </Button>
      <Button variant="outline" size="sm" className="gap-1.5" disabled={!canStop || isBusy} onClick={() => setPendingAction('stop')}>
        <Square className="size-3.5" /> Stop
      </Button>
      <Button variant="outline" size="sm" className="gap-1.5" disabled={!canReboot || isBusy} onClick={() => setPendingAction('reboot')}>
        <RotateCw className="size-3.5" /> Reboot
      </Button>
      <Button variant="outline" size="sm" className="gap-1.5" disabled={isBusy} onClick={() => { setSnapshotName(`${instanceId}-${Date.now()}`); setSnapshotOpen(true) }}>
        <Camera className="size-3.5" /> Snapshot
      </Button>
      <Button variant="ghost" size="sm" className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 ml-auto" disabled={isBusy} onClick={() => setDeleteOpen(true)}>
        <Trash2 className="size-3.5" /> Delete
      </Button>

      {/* Start/Stop/Reboot confirm */}
      <Dialog open={!!pendingAction} onOpenChange={(open) => !open && setPendingAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{active?.title}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{active?.body}</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingAction(null)}>Cancel</Button>
            <Button variant={active?.variant} onClick={() => runAction(pendingAction)}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create snapshot */}
      <Dialog open={snapshotOpen} onOpenChange={setSnapshotOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create snapshot</DialogTitle>
          </DialogHeader>
          <Input value={snapshotName} onChange={(e) => setSnapshotName(e.target.value)} placeholder="Snapshot name" disabled={isSnapshotting} autoFocus />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSnapshotOpen(false)} disabled={isSnapshotting}>Cancel</Button>
            <Button disabled={!snapshotName.trim() || isSnapshotting} onClick={handleCreateSnapshot}>
              {isSnapshotting ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteInstanceDialog
        instanceId={deleteOpen ? instanceId : null}
        deleting={isDeleting}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
