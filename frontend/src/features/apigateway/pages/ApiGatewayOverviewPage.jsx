import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { IAMTable } from '@/features/iam/components/IAMTable'
import { ActivityTimeline } from '@/components/data-display/ActivityTimeline'
import { useActivity } from '@/app/providers/ActivityProvider'
import { useApis } from '../hooks/useApis'
import { ApiGatewayStats } from '../components/ApiGatewayStats'
import { ApiGatewayAiQueryBar } from '../components/ApiGatewayAiQueryBar'
import { Globe, AlertCircle } from 'lucide-react'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

export function ApiGatewayOverviewPage() {
  const navigate = useNavigate()
  const { data: apisData = {}, isLoading, error } = useApis()
  const { events: activity } = useActivity()
  const [search, setSearch] = useState('')

  const apis = useMemo(() => apisData.apis ?? [], [apisData])
  const edgeCount = useMemo(() => apis.filter((a) => a.endpointTypes?.includes('EDGE')).length, [apis])
  const regionalCount = useMemo(() => apis.filter((a) => a.endpointTypes?.includes('REGIONAL')).length, [apis])
  const filteredApis = apis.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()))

  if (error) {
    const isNetworkError = !error.status
    return (
      <PageContainer>
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Globe className="size-5" /> API Gateway
          </h1>
          <p className="text-sm text-muted-foreground">REST APIs</p>
        </div>
        <div className="rounded-xl border border-dashed border-destructive/30 bg-destructive/5 flex flex-col items-center justify-center gap-3 py-20 text-center">
          <AlertCircle className="size-8 text-destructive/60" />
          <p className="text-sm font-semibold text-destructive">
            {isNetworkError ? 'Backend not reachable' : 'API Gateway not configured'}
          </p>
          <p className="text-xs text-muted-foreground max-w-sm">
            {isNetworkError
              ? 'The backend server is not running. Start it with npm run dev.'
              : error.message || 'AWS profile for API Gateway is not set up or has no permissions.'}
          </p>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-6">
        {/* Hero */}
        <motion.div variants={itemVariants} className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 blur-3xl" />
          <div className="relative flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">API Gateway</h1>
              <p className="text-sm text-muted-foreground mt-0.5">REST APIs and their stages</p>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div variants={itemVariants}>
          <ApiGatewayStats totalCount={apis.length} edgeCount={edgeCount} regionalCount={regionalCount} />
        </motion.div>

        {/* AI Query Bar */}
        <motion.div variants={itemVariants}>
          <ApiGatewayAiQueryBar />
        </motion.div>

        {/* APIs list */}
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">REST APIs</h2>
              <p className="text-xs text-muted-foreground mt-1">{filteredApis.length} of {apis.length} APIs</p>
            </div>
            <Input
              placeholder="Search APIs…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 rounded-lg border-border/50 bg-background/50"
            />
          </div>

          <div className="rounded-xl border bg-card/50 backdrop-blur-sm overflow-hidden ring-1 ring-white/5">
            <IAMTable
              columns={[
                {
                  id: 'name',
                  header: 'Name',
                  cell: (row) => (
                    <button
                      onClick={() => navigate(`/apigateway/${encodeURIComponent(row.id)}`)}
                      className="font-mono text-sm font-medium text-primary hover:underline underline-offset-2 transition-colors text-left cursor-pointer"
                    >
                      {row.name}
                    </button>
                  ),
                },
                {
                  id: 'id',
                  header: 'ID',
                  cell: (row) => <span className="text-xs font-mono text-muted-foreground">{row.id}</span>,
                },
                {
                  id: 'endpointTypes',
                  header: 'Endpoint',
                  cell: (row) => (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 border border-sky-500/20">
                      {row.endpointTypes?.join(', ') || '—'}
                    </span>
                  ),
                },
                {
                  id: 'createdDate',
                  header: 'Created',
                  cell: (row) => (
                    <span className="text-sm text-muted-foreground">
                      {row.createdDate ? new Date(row.createdDate).toLocaleDateString() : '—'}
                    </span>
                  ),
                },
              ]}
              rows={filteredApis}
              rowKey={(a) => a.id}
              loading={isLoading}
              emptyMessage="No REST APIs found"
            />
          </div>
        </motion.div>

        {/* Activity */}
        <motion.div variants={itemVariants}>
          <Card className="rounded-xl border bg-gradient-to-br from-card/80 to-card/50 backdrop-blur-sm ring-1 ring-white/5">
            <CardHeader className="border-b border-border/50">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <ActivityTimeline events={activity} />
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </PageContainer>
  )
}
