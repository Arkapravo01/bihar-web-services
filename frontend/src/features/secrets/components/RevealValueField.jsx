import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useSecretValue } from '../hooks/useSecretValue'
import { Eye, EyeOff, Copy, CheckCircle2 } from 'lucide-react'

function CopyIconButton({ value, label }) {
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      toast.success(label ? `Copied ${label}` : 'Copied')
      setTimeout(() => setCopied(false), 1200)
    })
  }
  return (
    <button onClick={handleCopy} className="text-muted-foreground hover:text-foreground transition-colors shrink-0" title="Copy">
      {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

export function RevealValueField({ secretName }) {
  const { data, isFetching, isError, error, refetch } = useSecretValue(secretName)
  const [revealed, setRevealed] = useState(false)

  function handleToggle() {
    if (!revealed && !data) {
      refetch()
    }
    setRevealed((r) => !r)
  }

  const isBinary = data?.isBinary

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Secret value</p>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={handleToggle} disabled={isFetching}>
          {revealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          {isFetching ? 'Loading…' : revealed ? 'Hide' : 'Reveal'}
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {!revealed ? (
          <motion.div
            key="masked"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5 font-mono text-sm text-muted-foreground/60 select-none"
          >
            ••••••••••••••••••••••••
          </motion.div>
        ) : isError ? (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
            {error.message}
          </motion.div>
        ) : isBinary ? (
          <motion.div key="binary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5 text-sm text-muted-foreground">
            This secret stores binary data and can't be displayed as text.
          </motion.div>
        ) : data?.parsed ? (
          <motion.div key="parsed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-lg border border-border/50 divide-y divide-border/40 overflow-hidden">
            {Object.entries(data.parsed).map(([key, value]) => (
              <div key={key} className="flex items-center gap-3 px-3 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs font-semibold text-primary truncate">{key}</p>
                  <p className="font-mono text-xs text-muted-foreground truncate">{String(value)}</p>
                </div>
                <CopyIconButton value={String(value)} label={key} />
              </div>
            ))}
          </motion.div>
        ) : (
          <motion.div key="raw" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5">
            <pre className="flex-1 whitespace-pre-wrap break-all font-mono text-sm text-foreground/90">{data?.raw}</pre>
            {data?.raw && <CopyIconButton value={data.raw} />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
