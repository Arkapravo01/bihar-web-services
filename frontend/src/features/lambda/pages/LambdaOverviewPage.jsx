import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useFunctions } from '../hooks/useFunctions'
import { useEnv } from '../hooks/useEnv'
import { IAMTable } from '@/features/iam/components/IAMTable'
import { ActivityTimeline } from '@/components/data-display/ActivityTimeline'
import { useActivity } from '@/app/providers/ActivityProvider'
import { Code2, Play, CheckCircle2, AlertCircle } from 'lucide-react'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

export function LambdaOverviewPage() {
  const navigate = useNavigate()
  const { data: env } = useEnv()
  const { data: functionsData = [], isLoading, error } = useFunctions()
  const { events: activity } = useActivity()
  const [search, setSearch] = useState('')

  const functions = useMemo(() => functionsData.functions ?? [], [functionsData])
  const filteredFunctions = functions.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  )

  if (error) {
    const isNetworkError = !error.status
    return (
      <PageContainer>
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Code2 className="size-5" /> Lambda Functions
          </h1>
          <p className="text-sm text-muted-foreground">Serverless functions</p>
        </div>
        <div className="rounded-xl border border-dashed border-destructive/30 bg-destructive/5 flex flex-col items-center justify-center gap-3 py-20 text-center">
          <AlertCircle className="size-8 text-destructive/60" />
          <p className="text-sm font-semibold text-destructive">
            {isNetworkError ? 'Backend not reachable' : 'Lambda not configured'}
          </p>
          <p className="text-xs text-muted-foreground max-w-sm">
            {isNetworkError
              ? 'The backend server is not running. Start it with npm run dev.'
              : 'AWS profile for Lambda is not set up or has no permissions.'}
          </p>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="space-y-6"
      >
        {/* Hero */}
        <motion.div variants={itemVariants} className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 blur-3xl" />
          <div className="relative space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 ring-1 ring-primary/20">
                <Code2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Lambda Functions</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Manage serverless functions</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Functions List */}
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Functions</h2>
              <p className="text-xs text-muted-foreground mt-1">{filteredFunctions.length} of {functions.length} functions</p>
            </div>
            <Input
              placeholder="Search functions…"
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
                      onClick={() => navigate(`/lambda/functions/${encodeURIComponent(row.name)}`)}
                      className="font-mono text-sm font-medium text-primary hover:underline underline-offset-2 transition-colors text-left cursor-pointer"
                    >
                      {row.name}
                    </button>
                  ),
                },
                {
                  id: 'runtime',
                  header: 'Runtime',
                  cell: (row) => <span className="text-sm text-muted-foreground">{row.runtime}</span>,
                },
                {
                  id: 'memory',
                  header: 'Memory',
                  cell: (row) => <span className="text-sm">{row.memorySize} MB</span>,
                },
                {
                  id: 'timeout',
                  header: 'Timeout',
                  cell: (row) => <span className="text-sm text-muted-foreground">{row.timeout}s</span>,
                },
                {
                  id: 'state',
                  header: 'State',
                  cell: (row) => (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      row.state === 'Active'
                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                        : 'bg-yellow-500/10 text-yellow-600 border border-yellow-500/20'
                    }`}>
                      {row.state === 'Active' ? <CheckCircle2 className="w-3 h-3 inline mr-1" /> : null}
                      {row.state}
                    </span>
                  ),
                },
              ]}
              rows={filteredFunctions}
              rowKey={(f) => f.name}
              loading={isLoading}
              emptyMessage="No functions found"
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
