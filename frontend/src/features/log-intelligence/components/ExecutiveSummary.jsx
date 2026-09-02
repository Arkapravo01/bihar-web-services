import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

function parseBullets(text) {
  if (!text) return []
  return text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.startsWith('•') || l.startsWith('-') || l.startsWith('*'))
    .map(l => l.replace(/^[•\-*]\s*/, '').trim())
    .filter(Boolean)
}

function RootCause({ text }) {
  if (!text) return null
  // Parse the structured format: "Likely cause: ...\nConfidence: ...\nSupporting evidence:\n• ...\n• ..."
  const likelyCause = text.match(/Likely cause:\s*(.+)/)?.[1]?.trim()
  const confidence = text.match(/Confidence:\s*(.+)/)?.[1]?.trim()
  const evidenceLines = text
    .split('\n')
    .filter(l => l.trim().startsWith('•'))
    .map(l => l.replace(/^•\s*/, '').trim())
    .filter(Boolean)

  if (!likelyCause) {
    return <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{text}</p>
  }

  return (
    <div className="space-y-2">
      <div>
        <span className="text-xs text-muted-foreground">Likely cause: </span>
        <span className="text-sm text-foreground">{likelyCause}</span>
      </div>
      {confidence && (
        <div>
          <span className="text-xs text-muted-foreground">Confidence: </span>
          <span className={`text-xs font-semibold ${
            confidence === 'high' ? 'text-green-600 dark:text-green-400' :
            confidence === 'medium' ? 'text-amber-500' : 'text-muted-foreground'
          }`}>{confidence}</span>
        </div>
      )}
      {evidenceLines.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Supporting evidence:</p>
          <ul className="space-y-1">
            {evidenceLines.map((e, i) => (
              <li key={i} className="flex gap-2 text-sm text-foreground">
                <span className="text-muted-foreground shrink-0 mt-0.5">•</span>
                <span>{e}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function ExecutiveSummary({ run }) {
  if (!run?.executiveSummary && !run?.rootCause) return null

  const bullets = parseBullets(run.executiveSummary ?? '')
  const hasBullets = bullets.length > 0
  const rawSummary = run.executiveSummary ?? ''

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Executive Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasBullets ? (
          <ul className="space-y-2">
            {bullets.map((b, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-foreground leading-relaxed">
                <span className="text-primary shrink-0 mt-0.5 font-medium">•</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-foreground leading-relaxed">{rawSummary}</p>
        )}

        {run.rootCause && (
          <>
            <Separator />
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Root Cause Analysis</p>
              <RootCause text={run.rootCause} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
