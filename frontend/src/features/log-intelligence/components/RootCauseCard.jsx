import { Badge } from '@/components/ui/badge'
import { AiInterpretationPanel } from './AiInterpretationPanel'

const CONFIDENCE_VARIANT = {
  high: 'default',
  medium: 'secondary',
  low: 'outline',
}

// Parses the structured "Likely cause: / Confidence: / Supporting evidence: •…"
// format enforced by narrative.js's system prompt. Falls back to raw text for
// the plain fallback strings ("Root cause analysis unavailable.", etc.) or
// anything that doesn't match — never hide the model's output because a regex
// missed.
function parseRootCause(text) {
  const causeMatch = text.match(/Likely cause:\s*(.+?)(?:\n|$)/i)
  const confidenceMatch = text.match(/Confidence:\s*(high|medium|low)/i)
  const evidenceMatch = text.match(/Supporting evidence:\s*([\s\S]*)/i)
  if (!causeMatch) return null

  const evidence = (evidenceMatch?.[1] ?? '')
    .split('\n')
    .map((line) => line.trim().replace(/^[•\-*]\s*/, ''))
    .filter(Boolean)

  return {
    cause: causeMatch[1].trim(),
    confidence: confidenceMatch?.[1]?.toLowerCase() ?? null,
    evidence,
  }
}

export function RootCauseCard({ rootCause }) {
  if (!rootCause) return null
  const parsed = parseRootCause(rootCause)

  if (!parsed) {
    return (
      <AiInterpretationPanel title="Root Cause">
        <p className="text-sm text-muted-foreground leading-relaxed">{rootCause}</p>
      </AiInterpretationPanel>
    )
  }

  return (
    <AiInterpretationPanel title="Root Cause">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm leading-relaxed">{parsed.cause}</p>
          {parsed.confidence && (
            <Badge variant={CONFIDENCE_VARIANT[parsed.confidence] ?? 'outline'} className="shrink-0 uppercase text-[10px]">
              {parsed.confidence} confidence
            </Badge>
          )}
        </div>
        {parsed.evidence.length > 0 && (
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground/60 mb-1.5">
              Supporting evidence
            </p>
            <ul className="space-y-1">
              {parsed.evidence.map((line, i) => (
                <li key={i} className="text-xs text-muted-foreground leading-relaxed flex gap-2">
                  <span className="select-none">•</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </AiInterpretationPanel>
  )
}
