import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatBytes, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

const ROW_CLASS =
  'border-b border-border/50 transition-all duration-200 hover:bg-primary/5 hover:border-primary/30 has-aria-expanded:bg-primary/5 data-[state=selected]:bg-primary/5 group cursor-pointer'

export function LogGroupsTable({ logGroups, loading }) {
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="space-y-0">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 p-4 border-b border-border/50">
            <Skeleton className="h-4 w-24 rounded-md" />
            <Skeleton className="h-4 w-16 rounded-md" />
            <Skeleton className="h-4 w-20 rounded-md" />
            <Skeleton className="h-4 w-32 rounded-md" />
          </div>
        ))}
      </div>
    )
  }

  if (!logGroups.length) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        No log groups found
      </div>
    )
  }

  return (
    <div className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border/50 hover:bg-transparent sticky top-0 bg-gradient-to-r from-primary/5 to-transparent">
            <TableHead className="font-semibold text-foreground/70 group-hover:text-foreground transition-colors">Name</TableHead>
            <TableHead className="font-semibold text-foreground/70 group-hover:text-foreground transition-colors">Retention</TableHead>
            <TableHead className="font-semibold text-foreground/70 group-hover:text-foreground transition-colors">Storage</TableHead>
            <TableHead className="font-semibold text-foreground/70 group-hover:text-foreground transition-colors">Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <AnimatePresence initial={false}>
            {logGroups.map((lg) => (
              <motion.tr
                key={lg.name}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
                className={cn(ROW_CLASS)}
                onClick={() => navigate(`/cloudwatch/log-groups${lg.name}`)}
              >
                <TableCell className="font-mono text-sm group-hover:text-foreground/80 transition-colors">{lg.name}</TableCell>
                <TableCell className="group-hover:text-foreground/80 transition-colors">
                  {lg.retentionInDays
                    ? <Badge variant="secondary" className="rounded-md bg-primary/10 text-primary/70 border-primary/20 font-semibold text-xs">{lg.retentionInDays}d</Badge>
                    : <span className="text-muted-foreground text-sm">Never</span>}
                </TableCell>
                <TableCell className="text-sm group-hover:text-foreground/80 transition-colors">{formatBytes(lg.storedBytes)}</TableCell>
                <TableCell className="text-sm text-muted-foreground group-hover:text-foreground/70 transition-colors">{formatDate(lg.creationTime)}</TableCell>
              </motion.tr>
            ))}
          </AnimatePresence>
        </TableBody>
      </Table>
    </div>
  )
}
