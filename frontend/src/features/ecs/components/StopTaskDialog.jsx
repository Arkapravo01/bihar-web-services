import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { TriangleAlert } from 'lucide-react'

export function StopTaskDialog({ task, stopping, onCancel, onConfirm }) {
  if (!task) return null

  const shortId = task.arn.split('/').pop()

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Stop this task?</DialogTitle>
        </DialogHeader>
        <Alert variant="destructive">
          <TriangleAlert className="size-4" />
          <AlertTitle className="font-mono text-xs">{shortId}</AlertTitle>
          <AlertDescription>
            ECS sends a SIGTERM to the running containers. If this task belongs to a service, a replacement is scheduled automatically.
          </AlertDescription>
        </Alert>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel} disabled={stopping}>Cancel</Button>
          <Button variant="destructive" disabled={stopping} onClick={() => onConfirm(task)}>
            {stopping ? 'Stopping…' : 'Stop task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
