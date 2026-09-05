import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Copies a value and says so for a moment. ARNs are long, so nobody types them. */
export function CopyButton({ value, label, className }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 1200)
        } catch {
          /* clipboard unavailable — the value is selectable on screen */
        }
      }}
      title={`Copy ${label}`}
      className={cn(
        'shrink-0 text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
        className,
      )}
    >
      {copied ? <Check className="size-3.5 text-positive" /> : <Copy className="size-3.5" />}
      <span className="sr-only">Copy {label}</span>
    </button>
  )
}
