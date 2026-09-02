const CATEGORY_OPTIONS = [
  'timeout', 'access_denied', 'throttling', 'resource_not_found', 'memory',
  'runtime', 'network', 'database', 'connection', 'dependency', 'invocation',
  'exception', 'application', 'other',
]
const SEVERITY_OPTIONS = ['critical', 'high', 'medium', 'low', 'info']

export function FiltersBar({ search, onSearchChange, category, onCategoryChange, severity, onSeverityChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="text"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search findings…"
        className="flex-1 min-w-[180px] h-8 px-3 text-sm rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <select
        value={category ?? ''}
        onChange={(e) => onCategoryChange(e.target.value || null)}
        className="h-8 px-2 text-sm rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <option value="">All Categories</option>
        {CATEGORY_OPTIONS.map(c => (
          <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
        ))}
      </select>
      <select
        value={severity ?? ''}
        onChange={(e) => onSeverityChange(e.target.value || null)}
        className="h-8 px-2 text-sm rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <option value="">All Severities</option>
        {SEVERITY_OPTIONS.map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    </div>
  )
}
