import { AiInterpretationPanel } from './AiInterpretationPanel'

// Strips any stray markdown emphasis the model slips in (we ask it not to,
// but this keeps literal "**word**"/"*word*" asterisks off the screen either way).
function stripMarkdownEmphasis(text) {
  return text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1')
}

export function ExecutiveSummary({ summary }) {
  if (!summary) return null

  const bullets = summary
    .split('\n')
    .map((line) => stripMarkdownEmphasis(line).trim().replace(/^[•\-*]\s*/, ''))
    .filter(Boolean)

  return (
    <AiInterpretationPanel title="Executive Summary">
      {bullets.length > 1 ? (
        <ul className="space-y-1.5">
          {bullets.map((line, i) => (
            <li key={i} className="text-sm leading-relaxed flex gap-2">
              <span className="text-muted-foreground select-none">•</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm leading-relaxed">{bullets[0] ?? summary}</p>
      )}
    </AiInterpretationPanel>
  )
}
