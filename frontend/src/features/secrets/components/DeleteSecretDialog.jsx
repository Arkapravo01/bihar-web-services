import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { TriangleAlert } from 'lucide-react'

export function DeleteSecretDialog({ secretName, deleting, onCancel, onConfirm }) {
  const [text, setText] = useState('')

  useEffect(() => {
    setText('')
  }, [secretName])

  if (!secretName) return null

  const confirmed = text.trim().toLowerCase() === 'delete'

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete secret</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Alert variant="destructive">
            <TriangleAlert className="size-4" />
            <AlertTitle>{secretName}</AlertTitle>
            <AlertDescription>
              AWS soft-deletes secrets with a default recovery window — it won't be destroyed immediately, but every version of this secret will stop being usable right away.
            </AlertDescription>
          </Alert>
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
          <Button variant="destructive" disabled={!confirmed || deleting} onClick={() => onConfirm(secretName)}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
