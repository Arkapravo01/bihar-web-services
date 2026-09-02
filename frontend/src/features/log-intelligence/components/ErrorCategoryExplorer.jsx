import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const CATEGORY_LABELS = {
  timeout: 'Timeout', access_denied: 'Access Denied', throttling: 'Throttling',
  resource_not_found: 'Not Found', memory: 'Memory', runtime: 'Runtime',
  network: 'Network', database: 'Database', connection: 'Connection',
  dependency: 'Dependency', invocation: 'Invocation', exception: 'Exception',
  application: 'Application', other: 'Other',
}

export function ErrorCategoryExplorer({ kpis, activeCategory, onCategoryClick }) {
  if (!kpis?.categoryCounts) return null
  const entries = Object.entries(kpis.categoryCounts).sort((a, b) => b[1] - a[1])
  if (!entries.length) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Error Categories</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {entries.map(([cat, count]) => (
            <button
              key={cat}
              onClick={() => onCategoryClick?.(activeCategory === cat ? null : cat)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-colors ${
                activeCategory === cat
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              {CATEGORY_LABELS[cat] ?? cat}
              <span className="font-semibold">{count}</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
