import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const SEVERITY_COLOUR = {
  critical: 'bg-destructive/10 text-destructive border-destructive/30',
  high:     'bg-orange-500/10 text-orange-400 border-orange-500/30',
  medium:   'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  low:      'bg-blue-500/10 text-blue-400 border-blue-500/30',
  unknown:  'bg-muted/30 text-muted-foreground border-border',
}

const CONFIDENCE_VARIANT = {
  'Confirmed':         'default',
  'High confidence':   'default',
  'Medium confidence': 'secondary',
  'Uncertain':         'outline',
}

function Section({ title, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </div>
  )
}

function EvidenceList({ evidence }) {
  if (!evidence?.length) return <p className="text-sm text-muted-foreground">No evidence recorded.</p>
  return (
    <div className="flex flex-col gap-1">
      {evidence.map((e, i) => (
        <div key={i} className="rounded border bg-muted/20 px-3 py-1.5 text-xs font-mono">
          <span className="text-muted-foreground mr-2">{e.timestamp}</span>
          <span className="text-primary/80 mr-2">[{e.log_group}]</span>
          <span className="text-foreground/80 break-all">{e.message}</span>
        </div>
      ))}
    </div>
  )
}

function Timeline({ timeline }) {
  if (!timeline?.length) return <p className="text-sm text-muted-foreground">No timeline available.</p>
  return (
    <div className="flex flex-col gap-0">
      {timeline.map((t, i) => (
        <div key={i} className="flex gap-3 items-start">
          <div className="flex flex-col items-center shrink-0">
            <div className="size-2 rounded-full bg-primary mt-1.5" />
            {i < timeline.length - 1 && <div className="w-px flex-1 bg-border min-h-[16px]" />}
          </div>
          <div className="pb-2 min-w-0">
            <span className="font-mono text-xs text-muted-foreground mr-2">{t.time}</span>
            <span className="text-sm">{t.event}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

export function InvestigationResult({ result }) {
  if (!result) return null

  const severityClass = SEVERITY_COLOUR[result.severity] ?? SEVERITY_COLOUR.unknown
  const confidenceVariant = CONFIDENCE_VARIANT[result.confidence] ?? 'outline'

  return (
    <Card className="border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <CardTitle className="text-base font-semibold leading-snug">{result.summary}</CardTitle>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {result.severity && result.severity !== 'unknown' && (
              <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${severityClass}`}>
                {result.severity}
              </span>
            )}
            <Badge variant={confidenceVariant} className="text-xs">
              {result.confidence ?? 'Unknown confidence'}
            </Badge>
          </div>
        </div>
        {result.time_window?.description && (
          <p className="text-xs text-muted-foreground mt-1">
            Window investigated: <span className="font-mono">{result.time_window.description}</span>
          </p>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-5 pt-0">
        {result.root_cause && (
          <Section title="Root Cause">
            <p className="text-sm">{result.root_cause}</p>
          </Section>
        )}

        {result.affected_log_groups?.length > 0 && (
          <Section title="Investigated Log Groups">
            <div className="flex flex-wrap gap-1">
              {result.affected_log_groups.map((g) => (
                <span key={g} className="font-mono text-xs bg-muted/30 border rounded px-2 py-0.5">{g}</span>
              ))}
            </div>
          </Section>
        )}

        {result.evidence?.length > 0 && (
          <Section title="Evidence">
            <EvidenceList evidence={result.evidence} />
          </Section>
        )}

        {result.timeline?.length > 0 && (
          <Section title="Timeline">
            <Timeline timeline={result.timeline} />
          </Section>
        )}

        {result.impact && (
          <Section title="Impact">
            <p className="text-sm">{result.impact}</p>
          </Section>
        )}

        {result.recommendations?.length > 0 && (
          <Section title="Recommendations">
            <ul className="text-sm list-disc list-inside space-y-0.5">
              {result.recommendations.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </Section>
        )}

        {result.knowledge_learned && (
          <Section title="Knowledge Learned">
            <p className="text-xs text-muted-foreground bg-muted/20 border rounded px-3 py-2">{result.knowledge_learned}</p>
          </Section>
        )}

        {result.raw && !result.root_cause && (
          <Section title="Raw Investigation Output">
            <pre className="text-xs font-mono whitespace-pre-wrap break-words bg-muted/20 border rounded p-3 max-h-64 overflow-y-auto">
              {result.raw}
            </pre>
          </Section>
        )}
      </CardContent>
    </Card>
  )
}
