import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowUpRight, ChevronsUpDown } from 'lucide-react'
import { logGroupPath } from '../lib/cloudwatchNav'

const SEVERITY_VARIANT = {
  critical: 'destructive', high: 'destructive', medium: 'secondary', low: 'outline', info: 'outline',
}
const SEVERITY_RANK = { critical: 0, high: 1, medium: 2, low: 3, info: 4 }

const COLUMNS = [
  { key: 'severity', label: 'Severity' },
  { key: 'category', label: 'Category' },
  { key: 'logGroupName', label: 'Log Group' },
  { key: 'count', label: 'Count', align: 'right' },
  { key: 'lastSeen', label: 'Last Seen' },
]

export function FindingsTable({ findings, sampledLogGroups, onSelect }) {
  const [sortKey, setSortKey] = useState('count')
  const [sortDir, setSortDir] = useState('desc')

  const sorted = useMemo(() => {
    const list = [...(findings ?? [])]
    list.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'severity') cmp = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
      else if (sortKey === 'count') cmp = a.count - b.count
      else if (sortKey === 'lastSeen') cmp = new Date(a.lastSeen) - new Date(b.lastSeen)
      else cmp = String(a[sortKey]).localeCompare(String(b[sortKey]))
      return sortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [findings, sortKey, sortDir])

  if (!findings?.length) return null

  function toggleSort(key) {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  return (
    <Card className="border border-border/70 bg-card/80 shadow-[0_12px_36px_-28px_rgba(0,0,0,0.45)]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm font-semibold tracking-[-0.01em] text-foreground">Detected findings</CardTitle>
          <span className="rounded-full bg-muted px-2 py-1 font-mono text-[10px] text-muted-foreground">{findings.length} results</span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[520px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {COLUMNS.map((col) => (
                  <TableHead
                    key={col.key}
                    onClick={() => toggleSort(col.key)}
                    className={`h-10 cursor-pointer select-none bg-muted/25 text-[10px] font-semibold uppercase tracking-[0.1em] hover:text-foreground ${col.align === 'right' ? 'text-right' : ''}`}
                  >
                    <span className="inline-flex items-center gap-1">{col.label}<ChevronsUpDown className={`size-3 ${sortKey === col.key ? 'text-primary' : 'opacity-35'}`} /></span>
                  </TableHead>
                ))}
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((f) => (
                <TableRow key={f.id} className="group cursor-pointer transition-colors hover:bg-primary/[0.035]" onClick={() => onSelect?.(f)}>
                  <TableCell>
                    <Badge variant={SEVERITY_VARIANT[f.severity] ?? 'outline'} className="text-[10px] px-1.5 py-0 capitalize">
                      {f.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm capitalize">
                    {f.category.replace(/_/g, ' ')}
                    {f.isRecurring && <span className="ml-1.5 text-[10px] text-amber-600 font-medium">↺ recurring</span>}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground max-w-[220px] truncate" title={f.logGroupName}>
                    {f.logGroupName}
                    {sampledLogGroups?.has(f.logGroupName) && (
                      <span
                        className="ml-1.5 text-[10px] text-muted-foreground/60 not-italic"
                        title="Sample capped at 500 events for this window — more may exist"
                      >
                        sampled
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">{f.count}</TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                    {new Date(f.lastSeen).toLocaleString()}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Link to={logGroupPath(f.logGroupName)} className="inline-flex size-7 items-center justify-center rounded-lg text-primary opacity-60 transition-all hover:bg-primary/10 group-hover:opacity-100" title="Open in CloudWatch" aria-label="Open log group">
                      <ArrowUpRight className="size-3.5" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
