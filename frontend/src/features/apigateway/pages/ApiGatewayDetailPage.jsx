import { useParams, useNavigate } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useApiDetail } from '../hooks/useApiDetail'
import { useStages } from '../hooks/useStages'
import { useResources } from '../hooks/useResources'
import { useDeployments } from '../hooks/useDeployments'
import { ApiGatewayAiQueryBar } from '../components/ApiGatewayAiQueryBar'
import { testInvokeMethod } from '../api/apiGatewayApi'
import {
  ArrowLeft, Globe, Layers, GitBranch, Rocket, Info,
  Play, Copy, CheckCircle2, ChevronRight, ChevronDown,
  Clock, Hash, ExternalLink,
} from 'lucide-react'

// ─── constants ────────────────────────────────────────────────────────────────

const METHOD_COLORS = {
  GET:     { bg: 'bg-sky-500/10',     text: 'text-sky-600',     border: 'border-sky-500/30',     solid: 'bg-sky-500' },
  POST:    { bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/30', solid: 'bg-emerald-500' },
  PUT:     { bg: 'bg-amber-500/10',   text: 'text-amber-600',   border: 'border-amber-500/30',   solid: 'bg-amber-500' },
  PATCH:   { bg: 'bg-violet-500/10',  text: 'text-violet-600',  border: 'border-violet-500/30',  solid: 'bg-violet-500' },
  DELETE:  { bg: 'bg-red-500/10',     text: 'text-red-600',     border: 'border-red-500/30',     solid: 'bg-red-500' },
  ANY:     { bg: 'bg-muted',          text: 'text-muted-foreground', border: 'border-border',    solid: 'bg-muted-foreground' },
  OPTIONS: { bg: 'bg-muted',          text: 'text-muted-foreground', border: 'border-border',    solid: 'bg-muted-foreground' },
  HEAD:    { bg: 'bg-muted',          text: 'text-muted-foreground', border: 'border-border',    solid: 'bg-muted-foreground' },
}

function methodStyle(m) {
  return METHOD_COLORS[m?.toUpperCase()] ?? METHOD_COLORS.ANY
}

// ─── small utils ─────────────────────────────────────────────────────────────

function MethodBadge({ method, size = 'sm' }) {
  const s = methodStyle(method)
  const pad = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
  return (
    <span className={`font-mono font-bold rounded border ${pad} ${s.bg} ${s.text} ${s.border}`}>
      {method}
    </span>
  )
}

function CopyButton({ value }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="ml-1.5 text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

function StatusBadge({ status }) {
  if (!status) return null
  const ok = status >= 200 && status < 300
  const redirect = status >= 300 && status < 400
  const cls = ok
    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
    : redirect
    ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
    : 'bg-red-500/10 text-red-600 border-red-500/30'
  return (
    <span className={`text-sm font-mono font-bold px-2 py-0.5 rounded border ${cls}`}>{status}</span>
  )
}

// ─── Resource tree ────────────────────────────────────────────────────────────

function ResourceTree({ resources, selectedKey, onSelect }) {
  const [expanded, setExpanded] = useState({})

  // Build tree from flat list
  const tree = useMemo(() => {
    const byId = {}
    const roots = []
    for (const r of resources) {
      byId[r.id] = { ...r, children: [] }
    }
    for (const r of resources) {
      if (r.parentId && byId[r.parentId]) {
        byId[r.parentId].children.push(byId[r.id])
      } else if (!r.parentId) {
        roots.push(byId[r.id])
      }
    }
    // also handle root (path = '/') having parentId = undefined
    const rootNode = resources.find((r) => r.path === '/')
    if (rootNode && !roots.find((r) => r.id === rootNode.id)) roots.unshift(byId[rootNode.id])
    // sort children alphabetically
    function sortChildren(node) {
      node.children.sort((a, b) => a.path.localeCompare(b.path))
      node.children.forEach(sortChildren)
    }
    roots.forEach(sortChildren)
    return roots
  }, [resources])

  function toggle(id) {
    setExpanded((p) => ({ ...p, [id]: !p[id] }))
  }

  function renderNode(node, depth = 0) {
    const hasChildren = node.children.length > 0
    const hasMethods = node.methods.length > 0
    const isOpen = expanded[node.id] !== false // default open
    const segment = depth === 0 ? node.path : node.path.split('/').pop() || node.path

    return (
      <div key={node.id}>
        {/* Resource row */}
        <div
          className="flex items-center gap-1 group"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          <button
            className="flex items-center gap-1 flex-1 min-w-0 py-1"
            onClick={() => hasChildren && toggle(node.id)}
          >
            {hasChildren ? (
              isOpen
                ? <ChevronDown className="w-3 h-3 shrink-0 text-muted-foreground" />
                : <ChevronRight className="w-3 h-3 shrink-0 text-muted-foreground" />
            ) : (
              <span className="w-3 h-3 shrink-0" />
            )}
            <span className="font-mono text-xs text-foreground truncate">/{segment.replace(/^\//, '')}</span>
          </button>
        </div>

        {/* Method rows under this resource */}
        {hasMethods && isOpen && node.methods.map((method) => {
          const key = `${node.id}::${method}`
          const isSelected = selectedKey === key
          const s = methodStyle(method)
          return (
            <button
              key={key}
              onClick={() => onSelect({ resource: node, method, key })}
              className={`w-full flex items-center gap-2 py-1.5 px-2 text-left transition-colors rounded-sm ${
                isSelected
                  ? `${s.bg} ${s.border} border-l-2`
                  : 'hover:bg-muted/60 border-l-2 border-transparent'
              }`}
              style={{ paddingLeft: `${depth * 16 + 24}px` }}
            >
              <MethodBadge method={method} size="sm" />
            </button>
          )
        })}

        {/* Children */}
        {hasChildren && isOpen && node.children.map((child) => renderNode(child, depth + 1))}
      </div>
    )
  }

  return (
    <div className="select-none">
      {tree.map((node) => renderNode(node, 0))}
    </div>
  )
}

// ─── Test console ─────────────────────────────────────────────────────────────

function TestConsole({ apiId, resource, method, stages }) {
  const [stage, setStage] = useState(stages[0]?.stageName ?? '')
  const [path, setPath] = useState(resource.path)
  const [queryString, setQueryString] = useState('')
  const [headersText, setHeadersText] = useState('')
  const [body, setBody] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const s = methodStyle(method)
  const showBody = ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())

  // derive invoke URL from stage
  const invokeUrl = stage
    ? `https://${apiId}.execute-api.${window.location.hostname.includes('localhost') ? 'eu-west-1' : 'eu-west-1'}.amazonaws.com/${stage}${path}`
    : null

  function parseHeaders() {
    const h = {}
    for (const line of headersText.split('\n')) {
      const idx = line.indexOf(':')
      if (idx > 0) h[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
    }
    return h
  }

  async function handleTest() {
    setLoading(true)
    setResult(null)
    try {
      const qs = queryString ? `?${queryString.replace(/^\?/, '')}` : ''
      const res = await testInvokeMethod(apiId, resource.id, {
        httpMethod: method,
        pathWithQueryString: path + qs,
        body: showBody ? body : '',
        headers: parseHeaders(),
      })
      setResult(res)
      if (res.status >= 200 && res.status < 300) {
        toast.success(`${res.status} — Test succeeded`)
      } else {
        toast.error(`${res.status} — Test returned an error`)
      }
    } catch (err) {
      toast.error('Test failed', { description: err.message })
      setResult({ status: null, body: err.message, headers: {}, log: null, latency: null })
    } finally {
      setLoading(false)
    }
  }

  const methodDetail = resource.methodDetails?.[method] ?? {}

  return (
    <div className="flex flex-col gap-5">
      {/* Method + path header */}
      <div className="flex items-center gap-3 pb-4 border-b border-border/50">
        <MethodBadge method={method} size="lg" />
        <span className="font-mono text-sm font-medium text-foreground">{resource.path}</span>
        {methodDetail.authorizationType && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border font-mono ml-auto">
            {methodDetail.authorizationType}
          </span>
        )}
        {methodDetail.apiKeyRequired && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20 font-mono">
            API Key required
          </span>
        )}
      </div>

      {/* Stage selector + invoke URL */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Stage</label>
        <div className="flex items-center gap-2">
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            className="text-sm font-mono border border-border/60 rounded-lg px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">— no stage —</option>
            {stages.map((s) => (
              <option key={s.stageName} value={s.stageName}>{s.stageName}</option>
            ))}
          </select>
          {invokeUrl && (
            <div className="flex items-center gap-1 min-w-0 flex-1">
              <span className="font-mono text-xs text-muted-foreground truncate">{invokeUrl}</span>
              <CopyButton value={invokeUrl} />
              <a href={invokeUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Path override */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Path</label>
        <input
          value={path}
          onChange={(e) => setPath(e.target.value)}
          className="w-full font-mono text-sm border border-border/60 rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Query string */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Query String</label>
        <input
          value={queryString}
          onChange={(e) => setQueryString(e.target.value)}
          placeholder="key=value&another=thing"
          className="w-full font-mono text-sm border border-border/60 rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Headers */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Headers</label>
        <textarea
          value={headersText}
          onChange={(e) => setHeadersText(e.target.value)}
          placeholder={'Content-Type: application/json\nAuthorization: Bearer ...'}
          rows={3}
          className="w-full font-mono text-sm border border-border/60 rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none"
        />
      </div>

      {/* Body — only for POST/PUT/PATCH */}
      {showBody && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Request Body</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="{}"
            rows={5}
            className="w-full font-mono text-sm border border-border/60 rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
        </div>
      )}

      {/* Test button */}
      <Button
        onClick={handleTest}
        disabled={loading}
        className={`w-full gap-2 font-semibold ${s.solid ? '' : ''}`}
      >
        <Play className="w-4 h-4" />
        {loading ? 'Sending…' : 'Test'}
      </Button>

      {/* Response */}
      {result && (
        <div className={`rounded-xl border overflow-hidden ${
          result.status >= 200 && result.status < 300
            ? 'border-emerald-500/30 bg-emerald-500/5'
            : 'border-red-500/30 bg-red-500/5'
        }`}>
          {/* Response header row */}
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/30">
            <StatusBadge status={result.status} />
            {result.latency != null && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />{result.latency} ms
              </span>
            )}
            <span className="text-xs text-muted-foreground ml-auto">Response</span>
          </div>

          {/* Response body */}
          {result.body != null && (
            <div className="px-4 py-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Body</p>
              <pre className="text-xs font-mono overflow-auto max-h-64 bg-black/20 rounded-lg p-3 text-foreground whitespace-pre-wrap break-all">
                {(() => {
                  try { return JSON.stringify(JSON.parse(result.body), null, 2) }
                  catch { return result.body }
                })()}
              </pre>
            </div>
          )}

          {/* Response headers */}
          {result.headers && Object.keys(result.headers).length > 0 && (
            <details className="px-4 pb-3">
              <summary className="text-xs text-muted-foreground cursor-pointer py-1 flex items-center gap-1">
                <Hash className="w-3 h-3" /> Response Headers ({Object.keys(result.headers).length})
              </summary>
              <div className="mt-2 space-y-1">
                {Object.entries(result.headers).map(([k, v]) => (
                  <div key={k} className="flex gap-2 text-xs font-mono">
                    <span className="text-muted-foreground shrink-0">{k}:</span>
                    <span className="text-foreground break-all">{v}</span>
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* Execution log */}
          {result.log && (
            <details className="px-4 pb-3">
              <summary className="text-xs text-muted-foreground cursor-pointer py-1">Execution log</summary>
              <pre className="mt-2 text-[11px] font-mono overflow-auto max-h-48 bg-black/20 rounded-lg p-3 text-foreground/80 whitespace-pre-wrap">
                {result.log}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.03 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

export function ApiGatewayDetailPage() {
  const { apiId } = useParams()
  const navigate = useNavigate()
  const { data: detail, isLoading, isError } = useApiDetail(apiId)
  const { data: stagesData, isLoading: stagesLoading } = useStages(apiId)
  const { data: resourcesData, isLoading: resourcesLoading } = useResources(apiId)
  const { data: deploymentsData, isLoading: deploymentsLoading } = useDeployments(apiId)

  const stages = useMemo(() => stagesData?.stages ?? [], [stagesData])
  const resources = useMemo(() => resourcesData?.resources ?? [], [resourcesData])
  const deployments = useMemo(() => deploymentsData?.deployments ?? [], [deploymentsData])

  // active tab: 'resources' | 'stages' | 'deployments' | 'details'
  const [activeTab, setActiveTab] = useState('resources')
  // selected method in tree
  const [selected, setSelected] = useState(null)

  const tabs = [
    { id: 'resources', label: 'Resources' },
    { id: 'stages',    label: 'Stages' },
    { id: 'deployments', label: 'Deployments' },
    { id: 'details',   label: 'Details' },
  ]

  return (
    <PageContainer>
      <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-5">
        {/* Back */}
        <motion.div variants={itemVariants}>
          <Button variant="ghost" size="sm" onClick={() => navigate('/apigateway')} className="gap-1.5 text-muted-foreground hover:text-foreground -ml-1">
            <ArrowLeft className="w-4 h-4" />
            APIs
          </Button>
        </motion.div>

        {/* Hero */}
        <motion.div variants={itemVariants} className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 ring-1 ring-primary/20">
            <Globe className="w-6 h-6 text-primary" />
          </div>
          <div className="min-w-0">
            {isLoading ? (
              <><Skeleton className="h-6 w-52 mb-1" /><Skeleton className="h-4 w-32" /></>
            ) : (
              <>
                <h1 className="text-2xl font-bold tracking-tight truncate">{detail?.name ?? apiId}</h1>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-xs font-mono text-muted-foreground">{apiId}</span>
                  <CopyButton value={apiId} />
                  {detail?.endpointTypes?.[0] && (
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 border border-sky-500/20 font-mono font-bold">
                      {detail.endpointTypes[0]}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </motion.div>

        {isError && (
          <motion.div variants={itemVariants} className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            Failed to load API details.
          </motion.div>
        )}

        {/* AI Query Bar */}
        <motion.div variants={itemVariants}>
          <ApiGatewayAiQueryBar apiName={detail?.name ?? apiId} apiId={apiId} />
        </motion.div>

        {/* Tab bar */}
        <motion.div variants={itemVariants}>
          <div className="flex border-b border-border/60">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── Resources tab ── */}
        {activeTab === 'resources' && (
          <motion.div variants={itemVariants} className="grid grid-cols-1 gap-0 lg:grid-cols-[280px_1fr] rounded-xl border border-border/60 bg-card/60 overflow-hidden">
            {/* Left: resource tree */}
            <div className="border-b lg:border-b-0 lg:border-r border-border/60 overflow-y-auto max-h-[70vh]">
              <div className="px-3 py-2.5 border-b border-border/40 bg-muted/30">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <GitBranch className="w-3 h-3" />
                  Resources
                  {!resourcesLoading && <span className="ml-auto font-normal">{resources.length}</span>}
                </p>
              </div>
              {resourcesLoading ? (
                <div className="p-4 space-y-2">
                  {[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-5 w-full rounded" />)}
                </div>
              ) : (
                <ResourceTree
                  resources={resources}
                  selectedKey={selected?.key}
                  onSelect={setSelected}
                />
              )}
            </div>

            {/* Right: method detail + test console */}
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {!selected ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-3 text-center">
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                    <Play className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Select a method to test</p>
                  <p className="text-xs text-muted-foreground/60 max-w-xs">
                    Click any method badge in the resource tree on the left to open the test console.
                  </p>
                </div>
              ) : (
                <TestConsole
                  apiId={apiId}
                  resource={selected.resource}
                  method={selected.method}
                  stages={stages}
                />
              )}
            </div>
          </motion.div>
        )}

        {/* ── Stages tab ── */}
        {activeTab === 'stages' && (
          <motion.div variants={itemVariants} className="space-y-3">
            {stagesLoading ? (
              <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
            ) : stages.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/60 py-16 text-center">
                <Layers className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No stages deployed</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {stages.map((s) => {
                  const invokeUrl = `https://${apiId}.execute-api.eu-west-1.amazonaws.com/${s.stageName}`
                  return (
                    <Card key={s.stageName} className="rounded-xl border border-border/60 bg-card/60">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-mono font-semibold text-sm">{s.stageName}</p>
                            {s.deploymentId && (
                              <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{s.deploymentId}</p>
                            )}
                          </div>
                          {s.lastUpdatedDate && (
                            <span className="text-[11px] text-muted-foreground shrink-0">
                              {new Date(s.lastUpdatedDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground bg-muted/50 rounded-lg px-2 py-1.5 min-w-0">
                          <span className="truncate flex-1">{invokeUrl}</span>
                          <CopyButton value={invokeUrl} />
                          <a href={invokeUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary ml-0.5">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                          {s.loggingLevel && <span className="px-1.5 py-0.5 rounded bg-muted border border-border">logging: {s.loggingLevel}</span>}
                          {s.metricsEnabled && <span className="px-1.5 py-0.5 rounded bg-muted border border-border">metrics on</span>}
                          {s.cacheEnabled && <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">cache on</span>}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Deployments tab ── */}
        {activeTab === 'deployments' && (
          <motion.div variants={itemVariants}>
            <Card className="rounded-xl border border-border/60 bg-card/60 overflow-hidden">
              {deploymentsLoading ? (
                <CardContent className="p-4 space-y-2">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
                </CardContent>
              ) : deployments.length === 0 ? (
                <CardContent className="py-16 text-center">
                  <Rocket className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No deployments</p>
                </CardContent>
              ) : (
                <div className="divide-y divide-border/40">
                  {deployments.map((d, i) => (
                    <div key={d.id} className="flex items-center gap-3 px-5 py-3">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${i === 0 ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                      <span className="font-mono text-xs text-muted-foreground w-24 shrink-0">{d.id}</span>
                      <span className="text-sm text-foreground flex-1 min-w-0 truncate">{d.description || <span className="text-muted-foreground">—</span>}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {d.createdDate ? new Date(d.createdDate).toLocaleDateString() : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {/* ── Details tab ── */}
        {activeTab === 'details' && (
          <motion.div variants={itemVariants}>
            <Card className="rounded-xl border border-border/60 bg-card/60">
              {isLoading ? (
                <CardContent className="p-5 space-y-3">
                  {[1,2,3,4].map(i => <Skeleton key={i} className="h-7 w-full rounded" />)}
                </CardContent>
              ) : detail ? (
                <CardContent className="p-5">
                  <dl className="divide-y divide-border/40">
                    {[
                      { label: 'API ID', value: detail.id, mono: true, copy: true },
                      { label: 'Name', value: detail.name },
                      { label: 'Description', value: detail.description || '—' },
                      { label: 'Endpoint type', value: detail.endpointTypes?.join(', ') || '—', mono: true },
                      { label: 'Created', value: detail.createdDate ? new Date(detail.createdDate).toLocaleString() : '—' },
                    ].map(({ label, value, mono, copy }) => (
                      <div key={label} className="py-3 flex items-start gap-4">
                        <dt className="text-[11px] text-muted-foreground uppercase tracking-wider w-36 shrink-0 pt-0.5">{label}</dt>
                        <dd className={`text-sm flex-1 break-all flex items-center gap-1 ${mono ? 'font-mono' : ''}`}>
                          {value}
                          {copy && value && value !== '—' && <CopyButton value={value} />}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              ) : null}
            </Card>
          </motion.div>
        )}
      </motion.div>
    </PageContainer>
  )
}
