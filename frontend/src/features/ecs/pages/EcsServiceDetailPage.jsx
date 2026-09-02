import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { IAMTable } from '@/features/iam/components/IAMTable'
import { useService } from '../hooks/useService'
import { useTasks } from '../hooks/useTasks'
import { useStopTask } from '../hooks/useStopTask'
import { EcsAiQueryBar } from '../components/EcsAiQueryBar'
import { EcsStatusBadge } from '../components/EcsStatusBadge'
import { ServiceActionsBar } from '../components/ServiceActionsBar'
import { StopTaskDialog } from '../components/StopTaskDialog'
import { ArrowLeft, Layers3, Info, Copy, CheckCircle2, History, Square } from 'lucide-react'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

function CopyButton({ value }) {
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <button onClick={handleCopy} className="ml-2 text-muted-foreground hover:text-foreground transition-colors" title="Copy">
      {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

export function EcsServiceDetailPage() {
  const { clusterName, serviceName } = useParams()
  const navigate = useNavigate()

  const { data: service, isLoading } = useService(clusterName, serviceName)
  const { data: tasksData, isLoading: tasksLoading } = useTasks(clusterName, serviceName)
  const { mutate: stop, isPending: isStopping } = useStopTask(clusterName)

  const [stopTarget, setStopTarget] = useState(null)
  const tasks = useMemo(() => tasksData?.tasks ?? [], [tasksData])

  function handleStopTask(task) {
    stop(
      { taskArn: task.arn, reason: 'Stopped manually from Bihar Web Services console' },
      {
        onSuccess: () => {
          toast.success('Task stop requested')
          setStopTarget(null)
        },
        onError: (err) => toast.error('Failed to stop task', { description: err.message }),
      }
    )
  }

  return (
    <PageContainer>
      <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-6">
        {/* Back */}
        <motion.div variants={itemVariants}>
          <Button variant="ghost" size="sm" onClick={() => navigate(`/ecs/${encodeURIComponent(clusterName)}`)} className="gap-1.5 text-muted-foreground hover:text-foreground -ml-1">
            <ArrowLeft className="w-4 h-4" />
            {clusterName}
          </Button>
        </motion.div>

        {/* Hero */}
        <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <Layers3 className="w-6 h-6 text-primary" />
            </div>
            <div>
              {isLoading ? (
                <>
                  <Skeleton className="h-6 w-48 mb-1" />
                  <Skeleton className="h-4 w-72" />
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight font-mono">{serviceName}</h1>
                    {service?.status && <EcsStatusBadge status={service.status} />}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs font-mono text-muted-foreground">{service?.arn}</span>
                    {service?.arn && <CopyButton value={service.arn} />}
                  </div>
                </>
              )}
            </div>
          </div>
          {service && <ServiceActionsBar clusterName={clusterName} serviceName={serviceName} desiredCount={service.desiredCount} />}
        </motion.div>

        {/* AI Query Bar */}
        <motion.div variants={itemVariants}>
          <EcsAiQueryBar clusterName={clusterName} serviceName={serviceName} />
        </motion.div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Metadata */}
          <motion.div variants={itemVariants} className="space-y-3">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-base font-semibold">Details</h2>
            </div>
            <Card className="rounded-xl border border-border/60 bg-card/60">
              {isLoading ? (
                <CardContent className="p-4 space-y-3">
                  {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-6 w-full rounded" />)}
                </CardContent>
              ) : service ? (
                <CardContent className="p-4">
                  <dl className="space-y-4">
                    {[
                      { label: 'Desired / Running / Pending', value: `${service.desiredCount} / ${service.runningCount} / ${service.pendingCount}` },
                      { label: 'Launch type', value: service.launchType ?? '—' },
                      { label: 'Platform version', value: service.platformVersion ?? '—' },
                      { label: 'Task definition', value: service.taskDefinition?.split('/').pop() ?? '—' },
                      { label: 'Created', value: service.createdAt ? new Date(service.createdAt).toLocaleString() : '—' },
                      { label: 'Last updated', value: service.updatedAt ? new Date(service.updatedAt).toLocaleString() : '—' },
                    ].map(({ label, value }) => (
                      <div key={label} className="border-b border-border/40 pb-3 last:border-0 last:pb-0">
                        <dt className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">{label}</dt>
                        <dd className="font-mono text-sm text-foreground break-all">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              ) : null}
            </Card>
          </motion.div>

          {/* Deployments & Events */}
          <motion.div variants={itemVariants} className="space-y-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-base font-semibold">Deployments & events</h2>
            </div>
            <Card className="rounded-xl border border-border/60 bg-card/60 overflow-hidden">
              {isLoading ? (
                <CardContent className="p-4 space-y-3">
                  {[1, 2].map((i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
                </CardContent>
              ) : (
                <div className="divide-y divide-border/40 max-h-[340px] overflow-y-auto">
                  {(service?.deployments ?? []).map((d) => (
                    <div key={d.id} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono text-xs font-medium truncate">{d.taskDefinition?.split('/').pop()}</span>
                        <EcsStatusBadge status={d.rolloutState ?? d.status} />
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {d.desiredCount} desired · {d.runningCount} running · {d.pendingCount} pending
                      </p>
                    </div>
                  ))}
                  {(service?.events ?? []).slice(0, 8).map((e) => (
                    <div key={e.id} className="px-4 py-2.5">
                      <p className="text-xs text-foreground/80">{e.message}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{e.createdAt ? new Date(e.createdAt).toLocaleString() : ''}</p>
                    </div>
                  ))}
                  {(service?.deployments?.length ?? 0) === 0 && (service?.events?.length ?? 0) === 0 && (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">No recent deployments or events</div>
                  )}
                </div>
              )}
            </Card>
          </motion.div>
        </div>

        {/* Tasks */}
        <motion.div variants={itemVariants} className="space-y-3">
          <h2 className="text-base font-semibold">Tasks ({tasks.length})</h2>
          <div className="rounded-xl border bg-card/50 backdrop-blur-sm overflow-hidden ring-1 ring-white/5">
            <IAMTable
              columns={[
                { id: 'id', header: 'Task', cell: (row) => <span className="font-mono text-xs">{row.arn.split('/').pop()}</span> },
                { id: 'status', header: 'Status', cell: (row) => <EcsStatusBadge status={row.status} /> },
                { id: 'launchType', header: 'Launch type', cell: (row) => <span className="text-sm text-muted-foreground">{row.launchType ?? '—'}</span> },
                {
                  id: 'started',
                  header: 'Started',
                  cell: (row) => <span className="text-xs text-muted-foreground">{row.startedAt ? new Date(row.startedAt).toLocaleString() : '—'}</span>,
                },
                {
                  id: 'actions',
                  header: '',
                  headerClassName: 'w-24',
                  cell: (row) => (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                      disabled={row.status === 'STOPPED' || row.desiredStatus === 'STOPPED'}
                      onClick={() => setStopTarget(row)}
                    >
                      <Square className="size-3.5" /> Stop
                    </Button>
                  ),
                },
              ]}
              rows={tasks}
              rowKey={(t) => t.arn}
              loading={tasksLoading}
              emptyMessage="No tasks currently running for this service"
            />
          </div>
        </motion.div>
      </motion.div>

      <StopTaskDialog
        task={stopTarget}
        stopping={isStopping}
        onCancel={() => setStopTarget(null)}
        onConfirm={handleStopTask}
      />
    </PageContainer>
  )
}
