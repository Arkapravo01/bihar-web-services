import { motion } from 'motion/react'
import { CheckCircle2, XCircle, Clock, Zap } from 'lucide-react'

const AGENT_COLORS = {
  lambda:     'text-purple-400',
  s3:         'text-cyan-400',
  iam:        'text-amber-400',
  rds:        'text-emerald-400',
  cloudwatch: 'text-violet-400',
  secrets:    'text-pink-400',
}

export function OrchestrationTraceViewer({ trace = [] }) {
  if (!trace || trace.length === 0) return null

  return (
    <div className="border-t border-border/40 bg-muted/10 px-3 py-2.5 max-h-44 overflow-y-auto">
      <div className="flex items-center gap-1.5 mb-2">
        <Zap className="w-3 h-3 text-muted-foreground/50" />
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50">
          Trace · {trace.length} step{trace.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="relative pl-3">
        {/* Timeline line */}
        <div className="absolute left-[5px] top-1 bottom-1 w-px bg-border/40" />

        <div className="space-y-2">
          {trace.map((entry, idx) => {
            const isSuccess = entry.status === 'success'
            const agentColor = entry.agent ? AGENT_COLORS[entry.agent] : ''

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.18 }}
                className="flex items-start gap-2"
              >
                {/* Dot on timeline */}
                <div className="relative z-10 mt-0.5 shrink-0">
                  {isSuccess ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <XCircle className="w-3 h-3 text-destructive" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-[11px] text-foreground/80 truncate">
                      {entry.tool_name}
                    </span>
                    {entry.agent && (
                      <span className={`text-[10px] font-semibold ${agentColor}`}>
                        → {entry.agent}
                      </span>
                    )}
                  </div>
                  {entry.duration_ms != null && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock className="w-2.5 h-2.5 text-muted-foreground/40" />
                      <span className="font-mono text-[10px] text-muted-foreground/50">
                        {entry.duration_ms}ms
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
