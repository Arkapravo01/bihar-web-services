import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/format'
import { ChevronDown, ChevronRight, Copy } from 'lucide-react'

const LEVEL_RE = /^\s*\[?\s*(ERROR|WARN(?:ING)?|INFO|DEBUG)\s*\]?\s*[:–-]?\s/i
const LEVEL_VARIANT = { error: 'destructive', warn: 'warning', info: 'default', debug: 'secondary' }
const LEVEL_COLOR = {
  error: 'from-destructive/5 to-destructive/0 border-t-destructive/20',
  warn:  'from-yellow-500/5 to-yellow-500/0 border-t-yellow-500/20',
  info:  'from-blue-500/5 to-blue-500/0 border-t-blue-500/20',
  debug: 'from-muted-foreground/5 to-muted-foreground/0 border-t-muted-foreground/20',
}

function getLevel(message) {
  const m = LEVEL_RE.exec(message)
  if (m) {
    const raw = m[1].toLowerCase()
    return raw.startsWith('warn') ? 'warn' : raw
  }
  if (/Task timed out after/i.test(message)) return 'error'
  return null
}

function tryParseJson(str) {
  const trimmed = str.trim()
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null
  try { return JSON.stringify(JSON.parse(trimmed), null, 2) } catch { return null }
}

function getStatusCodeColor(code) {
  const num = parseInt(code, 10)
  if (num >= 200 && num < 300) return 'text-green-600 dark:text-green-400 font-semibold'
  if (num >= 300 && num < 400) return 'text-blue-600 dark:text-blue-400 font-semibold'
  if (num >= 400 && num < 500) return 'text-yellow-600 dark:text-yellow-500 font-semibold'
  if (num >= 500) return 'text-red-600 dark:text-red-400 font-semibold'
  return ''
}

function colorizeMessage(text) {
  // Color status codes (e.g., 200, 404, 500)
  let result = text.replace(/\b(\d{3})\b/g, (match) => {
    const color = getStatusCodeColor(match)
    return color ? `<span class="${color}">${match}</span>` : match
  })

  // Color timestamps (ISO format and space-separated)
  result = result.replace(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[Z.]?\d*|\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})/g,
    '<span class="text-blue-600 dark:text-blue-400">$1</span>')

  // Color hex values and IDs (common patterns)
  result = result.replace(/\b([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}|[a-f0-9]{32,})\b/gi,
    '<span class="text-purple-600 dark:text-purple-400 font-mono text-[0.8em]">$1</span>')

  // Color numbers (IPs, ports, durations, etc)
  result = result.replace(/\b(\d+(?:\.\d+){3}|\d+ms|\d+s|\d+\.\d+)\b/g,
    '<span class="text-amber-600 dark:text-amber-400">$1</span>')

  return result
}

function LogEvent({ event }) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const level = getLevel(event.message)
  const pretty = tryParseJson(event.message)
  const isLong = event.message.length > 200
  const collapsible = isLong || !!pretty

  const borderColor = {
    error: 'border-l-destructive',
    warn:  'border-l-yellow-500',
    info:  'border-l-blue-500',
    debug: 'border-l-muted-foreground',
  }[level] ?? 'border-l-border'

  const bgGradient = LEVEL_COLOR[level] ?? 'from-muted/5 to-muted/0'

  const raw = event.message.replace(/\s+/g, ' ').trim()
  const startsClean = /^[\w\[({'"<\-]/.test(raw)

  const handleCopy = () => {
    navigator.clipboard.writeText(event.message)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className={`rounded-lg border border-l-4 ${borderColor} overflow-hidden group hover:bg-muted/5 transition-colors`}>
      {/* Header row: timestamp, level, metadata */}
      <div className={`flex items-center justify-between gap-2 px-3 py-2 bg-gradient-to-r ${bgGradient} border-t ${collapsible ? 'cursor-pointer' : ''}`}
           onClick={() => collapsible && setExpanded((v) => !v)}>
        <div className="flex items-center gap-2 min-w-0">
          {collapsible && (
            <span className="text-muted-foreground shrink-0 group-hover:text-foreground transition-colors">
              {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            </span>
          )}
          <span className="font-mono text-xs text-muted-foreground shrink-0">
            {formatDate(event.timestamp)}
          </span>
          {level && (
            <Badge variant={LEVEL_VARIANT[level]} className="text-[10px] px-2 py-0.5 shrink-0 font-semibold">
              {level.toUpperCase()}
            </Badge>
          )}
          {pretty && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 opacity-60">JSON</Badge>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleCopy()
          }}
          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded"
          title="Copy message"
        >
          <Copy className="size-3 text-muted-foreground hover:text-foreground" />
        </button>
      </div>

      {/* Message content */}
      <div className="px-3 py-2 bg-card/50">
        <div
          className={`font-mono text-xs leading-relaxed ${isLong && !expanded ? 'line-clamp-3' : ''} break-words whitespace-pre-wrap text-foreground/85`}
          dangerouslySetInnerHTML={{
            __html: colorizeMessage(raw) + (isLong && !expanded ? '<span class="text-muted-foreground ml-1">…</span>' : '')
          }}
        />
      </div>

      {/* Expanded view: full message or pretty JSON */}
      {collapsible && expanded && (
        <div className="px-3 py-2 border-t bg-muted/20 overflow-x-auto">
          <pre
            className="font-mono text-xs whitespace-pre-wrap break-words leading-relaxed text-foreground/90"
            dangerouslySetInnerHTML={{
              __html: colorizeMessage(pretty ?? event.message)
            }}
          />
        </div>
      )}

      {/* Inline notification for copy */}
      {copied && (
        <div className="px-3 py-1 text-center text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border-t">
          Copied!
        </div>
      )}
    </div>
  )
}

export function LogEventsViewer({ events, loading }) {
  const [search, setSearch] = useState('')

  if (loading) {
    return (
      <div className="space-y-1">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
      </div>
    )
  }

  if (!events?.length) {
    return <p className="text-sm text-muted-foreground text-center py-16">No log events found</p>
  }

  const filtered = search
    ? events.filter((e) => e.message.toLowerCase().includes(search.toLowerCase()))
    : events

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Filter events…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <Badge variant="secondary">{filtered.length} events</Badge>
      </div>
      <div className="flex flex-col gap-1">
        {filtered.map((event, i) => (
          <LogEvent key={`${event.timestamp}-${i}`} event={event} />
        ))}
      </div>
    </div>
  )
}
