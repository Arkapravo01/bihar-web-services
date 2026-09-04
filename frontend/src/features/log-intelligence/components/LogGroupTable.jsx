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
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Log Group Analysis</CardTitle>
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
              <TableRow key={lg.logGroupName}>
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
