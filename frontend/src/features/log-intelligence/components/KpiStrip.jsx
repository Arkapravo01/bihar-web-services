import { Card, CardContent } from '@/components/ui/card'

function KpiCard({ label, value, highlight }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
        <p className={`text-2xl font-semibold ${highlight ? 'text-destructive' : 'text-foreground'}`}>
          {value ?? 0}
        </p>
      </CardContent>
    </Card>
  )
}

export function KpiStrip({ kpis }) {
  if (!kpis) return null
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <KpiCard label="Total Findings" value={kpis.totalFindings} />
      <KpiCard label="Critical" value={kpis.criticalCount} highlight={kpis.criticalCount > 0} />
      <KpiCard label="Timeouts" value={kpis.categoryCounts?.timeout ?? 0} />
      <KpiCard label="Affected Groups" value={kpis.affectedGroupsCount} />
    </div>
  )
}
