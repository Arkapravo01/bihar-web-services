import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

export function PageContainer({ className, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={cn('flex flex-1 flex-col gap-6 p-6 min-w-0 overflow-x-hidden', className)}
    >
      {children}
    </motion.div>
  )
}
