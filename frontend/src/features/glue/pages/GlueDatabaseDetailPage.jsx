import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { motion } from 'motion/react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useQuery } from '@tanstack/react-query'
import { getDatabase, listTables } from '../api/glueApi'
import { useTables } from '../hooks/useTables'
import { GlueAiQueryBar } from '../components/GlueAiQueryBar'
import { IAMTable } from '@/features/iam/components/IAMTable'
import { ArrowLeft, Database, AlertCircle, Table2 } from 'lucide-react'

// ─── helpers ─────────────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
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

export function GlueDatabaseDetailPage() {
  const { dbName }   = useParams()
  const navigate     = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [tableSearch, setTableSearch] = useState('')
  const [selectedTable, setSelectedTable] = useState(null)

  const decodedName = decodeURIComponent(dbName)

  const { data: dbData, isLoading: dbLoading, error: dbError } = useQuery({
    queryKey: ['glue', 'database', decodedName],
    queryFn: () => getDatabase(decodedName),
    enabled: !!decodedName,
  })

  const { data: tablesData, isLoading: tablesLoading } = useTables(decodedName)

  const database = dbData?.database
  const tables   = tablesData?.tables ?? []
  const filteredTables = tables.filter((t) => t.name.toLowerCase().includes(tableSearch.toLowerCase()))

  // ── error state ────────────────────────────────────────────────────────────
  if (dbError) {
    return (
      <PageContainer>
        <div className="rounded-xl border border-dashed border-destructive/30 bg-destructive/5 flex flex-col items-center justify-center gap-3 py-20 text-center">
          <AlertCircle className="size-8 text-destructive/60" />
          <p className="text-sm font-semibold text-destructive">Could not load database</p>
          <p className="text-xs text-muted-foreground">{dbError.message}</p>
          <Button variant="ghost" size="sm" onClick={() => navigate('/glue')}>← Back to Glue</Button>
        </div>
      </PageContainer>
    )
  }

  const TABS = ['overview', 'tables', 'ai']
  const TAB_LABELS = { overview: 'Overview', tables: 'Tables', ai: 'AI Assistant' }

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
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-sky-500/10 ring-1 ring-sky-500/20">
              <Database className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              {dbLoading ? (
                <Skeleton className="h-7 w-64 mb-1" />
              ) : (
                <h1 className="text-2xl font-bold tracking-tight font-mono">{database?.name ?? decodedName}</h1>
              )}
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground">Data Catalog Database</span>
                {!tablesLoading && (
                  <span className="text-xs text-muted-foreground">· {tables.length} tables</span>
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
                {tab === 'tables' && tables.length > 0 && (
                  <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {tables.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Overview tab */}
        {activeTab === 'overview' && (
          <motion.div key="overview" variants={itemVariants}>
            <Card className="rounded-xl border bg-card/50 backdrop-blur-sm ring-1 ring-white/5 max-w-2xl">
              <CardHeader className="border-b border-border/50 pb-3">
                <CardTitle className="text-sm font-semibold">Database Details</CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                {dbLoading ? (
                  <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
                ) : (
                  <div>
                    <DetailRow label="Name"        value={database?.name} />
                    <DetailRow label="Description" value={database?.description} />
                    <DetailRow label="Catalog ID"  value={database?.catalogId} />
                    <DetailRow label="ARN"         value={database?.arn} />
                    <DetailRow label="Created"     value={database?.created ? new Date(database.created).toLocaleString() : null} />
                    <DetailRow label="Updated"     value={database?.updated ? new Date(database.updated).toLocaleString() : null} />
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Tables tab */}
        {activeTab === 'tables' && (
          <motion.div key="tables" variants={itemVariants} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Tables</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {filteredTables.length} of {tables.length} tables
                </p>
              </div>
              <Input
                placeholder="Search tables…"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="w-64 rounded-lg border-border/50 bg-background/50"
              />
            </div>

            <div className="flex gap-4">
              {/* Table list */}
              <div className="rounded-xl border bg-card/50 backdrop-blur-sm overflow-hidden ring-1 ring-white/5 flex-1">
                <IAMTable
                  columns={[
                    {
                      id: 'name',
                      header: 'Table Name',
                      cell: (row) => (
                        <button
                          onClick={() => setSelectedTable(selectedTable?.name === row.name ? null : row)}
                          className="font-mono text-sm font-medium text-primary hover:underline underline-offset-2 transition-colors text-left cursor-pointer"
                        >
                          {row.name}
                        </button>
                      ),
                    },
                    {
                      id: 'tableType',
                      header: 'Type',
                      cell: (row) => (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 border border-sky-500/20">
                          {row.tableType || 'EXTERNAL_TABLE'}
                        </span>
                      ),
                    },
                    {
                      id: 'columns',
                      header: 'Columns',
                      cell: (row) => (
                        <span className="text-sm text-muted-foreground">{row.columns?.length ?? 0}</span>
                      ),
                    },
                    {
                      id: 'location',
                      header: 'Location',
                      cell: (row) => (
                        <span className="text-xs font-mono text-muted-foreground truncate max-w-[220px] block">
                          {row.location || '—'}
                        </span>
                      ),
                    },
                    {
                      id: 'updated',
                      header: 'Updated',
                      cell: (row) => (
                        <span className="text-sm text-muted-foreground">
                          {row.updated ? new Date(row.updated).toLocaleDateString() : '—'}
                        </span>
                      ),
                    },
                  ]}
                  rows={filteredTables}
                  rowKey={(t) => t.name}
                  loading={tablesLoading}
                  emptyMessage="No tables found in this database."
                />
              </div>

              {/* Table detail panel */}
              {selectedTable && (
                <motion.div
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="w-80 shrink-0"
                >
                  <Card className="rounded-xl border bg-card/50 backdrop-blur-sm ring-1 ring-white/5 sticky top-4">
                    <CardHeader className="border-b border-border/50 pb-3">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Table2 className="size-4 text-muted-foreground" />
                        {selectedTable.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-3 space-y-4 overflow-y-auto max-h-[600px]">
                      {/* Schema */}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Schema ({selectedTable.columns?.length ?? 0} columns)</p>
                        <div className="divide-y divide-border/50">
                          {(selectedTable.columns ?? []).map((col) => (
                            <div key={col.name} className="flex items-center justify-between py-1.5 gap-2">
                              <span className="text-xs font-mono text-foreground">{col.name}</span>
                              <span className="text-xs font-mono text-muted-foreground shrink-0">{col.type}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Partition keys */}
                      {selectedTable.partitionKeys?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Partition Keys</p>
                          <div className="divide-y divide-border/50">
                            {selectedTable.partitionKeys.map((pk) => (
                              <div key={pk.name} className="flex items-center justify-between py-1.5 gap-2">
                                <span className="text-xs font-mono text-foreground">{pk.name}</span>
                                <span className="text-xs font-mono text-muted-foreground shrink-0">{pk.type}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Storage */}
                      {selectedTable.location && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Location</p>
                          <p className="text-xs font-mono text-foreground break-all">{selectedTable.location}</p>
                        </div>
                      )}

                      <button
                        onClick={() => setSelectedTable(null)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Close
                      </button>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* AI tab */}
        {activeTab === 'ai' && (
          <motion.div key="ai" variants={itemVariants}>
            <GlueAiQueryBar contextName={decodedName} contextType="database" />
          </motion.div>
        )}
      </motion.div>
    </PageContainer>
  )
}
