import { Link } from 'react-router-dom'
import { DataTable } from '@/components/data-display/DataTable'
import { StatusIndicator } from '@/components/data-display/StatusIndicator'

export function BucketTable({ buckets, loading, env, error }) {
  return (
    <DataTable
      loading={loading}
      rows={buckets}
      rowKey={(b) => b.name}
      emptyMessage={
        error
          ? `Could not reach the backend: ${error.message}`
          : 'No buckets found for this AWS account/profile.'
      }
      columns={[
        {
          id: 'name',
          header: 'Bucket',
          cell: (row) => (
            <Link to={`/s3/buckets/${row.name}`} className="font-mono text-sm font-normal hover:underline">
              {row.name}
            </Link>
          ),
        },
        {
          id: 'region',
          header: 'Region',
          cell: () => <span className="font-mono text-xs text-muted-foreground">{env?.region ?? '—'}</span>,
        },
        {
          id: 'status',
          header: 'Status',
          cell: () => <StatusIndicator tone="positive" label="Reachable" />,
        },
      ]}
    />
  )
}
