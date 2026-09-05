import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkles } from 'lucide-react'

// Shared treatment for the two AI-authored narrative sections (Executive Summary,
// Root Cause). A left accent rule + small mono caption keeps AI-interpreted prose
// visually distinct from the deterministic ledger/table data everywhere else on
// the page — the report's own version of "never let AI prose read as a verified
// number."
export function AiInterpretationPanel({ title, children, className = '' }) {
  return (
    <Card className={`relative border border-border/70 bg-card/80 shadow-[0_8px_30px_-24px_rgba(0,0,0,0.4)] before:absolute before:inset-y-4 before:left-0 before:w-0.5 before:rounded-full before:bg-primary ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold tracking-[-0.01em] text-foreground">
            {title}
          </CardTitle>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/8 px-2 py-1 text-[9px] font-medium uppercase tracking-wider text-primary">
            <Sparkles className="size-3" />
            AI interpretation
          </span>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
