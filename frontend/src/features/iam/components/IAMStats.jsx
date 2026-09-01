import { motion } from 'motion/react'
import { ShieldAlert, Users, Lock } from 'lucide-react'

const itemVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: 'easeOut' } },
}

const stats = [
  { label: 'Users', icon: Users, color: 'from-violet-500/20 to-violet-600/10', iconColor: 'text-violet-600' },
  { label: 'Roles', icon: Lock, color: 'from-cyan-500/20 to-cyan-600/10', iconColor: 'text-cyan-600' },
  { label: 'Policies', icon: ShieldAlert, color: 'from-pink-500/20 to-pink-600/10', iconColor: 'text-pink-600' },
]

export function IAMStats({ userCount, roleCount, policyCount }) {
  const values = [userCount, roleCount, policyCount]

  return (
    <motion.div
      className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.1, delayChildren: 0 } },
      }}
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
              <div className="text-3xl font-bold tracking-tight">
                {values[idx]}
              </div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                {stat.label}
              </p>
            </div>

            <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden rounded-xl">
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 group-hover:animate-pulse" />
            </div>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
