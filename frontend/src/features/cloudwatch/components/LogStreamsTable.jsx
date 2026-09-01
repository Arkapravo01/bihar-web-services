import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatBytes } from '@/lib/format'

export function LogStreamsTable({ logStreams, loading, onSelect }) {
  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    )
  }

  if (!logStreams.length) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        No log streams found
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Stream Name</TableHead>
          <TableHead>Last Event</TableHead>
          <TableHead>First Event</TableHead>
          <TableHead>Storage</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logStreams.map((stream) => (
          <TableRow key={stream.name} className="cursor-pointer" onClick={() => onSelect(stream)}>
            <TableCell className="font-mono text-sm">{stream.name}</TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {stream.lastEventTimestamp ? formatDate(stream.lastEventTimestamp) : '—'}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {stream.firstEventTimestamp ? formatDate(stream.firstEventTimestamp) : '—'}
            </TableCell>
            <TableCell className="text-sm">{formatBytes(stream.storedBytes)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
