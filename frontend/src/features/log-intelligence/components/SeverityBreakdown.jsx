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
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Severity Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex h-4 rounded-full overflow-hidden w-full gap-px">
          {Object.entries(SEVERITY_CONFIG).map(([sev, { className }]) => {
            const count = counts[sev] ?? 0
            if (!count) return null
            const pct = (count / total) * 100
            return <div key={sev} className={`${className} transition-all`} style={{ width: `${pct}%` }} title={`${sev}: ${count}`} />
          })}
        </div>
        <div className="flex flex-wrap gap-3 mt-3">
          {Object.entries(SEVERITY_CONFIG).map(([sev, { label, className }]) => {
            const count = counts[sev] ?? 0
            if (!count) return null
            return (
              <div key={sev} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className={`size-2 rounded-full ${className}`} />
                {label}: <span className="text-foreground font-medium">{count}</span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
