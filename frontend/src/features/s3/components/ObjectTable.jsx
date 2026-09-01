import { DataTable } from '@/components/data-display/DataTable'
import { Button } from '@/components/ui/button'
import { formatBytes, formatDate } from '@/lib/format'
import { Folder, Trash2 } from 'lucide-react'

export function ObjectTable({
  folders,
  files,
  loading,
  onOpenFolder,
  downloadUrl,
  onDeleteRequest,
  emptyMessage = 'This bucket/folder is empty.',
}) {
  const rows = [
    ...folders.map((f) => ({ kind: 'folder', ...f })),
    ...files.map((f) => ({ kind: 'file', ...f })),
  ]

  return (
    <DataTable
      loading={loading}
      rows={rows}
      rowKey={(row) => (row.kind === 'folder' ? row.prefix : row.key)}
      emptyMessage={emptyMessage}
      columns={[
        {
          id: 'name',
          header: 'Name',
          cell: (row) =>
            row.kind === 'folder' ? (
              <button
                onClick={() => onOpenFolder(row.prefix)}
                className="flex items-center gap-2 font-mono text-sm hover:underline"
              >
                <Folder className="size-4 text-muted-foreground" />
                {row.name}
              </button>
            ) : (
              <a href={downloadUrl(row.key)} className="font-mono text-sm hover:underline">
                {row.name}
              </a>
            ),
        },
        {
          id: 'size',
          header: 'Size',
          cell: (row) => (
            <span className="font-mono text-xs text-muted-foreground">
              {row.kind === 'folder' ? '—' : formatBytes(row.size)}
            </span>
          ),
        },
        {
          id: 'modified',
          header: 'Last modified',
          cell: (row) => (
            <span className="font-mono text-xs text-muted-foreground">
              {row.kind === 'folder' ? '—' : formatDate(row.modified)}
            </span>
          ),
        },
        {
          id: 'actions',
          header: '',
          headerClassName: 'w-10',
          cell: (row) =>
            row.kind === 'file' ? (
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Delete ${row.name}`}
                onClick={() => onDeleteRequest(row)}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            ) : null,
        },
      ]}
    />
  )
}
