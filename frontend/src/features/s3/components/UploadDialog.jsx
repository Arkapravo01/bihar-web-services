import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatBytes, formatDate } from '@/lib/format'
import { ApiClientError } from '@/services/apiClient'
import { Upload } from 'lucide-react'

export function UploadTrigger({ onUpload, children }) {
  const inputRef = useRef(null)
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onUpload(file)
          e.target.value = ''
        }}
      />
      {children(() => inputRef.current?.click())}
    </>
  )
}

export function UploadDropzone({ onUpload, children }) {
  const [dragging, setDragging] = useState(false)

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        const file = e.dataTransfer.files?.[0]
        if (file) onUpload(file)
      }}
      className="relative rounded-lg"
    >
      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/5 font-mono text-sm text-primary">
          Drop file to upload
        </div>
      )}
      {children}
    </div>
  )
}

export function useUploadFlow(uploadMutation, onUploaded) {
  const [conflict, setConflict] = useState(null)
  const [pendingFile, setPendingFile] = useState(null)

  async function upload(file, overwrite = false) {
    try {
      const result = await uploadMutation.mutateAsync({ file, overwrite })
      toast.success(`Uploaded ${result.key}`, {
        description: result.verified ? 'Verified in S3.' : 'Upload succeeded but was not verified — check manually.',
      })
      setConflict(null)
      setPendingFile(null)
      onUploaded?.(result)
    } catch (e) {
      if (e instanceof ApiClientError && e.status === 409) {
        setConflict(e.data)
        setPendingFile(file)
      } else {
        toast.error('Upload failed', { description: e.message })
      }
    }
  }

  return {
    upload,
    conflict,
    cancelConflict: () => {
      setConflict(null)
      setPendingFile(null)
    },
    resolveConflict: () => upload(pendingFile, true),
  }
}

export function OverwriteConflictDialog({ conflict, uploading, onCancel, onReplace }) {
  if (!conflict) return null

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Object already exists</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <p>An object already exists at this location:</p>
          <p className="font-mono text-xs">{conflict.key}</p>
          <p className="text-muted-foreground">
            {formatBytes(conflict.size)} — last modified {formatDate(conflict.modified)}
          </p>
          <p>Replacing it will overwrite the existing object permanently.</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onReplace} disabled={uploading}>
            <Upload className="size-4" />
            Replace
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
