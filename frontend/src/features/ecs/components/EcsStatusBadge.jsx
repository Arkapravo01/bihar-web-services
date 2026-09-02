import { CheckCircle2, Loader2, XCircle, PauseCircle, HelpCircle } from 'lucide-react'

const TONES = {
  good: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  bad: 'bg-destructive/10 text-destructive border-destructive/20',
  neutral: 'bg-muted text-muted-foreground border-border',
}

const STATUS_MAP = {
  ACTIVE: { tone: 'good', icon: CheckCircle2 },
  RUNNING: { tone: 'good', icon: CheckCircle2 },
  PROVISIONING: { tone: 'pending', icon: Loader2 },
  PENDING: { tone: 'pending', icon: Loader2 },
  ACTIVATING: { tone: 'pending', icon: Loader2 },
  DEPROVISIONING: { tone: 'pending', icon: Loader2 },
  DRAINING: { tone: 'pending', icon: PauseCircle },
  STOPPED: { tone: 'neutral', icon: PauseCircle },
  DEACTIVATING: { tone: 'neutral', icon: PauseCircle },
  INACTIVE: { tone: 'neutral', icon: PauseCircle },
  FAILED: { tone: 'bad', icon: XCircle },
}

export function EcsStatusBadge({ status }) {
  const entry = STATUS_MAP[status] ?? { tone: 'neutral', icon: HelpCircle }
  const Icon = entry.icon
  const spin = status === 'PROVISIONING' || status === 'PENDING' || status === 'ACTIVATING'

  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 border ${TONES[entry.tone]}`}>
      <Icon className={`w-3 h-3 ${spin ? 'animate-spin' : ''}`} />
      {status ?? 'UNKNOWN'}
    </span>
  )
}
