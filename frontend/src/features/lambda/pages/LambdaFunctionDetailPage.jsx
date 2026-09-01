import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useFunction } from '../hooks/useFunction'
import { useInvokeFunction } from '../hooks/useInvokeFunction'
import { useUpdateFunctionConfig } from '../hooks/useUpdateFunctionConfig'
import { LambdaAiQueryBar } from '../components/LambdaAiQueryBar'
import { FunctionCodeExplorer } from '../components/FunctionCodeExplorer'
import { EnvVarsDialog } from '../components/EnvVarsDialog'
import { LayersDialog } from '../components/LayersDialog'
import { ArrowLeft, Code2, Settings, Play, Copy, CheckCircle2, Edit2 } from 'lucide-react'

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

export function LambdaFunctionDetailPage() {
  const { functionName } = useParams()
  const navigate = useNavigate()
  const { data, isLoading, isError } = useFunction(functionName)
  const { mutate: invokeFunc, isPending: isInvoking, data: invocationResult } = useInvokeFunction()
  const { mutate: updateConfig, isPending: isUpdating } = useUpdateFunctionConfig()
  const [testPayload, setTestPayload] = useState('{}')
  const [editMode, setEditMode] = useState({})
  const [editValues, setEditValues] = useState({})
  const [envVarsOpen, setEnvVarsOpen] = useState(false)
  const [layersOpen, setLayersOpen] = useState(false)

  const config = useMemo(() => data?.config, [data])

  const handleInvoke = () => {
    let payload
    try {
      payload = JSON.parse(testPayload)
    } catch (e) {
      toast.error('Invalid JSON payload')
      return
    }
    invokeFunc(
      { functionName, payload },
      {
        onSuccess: (result) => {
          if (result.functionError) {
            toast.error(`Invocation returned ${result.functionError}`, { description: 'See response panel below for details.' })
          } else {
            toast.success('Invocation succeeded')
          }
        },
        onError: (error) => {
          toast.error('Invoke failed', { description: error.message })
        },
      }
    )
  }

  const toggleEdit = (field) => {
    setEditMode((prev) => ({ ...prev, [field]: !prev[field] }))
    if (!editMode[field]) {
      setEditValues((prev) => ({ ...prev, [field]: config?.[field === 'memorySize' ? 'memorySize' : field] }))
    }
  }

  const handleSave = (field) => {
    const updates = {}
    if (field === 'timeout') updates.timeout = parseInt(editValues.timeout)
    if (field === 'memorySize') updates.memorySize = parseInt(editValues.memorySize)
    if (field === 'description') updates.description = editValues.description

    updateConfig({ functionName, updates }, {
      onSuccess: () => {
        toast.success('Configuration updated')
        setEditMode((prev) => ({ ...prev, [field]: false }))
      },
      onError: (error) => {
        toast.error('Failed to update', { description: error.message })
      },
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
        {/* Back button */}
        <motion.div variants={itemVariants} className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/lambda')}
            className="gap-1.5 text-muted-foreground hover:text-foreground -ml-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Functions
          </Button>
        </motion.div>

        {/* Hero */}
        <motion.div variants={itemVariants} className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 ring-1 ring-primary/20">
            <Code2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            {isLoading ? (
              <>
                <Skeleton className="h-6 w-48 mb-1" />
                <Skeleton className="h-4 w-72" />
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold tracking-tight font-mono">{functionName}</h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs font-mono text-muted-foreground">{config?.functionName}</span>
                  {config?.functionName && <CopyButton value={config.functionName} />}
                </div>
              </>
            )}
          </div>
        </motion.div>

        {isError && (
          <motion.div variants={itemVariants} className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            Failed to load function details.
          </motion.div>
        )}

        {/* AI Query Bar */}
        <motion.div variants={itemVariants}>
          <LambdaAiQueryBar functionName={functionName} />
        </motion.div>

        {/* Code Explorer - TOP SECTION */}
        <motion.div variants={itemVariants}>
          <FunctionCodeExplorer functionName={functionName} />
        </motion.div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Configuration */}
          <motion.div variants={itemVariants} className="space-y-3">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-base font-semibold">Configuration</h2>
            </div>

            <Card className="rounded-xl border border-border/60 bg-card/60">
              {isLoading ? (
                <CardContent className="p-4 space-y-3">
                  {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-6 w-full rounded" />)}
                </CardContent>
              ) : config ? (
                <CardContent className="p-4">
                  <dl className="space-y-4">
                    {[
                      { label: 'Runtime', field: 'runtime', editable: false },
                      { label: 'Handler', field: 'handler', editable: false },
                      { label: 'Memory', field: 'memorySize', editable: true, format: (v) => `${v} MB` },
                      { label: 'Timeout', field: 'timeout', editable: true, format: (v) => `${v}s` },
                      { label: 'Role', field: 'role', editable: false },
                    ].map(({ label, field, editable, format }) => (
                      <div key={label} className="border-b border-border/40 pb-3 last:border-0 last:pb-0">
                        <dt className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1 flex items-center justify-between">
                          {label}
                          {editable && (
                            <button
                              onClick={() => toggleEdit(field)}
                              className="text-xs text-primary hover:bg-primary/10 px-2 py-1 rounded"
                              disabled={isUpdating}
                            >
                              <Edit2 className="w-3 h-3 inline" />
                            </button>
                          )}
                        </dt>
                        {editMode[field] ? (
                          <div className="flex gap-2 mt-2">
                            <input
                              type={field === 'description' ? 'text' : 'number'}
                              value={editValues[field] || ''}
                              onChange={(e) => setEditValues((prev) => ({ ...prev, [field]: e.target.value }))}
                              className="flex-1 px-2 py-1 text-sm border rounded bg-card"
                              disabled={isUpdating}
                            />
                            <button
                              onClick={() => handleSave(field)}
                              className="px-2 py-1 text-xs bg-primary text-white rounded hover:bg-primary/90"
                              disabled={isUpdating}
                            >
                              {isUpdating ? '…' : 'Save'}
                            </button>
                            <button
                              onClick={() => setEditMode((prev) => ({ ...prev, [field]: false }))}
                              className="px-2 py-1 text-xs border rounded hover:bg-muted"
                              disabled={isUpdating}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <dd className="font-mono text-sm text-foreground break-all">
                            {format ? format(config[field]) : config[field] || '—'}
                          </dd>
                        )}
                      </div>
                    ))}
                  </dl>
                </CardContent>
              ) : null}
            </Card>
          </motion.div>

          {/* Test Invocation */}
          <motion.div variants={itemVariants} className="space-y-3">
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-base font-semibold">Test Invocation</h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-2 block">Payload (JSON)</label>
                <textarea
                  value={testPayload}
                  onChange={(e) => setTestPayload(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-card text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={6}
                  disabled={isInvoking}
                />
              </div>

              <Button
                onClick={handleInvoke}
                disabled={isInvoking || isLoading}
                className="w-full"
              >
                {isInvoking ? 'Invoking…' : 'Invoke Function'}
              </Button>

              {invocationResult && (
                <div className={`rounded-lg border p-4 ${
                  invocationResult.functionError
                    ? 'border-destructive/30 bg-destructive/5'
                    : 'border-emerald-500/30 bg-emerald-500/5'
                }`}>
                  <div className={`text-xs font-medium mb-2 ${invocationResult.functionError ? 'text-destructive' : 'text-emerald-600'}`}>
                    {invocationResult.functionError ? `✕ ${invocationResult.functionError}` : '✓ Invocation Response'}
                  </div>
                  <pre className="text-xs overflow-auto max-h-40 text-foreground font-mono bg-black/20 p-2 rounded">
                    {JSON.stringify(invocationResult.payload, null, 2)}
                  </pre>
                  {invocationResult.logResult && (
                    <details className="mt-2">
                      <summary className="text-xs text-muted-foreground cursor-pointer">Logs</summary>
                      <pre className="text-xs overflow-auto max-h-40 text-foreground/80 font-mono bg-black/20 p-2 rounded mt-1 whitespace-pre-wrap">
                        {invocationResult.logResult}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Details */}
        {!isLoading && config && (
          <motion.div variants={itemVariants}>
            <Card className="rounded-xl border border-border/50 bg-card/40">
              <CardHeader className="pb-2 border-b border-border/40">
                <CardTitle className="text-sm text-muted-foreground font-medium">Details</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <dl className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
                  <div>
                    <dt className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">Description</dt>
                    <dd className="text-sm">{config.description || '(none)'}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">Environment Vars</dt>
                    <dd>
                      <button
                        onClick={() => setEnvVarsOpen(true)}
                        className="text-sm text-primary hover:underline underline-offset-2"
                      >
                        {Object.keys(config.environment || {}).length}
                      </button>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">Layers</dt>
                    <dd>
                      <button
                        onClick={() => setLayersOpen(true)}
                        className="text-sm text-primary hover:underline underline-offset-2"
                      >
                        {config.layers?.length || 0}
                      </button>
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </motion.div>
        )}

      </motion.div>

      <EnvVarsDialog open={envVarsOpen} onOpenChange={setEnvVarsOpen} environment={config?.environment} />
      <LayersDialog
        open={layersOpen}
        onOpenChange={setLayersOpen}
        functionName={functionName}
        currentLayerArns={config?.layers?.map((l) => l.arn) ?? []}
      />
    </PageContainer>
  )
}
