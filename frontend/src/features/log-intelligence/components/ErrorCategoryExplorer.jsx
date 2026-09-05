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
    <div className="flex items-center gap-3 overflow-x-auto rounded-2xl border border-border/70 bg-card/55 p-2.5 shadow-sm">
      <span className="shrink-0 px-1 text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Categories</span>
      <div className="h-5 w-px shrink-0 bg-border/70" />
      <div className="flex gap-1.5">
          {entries.map(([cat, count]) => (
            <button
              key={cat}
              onClick={() => onCategoryClick?.(activeCategory === cat ? null : cat)}
              aria-pressed={activeCategory === cat}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] transition-all duration-200 ${
                activeCategory === cat
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                  : 'border-transparent bg-muted/60 text-muted-foreground hover:border-border hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              {CATEGORY_LABELS[cat] ?? cat}
              <span className="font-mono font-semibold tabular-nums">{count}</span>
            </button>
          ))}
      </div>
    </div>
  )
}
