import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { useState } from 'react'
import { toast } from 'sonner'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useInstanceDetail } from '../hooks/useInstanceDetail'
import { useSnapshots } from '../hooks/useSnapshots'
import { useRestoreFromSnapshot } from '../hooks/useRestoreFromSnapshot'
import { RdsAiQueryBar } from '../components/RdsAiQueryBar'
import { InstanceActionsBar } from '../components/InstanceActionsBar'
import { RestoreSnapshotDialog } from '../components/RestoreSnapshotDialog'
import { ArrowLeft, Database, Info, Copy, CheckCircle2, Camera, RotateCcw } from 'lucide-react'

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

export function RdsInstanceDetailPage() {
  const { instanceId } = useParams()
  const navigate = useNavigate()
  const { data: detail, isLoading, isError } = useInstanceDetail(instanceId)
  const { data: snapshotsData, isLoading: snapshotsLoading } = useSnapshots(instanceId)
  const { mutate: restore, isPending: isRestoring } = useRestoreFromSnapshot()

  const [restoreTarget, setRestoreTarget] = useState(null)
  const snapshots = snapshotsData?.snapshots ?? []

  function handleRestore({ snapshotId, newInstanceId }) {
    restore(
      { snapshotId, newInstanceId },
      {
        onSuccess: () => {
          toast.success(`Restoring ${newInstanceId} from ${snapshotId}`)
          setRestoreTarget(null)
          navigate(`/rds/${encodeURIComponent(newInstanceId)}`)
        },
        onError: (err) => toast.error('Restore failed', { description: err.message }),
      }
    )
  }

  return (
    <PageContainer>
      <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-6">
        {/* Back */}
        <motion.div variants={itemVariants}>
          <Button variant="ghost" size="sm" onClick={() => navigate('/rds')} className="gap-1.5 text-muted-foreground hover:text-foreground -ml-1">
            <ArrowLeft className="w-4 h-4" />
            Instances
          </Button>
        </motion.div>

        {/* Hero */}
        <motion.div variants={itemVariants} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <Database className="w-6 h-6 text-primary" />
            </div>
            <div>
              {isLoading ? (
                <>
                  <Skeleton className="h-6 w-48 mb-1" />
                  <Skeleton className="h-4 w-72" />
                </>
              ) : (
                <>
                  <h1 className="text-2xl font-bold tracking-tight font-mono">{instanceId}</h1>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs font-mono text-muted-foreground">{detail?.arn}</span>
                    {detail?.arn && <CopyButton value={detail.arn} />}
                  </div>
                </>
              )}
            </div>
          </div>
          {detail && <InstanceActionsBar instanceId={instanceId} status={detail.status} onDeleted={() => navigate('/rds')} />}
        </motion.div>

        {isError && (
          <motion.div variants={itemVariants} className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            Failed to load instance details.
          </motion.div>
        )}

        {/* AI Query Bar */}
        <motion.div variants={itemVariants}>
          <RdsAiQueryBar instanceId={instanceId} />
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
              ) : detail ? (
                <CardContent className="p-4">
                  <dl className="space-y-4">
                    {[
                      { label: 'Endpoint', value: detail.endpoint ? `${detail.endpoint}:${detail.port}` : '—' },
                      { label: 'Engine', value: `${detail.engine} ${detail.engineVersion}` },
                      { label: 'Instance class', value: detail.instanceClass },
                      { label: 'Storage', value: `${detail.allocatedStorage} GB (${detail.storageType})` },
                      { label: 'Multi-AZ', value: detail.multiAZ ? 'Yes' : 'No' },
                      { label: 'Backup retention', value: `${detail.backupRetentionPeriod} day(s)` },
                      { label: 'Publicly accessible', value: detail.publiclyAccessible ? 'Yes' : 'No' },
                      { label: 'Deletion protection', value: detail.deletionProtection ? 'Enabled' : 'Disabled' },
                    ].map(({ label, value }) => (
                      <div key={label} className="border-b border-border/40 pb-3 last:border-0 last:pb-0">
                        <dt className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">{label}</dt>
                        <dd className="font-mono text-sm text-foreground break-all">{value ?? '—'}</dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              ) : null}
            </Card>
          </motion.div>

          {/* Snapshots */}
          <motion.div variants={itemVariants} className="space-y-3">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-base font-semibold">Snapshots</h2>
              <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5 ml-1">
                {snapshotsLoading ? '…' : snapshots.length}
              </span>
            </div>
            <Card className="rounded-xl border border-border/60 bg-card/60 overflow-hidden">
              {snapshotsLoading ? (
                <CardContent className="p-4 space-y-3">
                  {[1, 2].map((i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
                </CardContent>
              ) : snapshots.length === 0 ? (
                <CardContent className="px-4 py-8 text-center">
                  <Camera className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No snapshots yet</p>
                </CardContent>
              ) : (
                <div className="divide-y divide-border/40">
                  {snapshots.map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-medium truncate">{s.id}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {s.status} · {s.snapshotType} · {s.createdTime ? new Date(s.createdTime).toLocaleDateString() : '—'}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 shrink-0" onClick={() => setRestoreTarget({ ...s, instanceId })}>
                        <RotateCcw className="size-3.5" />
                        Restore
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>
        </div>
      </motion.div>

      <RestoreSnapshotDialog
        snapshot={restoreTarget}
        restoring={isRestoring}
        onCancel={() => setRestoreTarget(null)}
        onConfirm={handleRestore}
      />
    </PageContainer>
  )
}
