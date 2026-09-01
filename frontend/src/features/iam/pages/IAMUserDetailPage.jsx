import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useUserDetail } from '../hooks/useUserDetail'
import { useDeleteUser } from '../hooks/useDeleteUser'
import {
  ArrowLeft,
  User,
  Key,
  ShieldCheck,
  Copy,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'

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
    <button
      onClick={handleCopy}
      className="ml-2 text-muted-foreground hover:text-foreground transition-colors"
      title="Copy"
    >
      {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

function KeyStatusBadge({ status }) {
  const isActive = status === 'Active'
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
      isActive
        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
        : 'bg-muted text-muted-foreground border-border'
    }`}>
      {isActive
        ? <CheckCircle2 className="w-3 h-3" />
        : <XCircle className="w-3 h-3" />}
      {status}
    </span>
  )
}

function AccessKeyCard({ keyData, index }) {
  return (
    <motion.div
      variants={itemVariants}
      className="rounded-xl border border-border/60 bg-card/60 p-5 space-y-4"
    >
      {/* Key header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 ring-1 ring-primary/20 shrink-0">
            <Key className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-0.5">
              Access Key {index + 1}
            </p>
            <div className="flex items-center gap-1">
              <span className="font-mono text-sm font-semibold tracking-wide">
                {keyData.accessKeyId}
              </span>
              <CopyButton value={keyData.accessKeyId} />
            </div>
          </div>
        </div>
        <KeyStatusBadge status={keyData.status} />
      </div>

      {/* Key metadata */}
      <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border/40">
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Created</p>
          <div className="flex items-center gap-1.5 text-sm">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span>{keyData.createDate ? new Date(keyData.createDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span>
          </div>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Age</p>
          <div className="flex items-center gap-1.5 text-sm">
            {keyData.createDate ? (() => {
              const days = Math.floor((Date.now() - new Date(keyData.createDate)) / 86400000)
              const color = days > 365 ? 'text-red-500' : days > 180 ? 'text-amber-500' : 'text-emerald-500'
              return <span className={`font-medium ${color}`}>{days} days</span>
            })() : '—'}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function PolicyRow({ policy }) {
  return (
    <div className="flex items-center justify-between py-3 px-4 border-b border-border/40 last:border-0 hover:bg-primary/5 transition-colors group">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-violet-500/10 ring-1 ring-violet-500/20 shrink-0">
          <ShieldCheck className="w-3.5 h-3.5 text-violet-500" />
        </div>
        <div className="min-w-0">
          <p className="font-mono text-sm font-medium truncate">{policy.PolicyName}</p>
          <p className="font-mono text-[11px] text-muted-foreground truncate">{policy.PolicyArn}</p>
        </div>
      </div>
      <CopyButton value={policy.PolicyArn} />
    </div>
  )
}

export function IAMUserDetailPage() {
  const { userName } = useParams()
  const navigate = useNavigate()
  const { data, isLoading, isError } = useUserDetail(userName)
  const { mutate: deleteUserMutate, isPending: isDeleting } = useDeleteUser()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const user = data?.user
  const accessKeys = data?.accessKeys ?? []
  const attachedPolicies = data?.attachedPolicies ?? []

  const handleDelete = () => {
    deleteUserMutate(userName, {
      onSuccess: () => navigate('/iam'),
    })
  }

  return (
    <PageContainer>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="space-y-6"
      >
        {/* Back + title + delete */}
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/iam')}
            className="gap-1.5 text-muted-foreground hover:text-foreground -ml-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Users
          </Button>
          {!showDeleteConfirm ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
              disabled={isLoading}
            >
              <Trash2 className="w-4 h-4" />
              Delete User
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting…' : 'Confirm Delete'}
              </Button>
            </div>
          )}
        </motion.div>

        {/* User hero */}
        <motion.div variants={itemVariants} className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 ring-1 ring-primary/20">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div>
            {isLoading ? (
              <>
                <Skeleton className="h-6 w-48 mb-1" />
                <Skeleton className="h-4 w-72" />
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold tracking-tight font-mono">{userName}</h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs font-mono text-muted-foreground">{user?.arn}</span>
                  {user?.arn && <CopyButton value={user.arn} />}
                </div>
              </>
            )}
          </div>
        </motion.div>

        {isError && (
          <motion.div variants={itemVariants} className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            Failed to load user details.
          </motion.div>
        )}

        {/* Two-column layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* Security credentials — Access Keys */}
          <motion.div variants={itemVariants} className="space-y-3">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-base font-semibold">Security credentials</h2>
              <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5 ml-1">
                {isLoading ? '…' : `${accessKeys.length} key${accessKeys.length !== 1 ? 's' : ''}`}
              </span>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-28 w-full rounded-xl" />
                <Skeleton className="h-28 w-full rounded-xl" />
              </div>
            ) : accessKeys.length === 0 ? (
              <div className="rounded-xl border border-border/50 bg-card/40 px-4 py-8 text-center">
                <Key className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No access keys</p>
              </div>
            ) : (
              <div className="space-y-3">
                {accessKeys.map((k, i) => (
                  <AccessKeyCard key={k.accessKeyId} keyData={k} index={i} />
                ))}
              </div>
            )}
          </motion.div>

          {/* Permissions — Attached policies */}
          <motion.div variants={itemVariants} className="space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-base font-semibold">Permissions</h2>
              <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5 ml-1">
                {isLoading ? '…' : `${attachedPolicies.length} polic${attachedPolicies.length !== 1 ? 'ies' : 'y'}`}
              </span>
            </div>

            <Card className="rounded-xl border border-border/60 bg-card/60 overflow-hidden">
              {isLoading ? (
                <CardContent className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
                </CardContent>
              ) : attachedPolicies.length === 0 ? (
                <CardContent className="px-4 py-8 text-center">
                  <ShieldCheck className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No policies attached</p>
                </CardContent>
              ) : (
                <div>
                  {attachedPolicies.map((p) => (
                    <PolicyRow key={p.PolicyArn} policy={p} />
                  ))}
                </div>
              )}
            </Card>
          </motion.div>
        </div>

        {/* User metadata footer */}
        {!isLoading && user && (
          <motion.div variants={itemVariants}>
            <Card className="rounded-xl border border-border/50 bg-card/40">
              <CardHeader className="pb-2 border-b border-border/40">
                <CardTitle className="text-sm text-muted-foreground font-medium">User details</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <dl className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
                  {[
                    { label: 'User ID', value: user.userId },
                    { label: 'Username', value: user.name },
                    { label: 'Created', value: user.createDate ? new Date(user.createDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <dt className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">{label}</dt>
                      <dd className="font-mono text-sm">{value ?? '—'}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </PageContainer>
  )
}
