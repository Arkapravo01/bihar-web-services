import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useCreateSecret } from '../hooks/useCreateSecret'

export function CreateSecretDialog({ open, onOpenChange }) {
  const [secretName, setSecretName] = useState('')
  const [description, setDescription] = useState('')
  const [value, setValue] = useState('')
  const { mutate, isPending, error } = useCreateSecret()

  function reset() {
    setSecretName('')
    setDescription('')
    setValue('')
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!secretName.trim() || !value.trim()) return
    mutate(
      { secretName: secretName.trim(), value, description: description.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(`Created ${secretName.trim()}`)
          reset()
          onOpenChange(false)
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) reset(); onOpenChange(next) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create new secret</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1.5">Name</label>
            <Input
              value={secretName}
              onChange={(e) => setSecretName(e.target.value)}
              placeholder="e.g. posis-email-service/db-credentials"
              disabled={isPending}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Description (optional)</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this secret for?"
              disabled={isPending}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Value</label>
            <Textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder='Plain text, or JSON — e.g. {"username":"admin","password":"..."}'
              className="font-mono text-xs min-h-24"
              disabled={isPending}
            />
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-2 rounded-lg">
              {error.message}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !secretName.trim() || !value.trim()}>
              {isPending ? 'Creating…' : 'Create secret'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
