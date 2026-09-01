import { cn } from '@/lib/utils'

export function StatusIndicator({ tone = 'positive', label }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="relative inline-flex size-2">
        {/* Ping ring */}
        {tone === 'positive' && (
          <span className="absolute inline-flex size-full rounded-full bg-positive opacity-60 animate-ping" style={{ animationDuration: '2s' }} />
        )}
        <span
          className={cn(
            'relative inline-flex size-2 rounded-full',
            tone === 'positive' && 'bg-positive',
            tone === 'destructive' && 'bg-destructive',
            tone === 'muted' && 'bg-muted-foreground'
          )}
        />
      </span>
      {label}
    </span>
  )
}
