import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useSecretDetail } from '../hooks/useSecretDetail'
import { useUpdateSecretValue } from '../hooks/useUpdateSecretValue'
import { useDeleteSecret } from '../hooks/useDeleteSecret'
import { SecretsAiQueryBar } from '../components/SecretsAiQueryBar'
import { RevealValueField } from '../components/RevealValueField'
import { DeleteSecretDialog } from '../components/DeleteSecretDialog'
import { ArrowLeft, KeyRound, Info, Copy, CheckCircle2, RefreshCw, Trash2, PencilLine } from 'lucide-react'

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

export function SecretDetailPage() {
  const { secretName } = useParams()
  const navigate = useNavigate()
  const { data: detail, isLoading, isError } = useSecretDetail(secretName)
  const { mutate: updateValue, isPending: isUpdating } = useUpdateSecretValue()
  const { mutate: removeSecret, isPending: isDeleting } = useDeleteSecret()

  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    setEditing(false)
    setEditValue('')
  }, [secretName])

  function handlePublish() {
    setConfirmOpen(false)
    updateValue(
      { secretName, value: editValue },
      {
        onSuccess: () => {
          toast.success('New version published')
          setEditing(false)
        },
        onError: (err) => toast.error('Publish failed', { description: err.message }),
      }
    )
  }

  function handleDelete(name) {
    removeSecret(name, {
      onSuccess: () => {
        toast.success(`${name} deleted`)
        navigate('/secrets')
      },
      onError: (err) => toast.error('Delete failed', { description: err.message }),
    })
  }

  return (
    <PageContainer>
      <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-6">
        {/* Back + delete */}
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate('/secrets')} className="gap-1.5 text-muted-foreground hover:text-foreground -ml-1">
            <ArrowLeft className="w-4 h-4" />
            Secrets
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteTarget(secretName)}
            className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
            disabled={isLoading}
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </Button>
        </motion.div>

        {/* Hero */}
        <motion.div variants={itemVariants} className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 ring-1 ring-primary/20">
            <KeyRound className="w-6 h-6 text-primary" />
          </div>
          <div>
            {isLoading ? (
              <>
                <Skeleton className="h-6 w-48 mb-1" />
                <Skeleton className="h-4 w-72" />
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold tracking-tight font-mono">{secretName}</h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs font-mono text-muted-foreground">{detail?.arn}</span>
                  {detail?.arn && <CopyButton value={detail.arn} />}
                </div>
              </>
            )}
          </div>
        </motion.div>

        {isError && (
          <motion.div variants={itemVariants} className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            Failed to load secret details.
          </motion.div>
        )}

        {/* AI Query Bar */}
        <motion.div variants={itemVariants}>
          <SecretsAiQueryBar secretName={secretName} />
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
                    <div className="border-b border-border/40 pb-3">
                      <dt className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Description</dt>
                      <dd className="text-sm">{detail.description || '(none)'}</dd>
                    </div>
                    <div className="border-b border-border/40 pb-3">
                      <dt className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Rotation</dt>
                      <dd className="text-sm flex items-center gap-1.5">
                        {detail.rotationEnabled ? (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            <RefreshCw className="w-3 h-3" /> Enabled
                          </span>
                        ) : (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">Off</span>
                        )}
                      </dd>
                    </div>
                    <div className="border-b border-border/40 pb-3">
                      <dt className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Last changed</dt>
                      <dd className="text-sm font-mono">{detail.lastChangedDate ? new Date(detail.lastChangedDate).toLocaleString() : '—'}</dd>
                    </div>
                    <div className="border-b border-border/40 pb-3">
                      <dt className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Versions</dt>
                      <dd className="text-sm">{detail.versionIds.length}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Tags</dt>
                      <dd className="text-sm">
                        {detail.tags.length === 0 ? '(none)' : (
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {detail.tags.map((t) => (
                              <span key={t.key} className="text-xs font-mono px-2 py-0.5 rounded-full bg-muted border border-border/50">
                                {t.key}={t.value}
                              </span>
                            ))}
                          </div>
                        )}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              ) : null}
            </Card>
          </motion.div>

          {/* Value */}
          <motion.div variants={itemVariants} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-base font-semibold">Value</h2>
              </div>
              {!editing && (
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={() => setEditing(true)} disabled={isLoading}>
                  <PencilLine className="size-3.5" />
                  Edit
                </Button>
              )}
            </div>

            {editing ? (
              <div className="space-y-3">
                <Textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder="New value — plain text or JSON"
                  className="font-mono text-xs min-h-32"
                  disabled={isUpdating}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => { setEditing(false); setEditValue('') }} disabled={isUpdating}>
                    Cancel
                  </Button>
                  <Button className="flex-1" disabled={!editValue.trim() || isUpdating} onClick={() => setConfirmOpen(true)}>
                    {isUpdating ? 'Publishing…' : 'Publish new version'}
                  </Button>
                </div>
              </div>
            ) : (
              <RevealValueField secretName={secretName} />
            )}
          </motion.div>
        </div>
      </motion.div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish new version?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            AWS doesn't overwrite a secret's value in place — this publishes a brand-new version for <span className="font-mono">{secretName}</span>. Anything reading the current value will start seeing this one instead.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={isUpdating}>
              Cancel
            </Button>
            <Button onClick={handlePublish} disabled={isUpdating}>
              {isUpdating ? 'Publishing…' : 'Publish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteSecretDialog
        secretName={deleteTarget}
        deleting={isDeleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </PageContainer>
  )
}
