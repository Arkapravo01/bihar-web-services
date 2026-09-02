import { Link } from 'react-router-dom'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { logGroupPath } from '../lib/cloudwatchNav'

const SEVERITY_VARIANT = {
  critical: 'destructive', high: 'destructive', medium: 'secondary', low: 'outline', info: 'outline',
}

export function FindingDetailDrawer({ finding, open, onClose }) {
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        {finding ? (
          <>
            <SheetHeader className="mb-4">
              <SheetTitle className="text-base capitalize">{finding.category.replace(/_/g, ' ')}</SheetTitle>
              <SheetDescription asChild>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={SEVERITY_VARIANT[finding.severity] ?? 'outline'}>{finding.severity}</Badge>
                  {finding.isRecurring && <Badge variant="outline" className="text-amber-600 border-amber-600">↺ Recurring</Badge>}
                  <span className="text-xs text-muted-foreground">{finding.count} occurrences</span>
                </div>
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Log Group</p>
                <Link to={logGroupPath(finding.logGroupName)} className="font-mono text-xs text-primary hover:underline break-all">
                  {finding.logGroupName}
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">First Seen</p>
                  <p className="text-xs">{new Date(finding.firstSeen).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Last Seen</p>
                  <p className="text-xs">{new Date(finding.lastSeen).toLocaleString()}</p>
                </div>
              </div>

              {finding.recurrenceDescription && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Recurrence</p>
                  <p className="text-xs text-amber-600">{finding.recurrenceDescription}</p>
                </div>
              )}

              <Separator />

              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                  Evidence ({finding.evidence?.length ?? 0} samples)
                </p>
                <div className="space-y-3">
                  {(finding.evidence ?? []).map((ev, i) => (
                    <div key={i} className="rounded-md border border-border bg-muted/40 p-2.5 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] text-muted-foreground">{new Date(ev.timestamp).toLocaleString()}</span>
                        <Link
                          to={logGroupPath(finding.logGroupName)}
                          className="text-[10px] text-primary hover:underline shrink-0"
                        >
                          Open
                        </Link>
                      </div>
                      <pre className="text-xs text-foreground whitespace-pre-wrap break-all font-mono leading-relaxed">{ev.message}</pre>
                      {ev.logStreamName && (
                        <p className="text-[10px] text-muted-foreground truncate">Stream: {ev.logStreamName}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
