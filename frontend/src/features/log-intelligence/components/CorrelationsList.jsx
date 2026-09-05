import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const RELATIONSHIP_VARIANT = {
  OBSERVED: 'default',
  INFERRED: 'secondary',
  UNKNOWN: 'outline',
}

const VISIBLE_CAP = 8

function findingLabel(finding) {
  if (!finding) return 'unknown finding'
  return `${finding.category.replace(/_/g, ' ')} · ${finding.logGroupName}`
}

// correlation.js pairs every combination of similar findings, so the same
// (category, log group) relationship often repeats many times over — collapse
// those into one representative row rather than listing every duplicate pair,
// and lead with cross-group INFERRED links (the more interesting signal) over
// same-group OBSERVED restatements.
function dedupeAndRank(correlations, byId) {
  const seen = new Map()
  for (const c of correlations) {
    const [a, b] = c.findingIds.map((id) => byId.get(id))
    if (!a || !b) continue
    const key = [c.relationship, findingLabel(a), findingLabel(b)].sort().join('|')
    if (!seen.has(key)) seen.set(key, { ...c, a, b, occurrences: 1 })
    else seen.get(key).occurrences += 1
  }
  return [...seen.values()].sort((x, y) => {
    if (x.relationship !== y.relationship) return x.relationship === 'INFERRED' ? -1 : 1
    return y.occurrences - x.occurrences
  })
}

// Correlations are computed deterministically (correlation.js) and persisted on
// every run, but were never rendered anywhere in the frontend — surfacing them
// is part of what makes this read like a complete report rather than a list of
// isolated findings.
export function CorrelationsList({ correlations, findings }) {
  const [expanded, setExpanded] = useState(false)
  if (!correlations?.length) return null

  const byId = new Map((findings ?? []).map((f) => [f.id, f]))
  const ranked = dedupeAndRank(correlations, byId)
  const visible = expanded ? ranked : ranked.slice(0, VISIBLE_CAP)

  return (
    <Card className="h-full border border-border/70 bg-card/80 shadow-[0_8px_30px_-24px_rgba(0,0,0,0.4)]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm font-semibold tracking-[-0.01em] text-foreground">Correlations</CardTitle>
          <span className="rounded-full bg-muted px-2 py-1 font-mono text-[10px] text-muted-foreground">{ranked.length} links</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {visible.map((c) => (
          <div key={c.id} className="flex items-start gap-3 rounded-xl border border-transparent p-2 text-sm transition-colors hover:border-border/60 hover:bg-muted/30">
            <Badge variant={RELATIONSHIP_VARIANT[c.relationship] ?? 'outline'} className="shrink-0 text-[10px] uppercase mt-0.5">
              {c.relationship}
            </Badge>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-mono text-muted-foreground truncate">
                {findingLabel(c.a)} <span className="text-muted-foreground/50">↔</span> {findingLabel(c.b)}
                {c.occurrences > 1 && <span className="text-muted-foreground/50"> · seen {c.occurrences}×</span>}
              </p>
              <p className="text-sm text-foreground mt-0.5">{c.reason}</p>
            </div>
          </div>
        ))}
        {ranked.length > VISIBLE_CAP && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="rounded-lg px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
          >
            {expanded ? 'Show fewer' : `Show ${ranked.length - VISIBLE_CAP} more`}
          </button>
        )}
      </CardContent>
    </Card>
  )
}
