import { motion } from 'motion/react'
import { Globe, CheckCircle2, Layers } from 'lucide-react'

const itemVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: 'easeOut' } },
}

const stats = [
  { label: 'APIs', icon: Globe, color: 'from-sky-500/20 to-sky-600/10', iconColor: 'text-sky-600' },
  { label: 'Edge APIs', icon: CheckCircle2, color: 'from-emerald-500/20 to-emerald-600/10', iconColor: 'text-emerald-600' },
  { label: 'Regional APIs', icon: Layers, color: 'from-violet-500/20 to-violet-600/10', iconColor: 'text-violet-600' },
]

export function ApiGatewayStats({ totalCount, edgeCount, regionalCount }) {
  const values = [totalCount, edgeCount, regionalCount]

  return (
    <motion.div
      className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1, delayChildren: 0 } } }}
    >
      {stats.map((stat, idx) => {
        const Icon = stat.icon
        return (
          <motion.div
            key={idx}
            variants={itemVariants}
            className={`group relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br ${stat.color} backdrop-blur-sm ring-1 ring-white/5 p-6 hover:ring-primary/30 transition-all duration-300`}
          >
            <div className="flex items-start justify-between">
              <div className={`flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br ${stat.color} ring-1 ring-white/10 group-hover:scale-110 transition-transform duration-300`}>
                <Icon className={`w-6 h-6 ${stat.iconColor}`} />
              </div>
              <div className="w-1 h-1 rounded-full bg-primary/40 group-hover:bg-primary animate-pulse" />
            </div>
            <div className="mt-4 space-y-1">
              <div className="text-3xl font-bold tracking-tight">{values[idx]}</div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">{stat.label}</p>
            </div>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
