import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { useState, useMemo, useEffect } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useFunction } from '../hooks/useFunction'
import { useInvokeFunction } from '../hooks/useInvokeFunction'
import { useUpdateFunctionConfig } from '../hooks/useUpdateFunctionConfig'
import { getFunctionCode } from '../api/lambdaApi'
import { ArrowLeft, Code2, Settings, Play, Copy, CheckCircle2, Edit2 } from 'lucide-react'
import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-dark.css'

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
  const [functionCode, setFunctionCode] = useState(null)
  const [codeLoading, setCodeLoading] = useState(false)
  const [editMode, setEditMode] = useState({})
  const [editValues, setEditValues] = useState({})

  const config = useMemo(() => data?.config, [data])
  const codeLocation = useMemo(() => data?.codeLocation, [data])

  useEffect(() => {
    if (functionName && !functionCode && !codeLoading && !isLoading) {
      setCodeLoading(true)
      getFunctionCode(functionName)
        .then((data) => setFunctionCode(data.code || 'Unable to fetch code'))
        .catch(() => setFunctionCode('Unable to fetch code'))
        .finally(() => setCodeLoading(false))
    }
  }, [functionName, functionCode, codeLoading, isLoading])

  const getLanguage = () => {
    if (functionCode?.includes('def ') || functionCode?.includes('import ')) return 'python'
    if (functionCode?.includes('exports.') || functionCode?.includes('async ')) return 'javascript'
    if (functionCode?.includes('package ')) return 'java'
    if (functionCode?.includes('func ')) return 'go'
    return 'plaintext'
  }

  const highlightedCode = useMemo(() => {
    if (!functionCode || functionCode.startsWith('Unable')) return null
    try {
      return hljs.highlight(functionCode, { language: getLanguage(), ignoreIllegals: true }).value
    } catch {
      return hljs.highlightAuto(functionCode).value
    }
  }, [functionCode])

  const handleInvoke = () => {
    try {
      const payload = JSON.parse(testPayload)
      console.log('Invoking with payload:', payload)
      invokeFunc({ functionName, payload })
    } catch (e) {
      alert('Invalid JSON payload')
    }
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

    console.log('Saving config:', { functionName, updates })
    updateConfig({ functionName, updates }, {
      onSuccess: (data) => {
        console.log('Config updated successfully:', data)
        setEditMode((prev) => ({ ...prev, [field]: false }))
      },
      onError: (error) => {
        console.error('Config update failed:', error)
        alert('Failed to update: ' + error.message)
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

        {/* Code Viewer - TOP SECTION */}
        <motion.div variants={itemVariants}>
          <Card className="rounded-xl border border-border/50 bg-card/40 overflow-hidden">
            <CardHeader className="pb-2 border-b border-border/40">
              <CardTitle className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                <Code2 className="w-4 h-4" />
                Source Code
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 p-0">
              {codeLoading ? (
                <div className="p-4 space-y-2 bg-black/40">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-3/4" />
                </div>
              ) : functionCode ? (
                <div className="overflow-auto max-h-96 bg-[#282c34] p-4">
                  <pre className="font-mono text-sm leading-relaxed text-[#abb2bf]">
                    {highlightedCode ? (
                      <code dangerouslySetInnerHTML={{ __html: highlightedCode }} />
                    ) : (
                      functionCode
                    )}
                  </pre>
                </div>
              ) : (
                <div className="p-4 text-xs text-muted-foreground bg-black/40">Unable to fetch code</div>
              )}
            </CardContent>
          </Card>
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

              {(invocationResult || data?.statusCode) && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
                  <div className="text-xs font-medium mb-2 text-emerald-600">✓ Invocation Response</div>
                  <pre className="text-xs overflow-auto max-h-40 text-foreground font-mono bg-black/20 p-2 rounded">
                    {JSON.stringify(invocationResult || data, null, 2)}
                  </pre>
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
                  {[
                    { label: 'Description', value: config.description || '(none)' },
                    { label: 'Environment Vars', value: Object.keys(config.environment || {}).length },
                    { label: 'Layers', value: config.layers?.length || 0 },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <dt className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">{label}</dt>
                      <dd className="text-sm">{value ?? '—'}</dd>
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
