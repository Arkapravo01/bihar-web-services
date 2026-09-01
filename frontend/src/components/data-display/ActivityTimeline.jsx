import { motion } from 'motion/react'
import { formatDate } from '@/lib/format'
import { StatusIndicator } from './StatusIndicator'

export function ActivityTimeline({ events }) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">No activity yet this session.</p>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {events.map((event, i) => (
        <motion.li
          key={event.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25, delay: i * 0.04, ease: 'easeOut' }}
          className="flex items-center justify-between gap-4 text-sm py-1.5 px-2 rounded-lg hover:bg-primary/5 transition-colors duration-200 group"
        >
          <div className="flex items-center gap-2">
            <StatusIndicator tone={event.tone} label={event.action} />
            <span className="font-mono text-xs text-muted-foreground group-hover:text-foreground/70 transition-colors">{event.detail}</span>
          </div>
          <span className="whitespace-nowrap font-mono text-xs text-muted-foreground/60">
            {formatDate(event.at)}
          </span>
        </motion.li>
      ))}
    </ul>
  )
}
