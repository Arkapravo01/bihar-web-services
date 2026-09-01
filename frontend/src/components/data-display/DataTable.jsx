import { AnimatePresence, motion } from 'motion/react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const ROW_CLASS =
  'border-b border-border/40 transition-colors duration-150 hover:bg-primary/5 hover:border-primary/20 data-[state=selected]:bg-primary/5 group cursor-default'

export function DataTable({ columns, rows, rowKey, loading, emptyMessage = 'Nothing here yet.' }) {
  return (
    <div className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border/50 hover:bg-transparent bg-muted/30">
            {columns.map((col) => (
              <TableHead
                key={col.id}
                className={cn(
                  'font-mono text-[10px] uppercase tracking-widest text-muted-foreground py-3',
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
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i} className={cn(ROW_CLASS, 'hover:bg-transparent')}>
                {columns.map((col) => (
                  <TableCell key={col.id} className="py-3">
                    <Skeleton
                      className="h-3.5 rounded-md"
                      style={{
                        width: `${60 + Math.sin(i * col.id?.length || 1) * 30}px`,
                        animationDelay: `${i * 0.07}s`,
                      }}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : rows.length === 0 ? (
            <TableRow className={cn(ROW_CLASS, 'hover:bg-transparent')}>
              <TableCell colSpan={columns.length} className="py-16 text-center">
                <p className="text-sm text-muted-foreground">{emptyMessage}</p>
              </TableCell>
            </TableRow>
          ) : (
            <AnimatePresence initial={false}>
              {rows.map((row, i) => (
                <motion.tr
                  key={rowKey(row)}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.18, delay: Math.min(i * 0.025, 0.3) }}
                  className={cn(ROW_CLASS)}
                >
                  {columns.map((col) => (
                    <TableCell
                      key={col.id}
                      className={cn(
                        'py-3 text-sm transition-colors duration-150',
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
