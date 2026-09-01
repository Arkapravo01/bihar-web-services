import { AnimatePresence, motion } from 'motion/react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const ROW_CLASS =
  'border-b border-border/50 transition-all duration-200 hover:bg-primary/5 hover:border-primary/30 has-aria-expanded:bg-primary/5 data-[state=selected]:bg-primary/5 group'

export function IAMTable({ columns, rows, rowKey, loading, emptyMessage = 'Nothing here yet.' }) {
  return (
    <div className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border/50 hover:bg-transparent sticky top-0 bg-gradient-to-r from-primary/5 to-transparent">
            {columns.map((col) => (
              <TableHead
                key={col.id}
                className={cn(
                  'font-semibold text-foreground/70 group-hover:text-foreground transition-colors',
                  col.headerClassName
                )}
              >
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={i} className={cn(ROW_CLASS, 'hover:bg-transparent')}>
                {columns.map((col) => (
                  <TableCell key={col.id}>
                    <Skeleton className="h-4 w-24 rounded-md" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : rows.length === 0 ? (
            <TableRow className={cn(ROW_CLASS, 'hover:bg-transparent')}>
              <TableCell colSpan={columns.length} className="py-12 text-center">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{emptyMessage}</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            <AnimatePresence initial={false}>
              {rows.map((row) => (
                <motion.tr
                  key={rowKey(row)}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.2 }}
                  className={cn(ROW_CLASS)}
                >
                  {columns.map((col) => (
                    <TableCell
                      key={col.id}
                      className={cn(
                        'group-hover:text-foreground/80 transition-colors',
                        col.cellClassName
                      )}
                    >
                      {col.cell(row)}
                    </TableCell>
                  ))}
                </motion.tr>
              ))}
            </AnimatePresence>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
