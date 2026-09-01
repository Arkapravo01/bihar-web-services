import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { formatBytes, formatDate } from '@/lib/format'
import { TriangleAlert } from 'lucide-react'

export function DeleteDialog({ target, env, deleting, onCancel, onConfirm }) {
  const [text, setText] = useState('')

  useEffect(() => {
    setText('')
  }, [target])

  if (!target) return null

  const confirmed = text.trim().toLowerCase() === 'delete'

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Permanent delete</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Alert variant="destructive">
            <TriangleAlert className="size-4" />
            <AlertTitle>Environment: {env?.env?.toUpperCase()}</AlertTitle>
          </Alert>
          <p className="font-mono text-xs">{target.key}</p>
          <p className="text-sm text-muted-foreground">
            {formatBytes(target.size)} — last modified {formatDate(target.modified)}
          </p>
          <p className="text-sm">This cannot be undone.</p>
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='Type "delete" to confirm'
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={!confirmed || deleting} onClick={() => onConfirm(target)}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
