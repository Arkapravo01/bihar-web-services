import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { motion } from 'motion/react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useCrawler } from '../hooks/useCrawler'
import { useCrawlHistory } from '../hooks/useCrawlHistory'
import { GlueAiQueryBar } from '../components/GlueAiQueryBar'
import { IAMTable } from '@/features/iam/components/IAMTable'
import {
  ArrowLeft, Bug, Clock, AlertCircle, CheckCircle2, XCircle, Loader2,
} from 'lucide-react'

// ─── helpers ─────────────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

function crawlerStateStyle(state) {
  if (state === 'READY')    return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
  if (state === 'RUNNING')  return 'bg-amber-500/10 text-amber-600 border-amber-500/20'
  if (state === 'STOPPING') return 'bg-orange-500/10 text-orange-600 border-orange-500/20'
  return 'bg-muted text-muted-foreground border-border'
}

function crawlHistoryStyle(state) {
  if (!state) return 'bg-muted text-muted-foreground border-border'
  const s = state.toUpperCase()
  if (s === 'SUCCEEDED') return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
  if (s === 'FAILED')    return 'bg-red-500/10 text-red-600 border-red-500/20'
  if (s === 'RUNNING')   return 'bg-amber-500/10 text-amber-600 border-amber-500/20'
  if (s === 'CANCELLED') return 'bg-muted text-muted-foreground border-border'
  return 'bg-muted text-muted-foreground border-border'
}

function CrawlStateIcon({ state }) {
  const s = state?.toUpperCase()
  if (s === 'SUCCEEDED') return <CheckCircle2 className="size-3.5 text-emerald-500" />
  if (s === 'FAILED')    return <XCircle className="size-3.5 text-red-500" />
  if (s === 'RUNNING')   return <Loader2 className="size-3.5 text-amber-500 animate-spin" />
  return <Clock className="size-3.5 text-muted-foreground" />
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start py-2.5 border-b border-border/50 last:border-0">
      <span className="w-40 shrink-0 text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="text-sm font-mono text-foreground break-all">{value ?? '—'}</span>
    </div>
  )
}

// ─── component ────────────────────────────────────────────────────────────────

