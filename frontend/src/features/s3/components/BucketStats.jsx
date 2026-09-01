import { motion } from 'motion/react'
import { formatBytes } from '@/lib/format'
import { Boxes, Database, HardDrive } from 'lucide-react'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0 } },
}

const item = {
  hidden: { opacity: 0, y: 12, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: 'easeOut' } },
}

const stats = [
  { label: 'Buckets', icon: Boxes, color: 'from-blue-500/20 to-blue-600/10', iconColor: 'text-blue-600' },
  { label: 'Objects', icon: Database, color: 'from-emerald-500/20 to-emerald-600/10', iconColor: 'text-emerald-600' },
  { label: 'Storage', icon: HardDrive, color: 'from-purple-500/20 to-purple-600/10', iconColor: 'text-purple-600' },
]

export function BucketStats({ bucketCount, objectCount, totalBytes }) {
  const values = [bucketCount, objectCount, formatBytes(totalBytes)]

  return (
    <motion.div
      className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      initial="hidden"
      animate="show"
      variants={container}
    >
      {stats.map((stat, idx) => {
        const Icon = stat.icon
        return (
          <motion.div
            key={idx}
            variants={item}
            className={`group relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br ${stat.color} backdrop-blur-sm ring-1 ring-white/5 p-6 hover:ring-primary/30 transition-all duration-300`}
          >
            {/* Animated gradient background */}
            <div className="absolute inset-0 -z-10 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            {/* Icon with pulse */}
            <div className="flex items-start justify-between">
              <div className={`flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br ${stat.color} ring-1 ring-white/10 group-hover:scale-110 transition-transform duration-300`}>
                <Icon className={`w-6 h-6 ${stat.iconColor}`} />
              </div>
              <div className="w-1 h-1 rounded-full bg-primary/40 group-hover:bg-primary animate-pulse" />
            </div>

            {/* Content */}
            <div className="mt-4 space-y-1">
              <div className="text-3xl font-bold tracking-tight">
                {values[idx]}
              </div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                {stat.label}
              </p>
            </div>

            {/* Subtle border shine */}
            <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden rounded-xl">
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 group-hover:animate-pulse" />
            </div>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
