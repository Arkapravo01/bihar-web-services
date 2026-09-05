import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { logGroupPath } from '../lib/cloudwatchNav'

const STATUS_VARIANT = {
  Healthy: 'outline',
  Issues: 'secondary',
  Critical: 'destructive',
  'No Data': 'outline',
  'Analysis Failed': 'destructive',
  Analyzing: 'secondary',
}

export function LogGroupTable({ logGroupAnalyses }) {
  if (!logGroupAnalyses?.length) return null

  return (
    <Card className="h-full border border-border/70 bg-card/80 shadow-[0_8px_30px_-24px_rgba(0,0,0,0.4)]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm font-semibold tracking-[-0.01em] text-foreground">Log group coverage</CardTitle>
          <span className="rounded-full bg-muted px-2 py-1 font-mono text-[10px] text-muted-foreground">{logGroupAnalyses.length} groups</span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Log Group</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Findings</TableHead>
              <TableHead className="text-right">Critical</TableHead>
              <TableHead>Last Event</TableHead>
              <TableHead>Sample</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logGroupAnalyses.map((lg) => (
              <TableRow key={lg.logGroupName} className="transition-colors hover:bg-primary/[0.035]">
                <TableCell className="font-mono text-xs">
                  <Link to={logGroupPath(lg.logGroupName)} className="text-primary hover:underline">
                    {lg.logGroupName}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[lg.status] ?? 'outline'} className="text-[10px]">
                    {lg.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono text-sm tabular-nums">{lg.findingCount}</TableCell>
                <TableCell className="text-right font-mono text-sm tabular-nums">
                  {lg.criticalCount > 0 ? (
                    <span className="text-destructive font-medium">{lg.criticalCount}</span>
                  ) : lg.criticalCount}
                </TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground">
                  {lg.lastEventTime ? new Date(lg.lastEventTime).toLocaleString() : '—'}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {lg.truncated ? (
                    <span title="Capped at 500 events for this window — more may exist">Partial</span>
                  ) : (
                    <span className="text-muted-foreground/40">Full</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