export function GlueCrawlerDetailPage() {
  const { crawlerName } = useParams()
  const navigate        = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')

  const { data: crawlerData, isLoading: crawlerLoading, error: crawlerError } = useCrawler(crawlerName)
  const { data: historyData, isLoading: historyLoading }                      = useCrawlHistory(crawlerName)

  const crawler = crawlerData?.crawler
  const crawls  = historyData?.crawls ?? []

  const decodedName = decodeURIComponent(crawlerName)

  // ── error state ────────────────────────────────────────────────────────────
  if (crawlerError) {
    return (
      <PageContainer>
        <div className="rounded-xl border border-dashed border-destructive/30 bg-destructive/5 flex flex-col items-center justify-center gap-3 py-20 text-center">
          <AlertCircle className="size-8 text-destructive/60" />
          <p className="text-sm font-semibold text-destructive">Could not load crawler</p>
          <p className="text-xs text-muted-foreground">{crawlerError.message}</p>
          <Button variant="ghost" size="sm" onClick={() => navigate('/glue')}>← Back to Glue</Button>
        </div>
      </PageContainer>
    )
  }

  const TABS = ['overview', 'history', 'ai']
  const TAB_LABELS = { overview: 'Overview', history: 'Crawl History', ai: 'AI Assistant' }

  // ── render targets ─────────────────────────────────────────────────────────
  function renderTargets(targets) {
    if (!targets) return <p className="text-sm text-muted-foreground py-4 text-center">No targets configured.</p>
    const s3 = targets.S3Targets ?? []
    const jdbc = targets.JdbcTargets ?? []
    return (
      <div className="space-y-3">
        {s3.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">S3 Targets</p>
            {s3.map((t, i) => (
              <div key={i} className="flex items-center py-1.5 border-b border-border/50 last:border-0">
                <span className="text-xs font-mono text-foreground">{t.Path}</span>
                {t.Exclusions?.length > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground">excl: {t.Exclusions.join(', ')}</span>
                )}
              </div>
            ))}
          </div>
        )}
        {jdbc.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">JDBC Targets</p>
            {jdbc.map((t, i) => (
              <div key={i} className="flex items-center py-1.5 border-b border-border/50 last:border-0">
                <span className="text-xs font-mono text-foreground">{t.ConnectionName}</span>
                <span className="ml-2 text-xs text-muted-foreground">{t.Path}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <PageContainer>
      <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-6">

        {/* Breadcrumb + header */}
        <motion.div variants={itemVariants}>
          <button
            onClick={() => navigate('/glue')}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="size-3.5" />
            AWS Glue
          </button>

          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
              <Bug className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              {crawlerLoading ? (
                <Skeleton className="h-7 w-64 mb-1" />
              ) : (
                <h1 className="text-2xl font-bold tracking-tight font-mono">{crawler?.name ?? decodedName}</h1>
              )}
              <div className="flex items-center gap-2 mt-0.5">
                {crawler?.status && (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${crawlerStateStyle(crawler.status)}`}>
                    {crawler.status}
                  </span>
                )}
                {crawler?.database && (
                  <span className="text-xs text-muted-foreground">→ {crawler.database}</span>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tab bar */}
        <motion.div variants={itemVariants} className="border-b border-border">
          <div className="flex gap-0">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {TAB_LABELS[tab]}
                {tab === 'history' && crawls.length > 0 && (
                  <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {crawls.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Overview tab */}
        {activeTab === 'overview' && (
          <motion.div key="overview" variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="rounded-xl border bg-card/50 backdrop-blur-sm ring-1 ring-white/5">
              <CardHeader className="border-b border-border/50 pb-3">
                <CardTitle className="text-sm font-semibold">Crawler Details</CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                {crawlerLoading ? (
                  <div className="space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
                ) : (
                  <div>
                    <DetailRow label="Name"         value={crawler?.name} />
                    <DetailRow label="State"        value={crawler?.status} />
                    <DetailRow label="Database"     value={crawler?.database} />
                    <DetailRow label="Table Prefix" value={crawler?.tablePrefix} />
                    <DetailRow label="Role"         value={crawler?.role} />
                    <DetailRow label="Schedule"     value={crawler?.schedule || 'On demand'} />
                    <DetailRow label="Last Crawl"   value={crawler?.lastCrawl ? new Date(crawler.lastCrawl).toLocaleString() : null} />
                    <DetailRow label="Created"      value={crawler?.created ? new Date(crawler.created).toLocaleString() : null} />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-xl border bg-card/50 backdrop-blur-sm ring-1 ring-white/5">
              <CardHeader className="border-b border-border/50 pb-3">
                <CardTitle className="text-sm font-semibold">Targets</CardTitle>
              </CardHeader>
              <CardContent className="pt-3">
                {crawlerLoading
                  ? <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-6" />)}</div>
                  : renderTargets(crawler?.targets)
                }
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Crawl History tab */}
        {activeTab === 'history' && (
          <motion.div key="history" variants={itemVariants} className="space-y-4">
            <div className="rounded-xl border bg-card/50 backdrop-blur-sm overflow-hidden ring-1 ring-white/5">
              <IAMTable
                columns={[
                  {
                    id: 'crawlId',
                    header: 'Crawl ID',
                    cell: (row) => (
                      <span className="text-xs font-mono text-muted-foreground">{row.crawlId}</span>
                    ),
                  },
                  {
                    id: 'state',
                    header: 'State',
                    cell: (row) => (
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full border ${crawlHistoryStyle(row.state)}`}>
                        <CrawlStateIcon state={row.state} />
                        {row.state}
                      </span>
                    ),
                  },
                  {
                    id: 'startTime',
                    header: 'Started',
                    cell: (row) => (
                      <span className="text-sm text-muted-foreground">
                        {row.startTime ? new Date(row.startTime).toLocaleString() : '—'}
                      </span>
                    ),
                  },
                  {
                    id: 'endTime',
                    header: 'Ended',
                    cell: (row) => (
                      <span className="text-sm text-muted-foreground">
                        {row.endTime ? new Date(row.endTime).toLocaleString() : '—'}
                      </span>
                    ),
                  },
                  {
                    id: 'error',
                    header: 'Error',
                    cell: (row) => row.errorMessage
                      ? <span className="text-xs text-red-500 font-mono truncate max-w-[300px] block">{row.errorMessage}</span>
                      : <span className="text-muted-foreground">—</span>,
                  },
                ]}
                rows={crawls}
                rowKey={(c) => c.crawlId}
                loading={historyLoading}
                emptyMessage="No crawl runs found — this crawler has not run yet."
              />
            </div>
          </motion.div>
        )}

        {/* AI tab */}
        {activeTab === 'ai' && (
          <motion.div key="ai" variants={itemVariants}>
            <GlueAiQueryBar contextName={decodedName} contextType="crawler" />
          </motion.div>
        )}
      </motion.div>
    </PageContainer>
  )
}
