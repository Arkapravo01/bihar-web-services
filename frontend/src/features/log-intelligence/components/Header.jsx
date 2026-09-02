export function Header({ title = 'Log Intelligence', subtitle, onRefresh, isRunning, children }) {
  return (
    <div className="flex flex-col gap-2 pb-4 border-b border-border">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {children}
          <button
            onClick={onRefresh}
            disabled={isRunning}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-border bg-background hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className={isRunning ? 'animate-spin' : ''}>↻</span>
            {isRunning ? 'Running…' : 'Run Report'}
          </button>
        </div>
      </div>
    </div>
  )
}
