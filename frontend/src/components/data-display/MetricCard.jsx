import { motion } from 'motion/react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function MetricCard({ label, value, icon: Icon, tone = 'default' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
    >
      <Card className="relative overflow-hidden group border-border/50 hover:border-primary/30 transition-colors duration-300">
        {/* Subtle top-edge accent line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {label}
          </span>
          {Icon && (
            <div className="flex items-center justify-center size-7 rounded-md bg-primary/8 group-hover:bg-primary/15 transition-colors duration-300">
              <Icon className="size-3.5 text-primary" />
            </div>
          )}
        </CardHeader>
        <CardContent>
          <span
            className={cn(
              'font-mono text-2xl font-semibold tabular-nums value-reveal',
              tone === 'destructive' && 'text-destructive',
              tone === 'positive' && 'text-positive'
            )}
          >
            {value}
          </span>
        </CardContent>
      </Card>
    </motion.div>
  )
}
