import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { logGroupPath } from '../lib/cloudwatchNav'

const SEVERITY_VARIANT = {
  critical: 'destructive',
  high: 'destructive',
  medium: 'secondary',
  low: 'outline',
  info: 'outline',
}

export function TopIssuesList({ findings, onSelect }) {
  if (!findings?.length) return null
  const top = [...findings].sort((a, b) => b.count - a.count).slice(0, 10)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Top Issues</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-border">
          {top.map((f, i) => (
            <li key={f.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/40 transition-colors">
              <span className="text-xs font-mono text-muted-foreground mt-0.5 w-5 shrink-0">{String(i + 1).padStart(2, '0')}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-sm font-medium text-foreground cursor-pointer hover:underline truncate"
                    onClick={() => onSelect?.(f)}
                  >
                    {f.category.replace(/_/g, ' ')}
                  </span>
                  <Badge variant={SEVERITY_VARIANT[f.severity] ?? 'outline'} className="text-[10px] px-1.5 py-0">
                    {f.severity}
                  </Badge>
                  {f.isRecurring && (
                    <span className="text-[10px] text-amber-600 font-medium">↺ recurring</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{f.logGroupName}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-mono text-muted-foreground">{f.count}×</span>
                <Link
                  to={logGroupPath(f.logGroupName)}
                  className="text-xs text-primary hover:underline"
                  title="Open in CloudWatch"
                >
                  Open
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
