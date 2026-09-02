import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { PageContainer } from '@/components/layout/PageContainer'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { IAMTable } from '@/features/iam/components/IAMTable'
import { useCluster } from '../hooks/useCluster'
import { useServices } from '../hooks/useServices'
import { useTasks } from '../hooks/useTasks'
import { useContainerInstances } from '../hooks/useContainerInstances'
import { useStopTask } from '../hooks/useStopTask'
import { EcsAiQueryBar } from '../components/EcsAiQueryBar'
import { EcsStatusBadge } from '../components/EcsStatusBadge'
import { StopTaskDialog } from '../components/StopTaskDialog'
import { ArrowLeft, Boxes, Copy, CheckCircle2, Layers3, PlayCircle, Server, Square } from 'lucide-react'

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

function MiniStat({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-card/50 px-3 py-2">
      <Icon className="w-4 h-4 text-primary" />
      <div>
        <div className="text-sm font-bold leading-none">{value}</div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
      </div>
    </div>
  )
}

function resourceValue(resources, name) {
  return resources?.find((r) => r.name === name)?.integerValue ?? null
}

export function EcsClusterDetailPage() {
  const { clusterName } = useParams()
  const navigate = useNavigate()

  const { data: cluster, isLoading: clusterLoading } = useCluster(clusterName)
  const { data: servicesData, isLoading: servicesLoading } = useServices(clusterName)
  const { data: tasksData, isLoading: tasksLoading } = useTasks(clusterName)
  const { data: ciData, isLoading: ciLoading } = useContainerInstances(clusterName)
  const { mutate: stop, isPending: isStopping } = useStopTask(clusterName)

  const [stopTarget, setStopTarget] = useState(null)

  const services = useMemo(() => servicesData?.services ?? [], [servicesData])
  const tasks = useMemo(() => tasksData?.tasks ?? [], [tasksData])
  const containerInstances = useMemo(() => ciData?.containerInstances ?? [], [ciData])

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
          <Button variant="ghost" size="sm" onClick={() => navigate('/ecs')} className="gap-1.5 text-muted-foreground hover:text-foreground -ml-1">
            <ArrowLeft className="w-4 h-4" />
            Clusters
          </Button>
        </motion.div>

        {/* Hero */}
        <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <Boxes className="w-6 h-6 text-primary" />
            </div>
            <div>
              {clusterLoading ? (
                <>
                  <Skeleton className="h-6 w-48 mb-1" />
                  <Skeleton className="h-4 w-72" />
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight font-mono">{clusterName}</h1>
                    {cluster?.status && <EcsStatusBadge status={cluster.status} />}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs font-mono text-muted-foreground">{cluster?.arn}</span>
                    {cluster?.arn && <CopyButton value={cluster.arn} />}
                  </div>
                </>
              )}
            </div>
          </div>
          {cluster && (
            <div className="flex flex-wrap gap-2">
              <MiniStat icon={Layers3} label="Services" value={cluster.activeServicesCount} />
              <MiniStat icon={PlayCircle} label="Running" value={cluster.runningCount} />
              <MiniStat icon={Server} label="Instances" value={cluster.registeredContainerInstancesCount} />
            </div>
          )}
        </motion.div>

        {/* AI Query Bar */}
        <motion.div variants={itemVariants}>
          <EcsAiQueryBar clusterName={clusterName} />
        </motion.div>

        {/* Tabs */}
        <motion.div variants={itemVariants}>
          <Tabs defaultValue="services">
            <TabsList>
              <TabsTrigger value="services">Services ({services.length})</TabsTrigger>
              <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
              <TabsTrigger value="instances">Container Instances ({containerInstances.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="services" className="mt-4">
              <div className="rounded-xl border bg-card/50 backdrop-blur-sm overflow-hidden ring-1 ring-white/5">
                <IAMTable
                  columns={[
                    {
                      id: 'name',
                      header: 'Service name',
                      cell: (row) => (
                        <button
                          onClick={() => navigate(`/ecs/${encodeURIComponent(clusterName)}/services/${encodeURIComponent(row.name)}`)}
                          className="font-mono text-sm font-medium text-primary hover:underline underline-offset-2 transition-colors text-left cursor-pointer"
                        >
                          {row.name}
                        </button>
                      ),
                    },
                    { id: 'status', header: 'Status', cell: (row) => <EcsStatusBadge status={row.status} /> },
                    {
                      id: 'tasks',
                      header: 'Desired / Running / Pending',
                      cell: (row) => (
                        <span className="text-sm font-mono">
                          {row.desiredCount} / {row.runningCount} / {row.pendingCount}
                        </span>
                      ),
                    },
                    { id: 'launchType', header: 'Launch type', cell: (row) => <span className="text-sm text-muted-foreground">{row.launchType ?? '—'}</span> },
                    {
                      id: 'taskDef',
                      header: 'Task definition',
                      cell: (row) => <span className="text-xs font-mono text-muted-foreground truncate max-w-[220px] inline-block">{row.taskDefinition?.split('/').pop() ?? '—'}</span>,
                    },
                  ]}
                  rows={services}
                  rowKey={(s) => s.arn}
                  loading={servicesLoading}
                  emptyMessage="No services found in this cluster"
                />
              </div>
            </TabsContent>

            <TabsContent value="tasks" className="mt-4">
              <div className="rounded-xl border bg-card/50 backdrop-blur-sm overflow-hidden ring-1 ring-white/5">
                <IAMTable
                  columns={[
                    {
                      id: 'id',
                      header: 'Task',
                      cell: (row) => <span className="font-mono text-xs">{row.arn.split('/').pop()}</span>,
                    },
                    { id: 'status', header: 'Status', cell: (row) => <EcsStatusBadge status={row.status} /> },
                    { id: 'group', header: 'Group', cell: (row) => <span className="text-xs text-muted-foreground">{row.group ?? '—'}</span> },
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
                  emptyMessage="No tasks found in this cluster"
                />
              </div>
            </TabsContent>

            <TabsContent value="instances" className="mt-4">
              <div className="rounded-xl border bg-card/50 backdrop-blur-sm overflow-hidden ring-1 ring-white/5">
                <IAMTable
                  columns={[
                    { id: 'ec2', header: 'EC2 instance', cell: (row) => <span className="font-mono text-sm">{row.ec2InstanceId}</span> },
                    { id: 'status', header: 'Status', cell: (row) => <EcsStatusBadge status={row.status} /> },
                    {
                      id: 'tasks',
                      header: 'Running / Pending tasks',
                      cell: (row) => <span className="text-sm font-mono">{row.runningTasksCount} / {row.pendingTasksCount}</span>,
                    },
                    {
                      id: 'cpu',
                      header: 'CPU remaining / registered',
                      cell: (row) => (
                        <span className="text-sm font-mono text-muted-foreground">
                          {resourceValue(row.remainingResources, 'CPU') ?? '—'} / {resourceValue(row.registeredResources, 'CPU') ?? '—'}
                        </span>
                      ),
                    },
                    {
                      id: 'memory',
                      header: 'Memory remaining / registered',
                      cell: (row) => (
                        <span className="text-sm font-mono text-muted-foreground">
                          {resourceValue(row.remainingResources, 'MEMORY') ?? '—'} / {resourceValue(row.registeredResources, 'MEMORY') ?? '—'}
                        </span>
                      ),
                    },
                  ]}
                  rows={containerInstances}
                  rowKey={(ci) => ci.arn}
                  loading={ciLoading}
                  emptyMessage="No container instances registered (likely Fargate-only cluster)"
                />
              </div>
            </TabsContent>
          </Tabs>
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
