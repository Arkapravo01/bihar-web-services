import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Findings ({findings.length})
        </CardTitle>
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
                    className={`cursor-pointer select-none hover:text-foreground ${col.align === 'right' ? 'text-right' : ''}`}
                  >
                    {col.label}{sortKey === col.key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                  </TableHead>
                ))}
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((f) => (
                <TableRow key={f.id} className="cursor-pointer" onClick={() => onSelect?.(f)}>
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
                    <Link to={logGroupPath(f.logGroupName)} className="text-xs text-primary hover:underline" title="Open in CloudWatch">
                      Open
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
