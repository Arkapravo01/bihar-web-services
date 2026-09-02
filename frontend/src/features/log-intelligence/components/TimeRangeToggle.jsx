export function TimeRangeToggle({ value, onChange }) {
  return (
    <div className="inline-flex rounded-md border border-border overflow-hidden text-sm">
      {['24h', '7d'].map((r) => (
        <button
          key={r}
          onClick={() => onChange(r)}
          className={`px-3 py-1.5 transition-colors ${
            value === r
              ? 'bg-primary text-primary-foreground font-medium'
              : 'bg-background text-muted-foreground hover:bg-muted'
          }`}
        >
          {r === '24h' ? '24 Hours' : '7 Days'}
        </button>
      ))}
    </div>
  )
}
