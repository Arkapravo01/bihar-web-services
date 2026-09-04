import { Card, CardContent } from '@/components/ui/card'

const TONE_CLASS = {
  critical: 'text-destructive',
  high: 'text-amber-500',
}

export function KpiLedger({ kpis, findings = [], correlationsCount = 0 }) {
  if (!kpis) return null

  const recurringCount = findings.filter((f) => f.isRecurring).length
  const stats = [
    { label: 'Total findings', value: kpis.totalFindings },
    { label: 'Critical', value: kpis.criticalCount, tone: kpis.criticalCount > 0 ? 'critical' : null },
    { label: 'High', value: kpis.severityCounts?.high ?? 0, tone: (kpis.severityCounts?.high ?? 0) > 0 ? 'high' : null },
    { label: 'Affected groups', value: kpis.affectedGroupsCount },
    { label: 'Recurring', value: recurringCount },
    { label: 'Correlations', value: correlationsCount },
  ]

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex flex-wrap divide-x divide-border">
          {stats.map((s) => (
            <div key={s.label} className="flex-1 min-w-[7rem] px-4 first:pl-0">
              <p className={`value-reveal text-2xl font-mono font-semibold tabular-nums ${TONE_CLASS[s.tone] ?? 'text-foreground'}`}>
                {s.value ?? 0}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
