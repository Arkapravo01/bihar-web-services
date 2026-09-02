export function Progress({ value, max = 100, className = '' }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className={`h-1.5 w-full rounded-full bg-muted overflow-hidden ${className}`}>
      <div className="h-full bg-primary transition-all duration-300" style={{ width: `${pct}%` }} />
    </div>
  )
}
