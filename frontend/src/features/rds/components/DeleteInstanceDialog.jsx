import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { TriangleAlert, Camera, ShieldOff } from 'lucide-react'

export function DeleteInstanceDialog({ instanceId, deleting, onCancel, onConfirm }) {
  const [text, setText] = useState('')
  const [skipSnapshot, setSkipSnapshot] = useState(false)
  const [snapshotName, setSnapshotName] = useState('')

  useEffect(() => {
    setText('')
    setSkipSnapshot(false)
    setSnapshotName(instanceId ? `${instanceId}-final-${Date.now()}` : '')
  }, [instanceId])

  if (!instanceId) return null

  const confirmed = text.trim().toLowerCase() === 'delete'
  const canSubmit = confirmed && (skipSnapshot || snapshotName.trim())

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete DB instance</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Alert variant="destructive">
            <TriangleAlert className="size-4" />
            <AlertTitle>{instanceId}</AlertTitle>
            <AlertDescription>This permanently deletes the instance. This cannot be undone.</AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setSkipSnapshot(false)}
              className={`rounded-lg border p-3 text-left transition-colors ${
                !skipSnapshot ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20' : 'border-border/50 hover:bg-muted/40'
              }`}
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <Camera className="size-4 text-primary" />
                Take a final snapshot
              </div>
              <p className="text-xs text-muted-foreground mt-1">Recommended — lets you restore this data later.</p>
            </button>
            <button
              type="button"
              onClick={() => setSkipSnapshot(true)}
              className={`rounded-lg border p-3 text-left transition-colors ${
                skipSnapshot ? 'border-destructive/50 bg-destructive/5 ring-1 ring-destructive/20' : 'border-border/50 hover:bg-muted/40'
              }`}
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <ShieldOff className="size-4 text-destructive" />
                Skip final snapshot
              </div>
              <p className="text-xs text-muted-foreground mt-1">Data is gone beyond any earlier snapshots.</p>
            </button>
          </div>

          {!skipSnapshot && (
            <Input
              value={snapshotName}
              onChange={(e) => setSnapshotName(e.target.value)}
              placeholder="Final snapshot name"
            />
          )}

          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='Type "delete" to confirm'
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!canSubmit || deleting}
            onClick={() => onConfirm({
              instanceId,
              skipFinalSnapshot: skipSnapshot,
              finalSnapshotIdentifier: skipSnapshot ? undefined : snapshotName.trim(),
            })}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
