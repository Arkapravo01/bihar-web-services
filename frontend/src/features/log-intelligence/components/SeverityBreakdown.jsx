import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const SEVERITY_CONFIG = {
  critical: { label: 'Critical', className: 'bg-destructive' },
  high: { label: 'High', className: 'bg-amber-500' },
  medium: { label: 'Medium', className: 'bg-chart-1' },
  low: { label: 'Low', className: 'bg-muted-foreground' },
  info: { label: 'Info', className: 'bg-muted' },
}

export function SeverityBreakdown({ findings }) {
  if (!findings?.length) return null

  const counts = {}
  for (const f of findings) counts[f.severity] = (counts[f.severity] ?? 0) + 1
  const total = findings.length

  return (
    <Card className="border border-border/70 bg-card/80 shadow-[0_8px_30px_-24px_rgba(0,0,0,0.4)]">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold tracking-[-0.01em] text-foreground">Severity profile</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted gap-px">
          {Object.entries(SEVERITY_CONFIG).map(([sev, { className }]) => {
            const count = counts[sev] ?? 0
            if (!count) return null
            const pct = (count / total) * 100
            return <div key={sev} className={`${className} transition-all duration-500`} style={{ width: `${pct}%` }} title={`${sev}: ${count}`} />
          })}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Object.entries(SEVERITY_CONFIG).map(([sev, { label, className }]) => {
            const count = counts[sev] ?? 0
            if (!count) return null
            return (
              <div key={sev} className="flex items-center justify-between gap-2 rounded-lg bg-muted/35 px-2.5 py-2 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                <div className={`size-2 rounded-full ${className}`} />
                {label}</span><span className="text-foreground font-mono font-medium tabular-nums">{count}</span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
