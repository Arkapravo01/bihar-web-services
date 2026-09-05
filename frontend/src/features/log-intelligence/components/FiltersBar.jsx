const CATEGORY_OPTIONS = [
  'timeout', 'access_denied', 'throttling', 'resource_not_found', 'memory',
  'runtime', 'network', 'database', 'connection', 'dependency', 'invocation',
  'exception', 'application', 'other',
]
const SEVERITY_OPTIONS = ['critical', 'high', 'medium', 'low', 'info']

export function FiltersBar({ search, onSearchChange, category, onCategoryChange, severity, onSeverityChange }) {
  const hasFilters = search || category || severity

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-card/65 p-1.5 shadow-sm">
      <label className="relative min-w-[200px] flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <span className="sr-only">Search findings</span>
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search findings…"
          className="h-8 w-full rounded-lg border-0 bg-muted/55 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
        />
      </label>
      <select
        value={category ?? ''}
        onChange={(e) => onCategoryChange(e.target.value || null)}
        aria-label="Filter by category"
        className="h-8 rounded-lg border-0 bg-muted/55 px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
      >
        <option value="">All Categories</option>
        {CATEGORY_OPTIONS.map(c => (
          <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
        ))}
      </select>
      <select
        value={severity ?? ''}
        onChange={(e) => onSeverityChange(e.target.value || null)}
        aria-label="Filter by severity"
        className="h-8 rounded-lg border-0 bg-muted/55 px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
      >
        <option value="">All Severities</option>
        {SEVERITY_OPTIONS.map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      {hasFilters && (
        <button
          onClick={() => { onSearchChange(''); onCategoryChange(null); onSeverityChange(null) }}
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Clear all filters"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  )
}
import { Search, X } from 'lucide-react'
