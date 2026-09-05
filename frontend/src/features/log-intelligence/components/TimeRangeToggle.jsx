export function TimeRangeToggle({ value, onChange }) {
  return (
    <div className="inline-flex rounded-xl bg-muted/70 p-0.5 text-xs" role="group" aria-label="Report time range">
      {['24h', '7d'].map((r) => (
        <button
          key={r}
          onClick={() => onChange(r)}
          aria-pressed={value === r}
          className={`rounded-[0.6rem] px-3 py-1.5 transition-all duration-200 ${
            value === r
              ? 'bg-card text-foreground font-semibold shadow-sm ring-1 ring-border/60'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {r === '24h' ? '24 Hours' : '7 Days'}
        </button>
      ))}
    </div>
  )
}
