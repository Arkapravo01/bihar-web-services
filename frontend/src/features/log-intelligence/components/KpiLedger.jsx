import { AlertTriangle, CircleAlert, Layers3, Network, Radar, RotateCcw } from 'lucide-react'

const TONE_CLASS = {
  critical: 'text-destructive bg-destructive/10 ring-destructive/15',
  high: 'text-amber-600 bg-amber-500/10 ring-amber-500/15',
  neutral: 'text-primary bg-primary/10 ring-primary/15',
}

export function KpiLedger({ kpis, findings = [], correlationsCount = 0 }) {
  if (!kpis) return null

  const recurringCount = findings.filter((finding) => finding.isRecurring).length
  const stats = [
    { label: 'Total findings', helper: 'Detected signals', value: kpis.totalFindings, icon: Radar, tone: 'neutral' },
    { label: 'Critical', helper: 'Immediate action', value: kpis.criticalCount, icon: CircleAlert, tone: kpis.criticalCount > 0 ? 'critical' : 'neutral' },
    { label: 'High priority', helper: 'Needs review', value: kpis.severityCounts?.high ?? 0, icon: AlertTriangle, tone: (kpis.severityCounts?.high ?? 0) > 0 ? 'high' : 'neutral' },
    { label: 'Affected groups', helper: 'Blast radius', value: kpis.affectedGroupsCount, icon: Layers3, tone: 'neutral' },
    { label: 'Recurring', helper: 'Known patterns', value: recurringCount, icon: RotateCcw, tone: 'neutral' },
    { label: 'Correlations', helper: 'Linked signals', value: correlationsCount, icon: Network, tone: 'neutral' },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon
        return (
          <div
            key={stat.label}
            className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card/80 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[0_12px_30px_-20px_rgba(0,0,0,0.35)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">{stat.label}</p>
                <p className="mt-2 font-mono text-2xl font-semibold tracking-[-0.04em] tabular-nums text-foreground value-reveal" style={{ animationDelay: `${index * 55}ms` }}>
                  {stat.value ?? 0}
                </p>
              </div>
              <span className={`flex size-8 items-center justify-center rounded-xl ring-1 ring-inset ${TONE_CLASS[stat.tone]}`}>
                <Icon className="size-3.5" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-3 text-[10px] text-muted-foreground/75">{stat.helper}</p>
            <span className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-primary/50 transition-transform duration-300 group-hover:scale-x-100" />
          </div>
        )
      })}
    </div>
  )
}
