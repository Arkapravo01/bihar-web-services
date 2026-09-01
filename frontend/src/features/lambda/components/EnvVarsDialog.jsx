import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Copy, CheckCircle2 } from 'lucide-react'

function CopyIconButton({ value }) {
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    })
  }
  return (
    <button onClick={handleCopy} className="text-muted-foreground hover:text-foreground transition-colors shrink-0" title="Copy">
      {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

export function EnvVarsDialog({ open, onOpenChange, environment = {} }) {
  const entries = Object.entries(environment)

  function handleCopyAll() {
    const text = entries.map(([k, v]) => `${k}=${v}`).join('\n')
    navigator.clipboard.writeText(text)
    toast.success('Copied all environment variables')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Environment Variables</DialogTitle>
        </DialogHeader>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No environment variables configured.</p>
        ) : (
          <div className="max-h-96 overflow-y-auto rounded-lg border border-border/50 divide-y divide-border/40">
            {entries.map(([key, value]) => (
              <div key={key} className="flex items-center gap-3 px-3 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs font-semibold text-primary truncate">{key}</p>
                  <p className="font-mono text-xs text-muted-foreground truncate">{value}</p>
                </div>
                <CopyIconButton value={`${key}=${value}`} />
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
          {entries.length > 0 && (
            <Button onClick={handleCopyAll}>
              <Copy className="w-3.5 h-3.5" />
              Copy all
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
