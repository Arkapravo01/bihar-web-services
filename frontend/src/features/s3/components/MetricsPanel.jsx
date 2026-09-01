import { useBucketMetrics } from '../hooks/useBucketDetails'
import { MetricCard } from '@/components/data-display/MetricCard'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { formatBytes, formatDate } from '@/lib/format'
import { Database, HardDrive, TriangleAlert } from 'lucide-react'

export function MetricsPanel({ bucketName, active }) {
  const { data, isLoading, isError, error } = useBucketMetrics(bucketName, active)

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    )
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <TriangleAlert className="size-4" />
        <AlertTitle>Could not compute metrics</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    )
  }

  if (!data) return null

  return (
    <div className="flex flex-col gap-4">
      {data.truncated && (
        <Alert>
          <TriangleAlert className="size-4" />
          <AlertTitle>Partial scan</AlertTitle>
          <AlertDescription>
            This bucket has more objects than a single scan covers — counts below are from the first
            ~50,000 objects, not the full bucket.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MetricCard label="Objects" value={data.objectCount} icon={Database} />
        <MetricCard label="Total size" value={formatBytes(data.totalBytes)} icon={HardDrive} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 font-mono text-xs text-muted-foreground">
        <div className="rounded-lg border p-4">
          <div className="mb-1 text-[11px] uppercase tracking-widest">Largest object</div>
          {data.largest ? (
            <div className="text-foreground">
              {data.largest.key} — {formatBytes(data.largest.size)}
            </div>
          ) : (
            '—'
          )}
        </div>
        <div className="rounded-lg border p-4">
          <div className="mb-1 text-[11px] uppercase tracking-widest">Most recently modified</div>
          {data.mostRecent ? (
            <div className="text-foreground">
              {data.mostRecent.key} — {formatDate(data.mostRecent.modified)}
            </div>
          ) : (
            '—'
          )}
        </div>
      </div>
    </div>
  )
}
