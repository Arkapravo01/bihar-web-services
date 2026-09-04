import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkles } from 'lucide-react'

// Shared treatment for the two AI-authored narrative sections (Executive Summary,
// Root Cause). A left accent rule + small mono caption keeps AI-interpreted prose
// visually distinct from the deterministic ledger/table data everywhere else on
// the page — the report's own version of "never let AI prose read as a verified
// number."
export function AiInterpretationPanel({ title, children, className = '' }) {
  return (
    <Card className={`border-l-2 border-l-primary/50 ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {title}
          </CardTitle>
          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground/60 shrink-0">
            <Sparkles className="size-3" />
            AI interpretation
          </span>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
