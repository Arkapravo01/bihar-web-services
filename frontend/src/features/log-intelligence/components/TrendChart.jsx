import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function TrendChart({ kpis, timeRange }) {
  const trend = kpis?.trend ?? []
  if (!trend.length) return null

  const max = Math.max(...trend.map(b => b.count), 1)
  const total = trend.reduce((s, b) => s + b.count, 0)

  return (
    <Card className="border border-border/70 bg-card/80 shadow-[0_8px_30px_-24px_rgba(0,0,0,0.4)]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold tracking-[-0.01em] text-foreground">
            {timeRange === '7d' ? 'Daily Trend' : 'Hourly Trend'}
          </CardTitle>
          <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-mono text-muted-foreground tabular-nums">{total} events</span>
        </div>
      </CardHeader>
      <CardContent>
        {/* key forces full remount on timeRange change — prevents stale bar animation */}
        <div key={timeRange} className="flex h-20 items-end gap-1 rounded-xl bg-muted/25 px-2 pt-3">
          {trend.map((bucket, i) => {
            const pct = (bucket.count / max) * 100
            return (
              <div
                key={i}
                className="flex flex-col items-center flex-1 h-full justify-end"
                title={`${bucket.bucketLabel}: ${bucket.count}`}
              >
                <div
                  className="w-full origin-bottom rounded-t-[3px] bg-primary/45 transition-all duration-200 hover:bg-primary hover:brightness-110"
                  style={{ height: `${Math.max(pct, bucket.count > 0 ? 6 : 0)}%` }}
                />
              </div>
            )
          })}
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] font-mono text-muted-foreground select-none">
          <span>{trend[0]?.bucketLabel}</span>
          <span>{trend[Math.floor(trend.length / 2)]?.bucketLabel}</span>
          <span>{trend[trend.length - 1]?.bucketLabel}</span>
        </div>
      </CardContent>
    </Card>
  )
}
