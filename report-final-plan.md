# Log Intelligence — Complete Implementation Plan

**Status:** Ready for implementation  
**Model Target:** Haiku 4.5 (designed for easy parsing and execution)  
**Scope:** Full Log Intelligence page + Report Agent (multi-worker parallel log analysis)

---

## Context

Adding a new "Log Intelligence" page backed by a dynamic Report Agent that discovers CloudWatch log groups, spawns one worker per group (N groups → N workers, not hardcoded), analyzes real events in parallel (concurrency=5), categorizes failures, deduplicates, computes recurrence, correlates findings, and synthesizes an AI-readable report. **No fake data. Ever.** Findings come ONLY from real CloudWatch events. Zero-error runs show "No confirmed errors detected" (valid). Analysis failures show "Analysis unavailable" (not a fake zero).

---

## 1. Backend Files: `backend/src/agents/report-agent/`

### File Structure
```
backend/src/agents/report-agent/
├── agent.js                  # Conversational agent wrapper (runAgent-based)
├── tools.js                  # Tool defs + executeTool for conversational interface
├── knowledge.md              # Empty file (created by runAgent's saveIncident)
├── incidents/                # Lazily created by runAgent
├── store.js                  # ReportRun persistence (disk + in-memory index)
└── engine/
    ├── pool.js               # Concurrency-limited async pool utility
    ├── cwGateway.js          # Paginated CloudWatch discovery + event fetch (own client)
    ├── categorize.js         # Keyword/regex first-pass categorization rule table
    ├── severity.js           # Deterministic severity rules
    ├── dedupe.js             # Signature normalization + grouping
    ├── specialists.js        # Pure functions: one per category family
    ├── recurrence.js         # Statistical recurrence detection (CV ≤ 0.5)
    ├── correlation.js        # Deterministic OBSERVED/INFERRED rules
    ├── cloudwatchLinks.js    # Deep-link URL builder (double-encoding)
    ├── narrative.js          # Two icaChat calls: root cause + executive summary
    ├── worker.js             # One log-group worker
    └── reportRunner.js       # Top-level pipeline orchestration
```

### pool.js
**Exports:**
- `runPool(items, concurrency, worker)` → Promise resolving to `{status:'fulfilled'|'rejected', value|reason}[]` (allSettled-compatible)
- `withTimeout(fn, ms)` → Promise resolving to `{timedOut: boolean, value?, error?}`

**Key points:**
- Shared cursor across all lanes; each lane processes next available item independently
- No worker failure crashes others (failure isolation)
- `withTimeout` accepts a function taking `AbortSignal`, allows actual cancellation of in-flight AWS calls, not just ignoring results

### cwGateway.js
**Exports:**
- `MAX_EVENTS_PER_GROUP = 500` (constant)
- `discoverAllLogGroups({env, prefix?, signal?})` → `{logGroups: {name, arn, storedBytes}[], truncated: boolean, region: string}`
  - Fully paginated; caps at **10 pages × 50/page = 500 log groups**
  - Reports `truncated: true` if more exist beyond the cap
- `fetchBoundedEvents({env, logGroupName, startTime, endTime, signal?})` → `{events: {logStreamName, timestamp, message, eventId}[], truncated: boolean, pagesFetched: number}`
  - Fully paginated; caps at **5 pages × 100 events/page = 500 events per group**
  - Reports `truncated: true` if more exist
  - Uses `getLogsClientForEnv(env)` directly (NOT `cloudwatch.service.js`'s singleton)
  - Accepts optional AbortSignal for cancellation

**Why not extend `cloudwatch.service.js`:** That file's every function reads a module-level `contextClient` singleton set by `setClientForEnv`. For N concurrent workers with different envs, using that singleton would race the state. `cwGateway.js` gets its own client per call (`getLogsClientForEnv(env)` is fresh, safe), avoiding the hazard entirely.

### categorize.js
**Exports:**
- `categorizeEvent(message)` → `{category: string, confidence: 'high'|'medium'} | null`
  - Returns null if message shows no problem signal (dropped, never counted)
  - Priority-ordered rules; first match wins (a message never gets two categories)

**Rule table (check in this order):**
```
timeout (high): /\btask timed out after\b/i, /\brequest timed out\b/i, /\bgateway timeout\b/i, /\bETIMEDOUT\b/, /\b504 gateway timeout\b/i, /\bconnect timed out\b/i
timeout (med):  /\btimeout\b/i, /\btimed out\b/i

access_denied (high): /\bAccessDeniedException\b/, /\bUnauthorizedException\b/, /\bnot authorized to perform\b/i, /\b403 Forbidden\b/i
access_denied (med):  /\baccess denied\b/i, /\bunauthorized\b/i

throttling (high): /\bThrottlingException\b/, /\bTooManyRequestsException\b/, /\bRate exceeded\b/i
throttling (med):  /\bthrottl(ed|ing)\b/i, /\b429\b/

resource_not_found (high): /\bResourceNotFoundException\b/, /\bNoSuchKey\b/, /\bNoSuchBucket\b/
resource_not_found (med):  /\b404 not found\b/i, /\bresource not found\b/i

memory (high): /\bOutOfMemoryError\b/, /\bOOMKilled\b/, /\bJavaScript heap out of memory\b/i, /\bcannot allocate memory\b/i
memory (med):  /\bmemory limit exceeded\b/i, /\bout of memory\b/i

runtime (high): /\bcontainer stopped unexpectedly\b/i, /\bprocess exited\b/i, /\bsegmentation fault\b/i, /\bENOSPC\b/, /\bdisk full\b/i
runtime (med):  /\bcontainer restart(ed)?\b/i, /\binitialization failure\b/i, /\bcold[- ]start\b.*\bfail/i, /\bpanic:/i, /\bruntime failure\b/i

network (high): /\bECONNREFUSED\b/, /\bECONNRESET\b/, /\bENETUNREACH\b/, /\bEAI_AGAIN\b/, /\bcertificate verify failed\b/i
network (med):  /\bconnection refused\b/i, /\bconnection reset\b/i, /\bdns (lookup|resolution) failed\b/i, /\bssl\/tls\b/i

database (high): /\bPrismaClientKnownRequestError\b/, /\bSequelizeConnectionError\b/, /\bdeadlock detected\b/i
database (med):  /\b(sql|database|db) (connection|query) (failed|timed out|error)\b/i, /\btoo many connections\b/i

connection (med): /\bconnection pool exhausted\b/i, /\bsocket hang up\b/i, /\bconnection closed unexpectedly\b/i

dependency (med): /\bfailed to fetch\b/i, /\bdownstream (service|api) (error|failed)\b/i, /\b5\d\d from\b/i, /\b(SQS|SNS|S3|Redis|circuit breaker)\b.*\b(fail|error|refused|open|tripped)\b/i

invocation (med): /\bfailed invocation\b/i, /\bdead[- ]?letter queue\b/i, /\bDLQ\b/, /\bretry exhaust/i, /\bmax retries exceeded\b/i, /\bmessage processing failed\b/i, /\bduplicate (message|processing)\b/i

exception (high): /\bUnhandledPromiseRejection\b/, /\bTraceback \(most recent call last\)/i, /\bFATAL\b/
exception (med):  /\bException\b/, /\bstack ?trace:/i, /\bcrash(ed)?\b/i, /\bError:\s/

application (med): /\bERROR\b/, /\bfailed to\b/i

fallback: If /\b(error|fatal|critical|failed|failure|exception)\b/i matches → category: 'other', confidence: 'low'
otherwise: null (dropped)
```

### severity.js
**Exports:**
- `computeSeverity({category: string, count: number, affectedLogGroupsCount?: number})` → `'critical'|'high'|'medium'|'low'|'info'`

**Rules (checked in order; first match wins):**
```
critical if:
  - (memory|runtime) && count >= 3
  - affectedLogGroupsCount >= 3 && count >= 10
  - count >= 20

high if:
  - (timeout|connection|dependency|database|network) && count >= 5
  - count >= 10
  - (access_denied|throttling|resource_not_found|invocation) && count >= 3

medium if:
  - count >= 3

low if:
  - count >= 1

info otherwise
```

### dedupe.js
**Exports:**
- `normalizeMessage(message)` → normalized string (300 char limit, UUIDs/timestamps/hex/numbers collapsed to placeholders, lowercased, whitespace trimmed)
- `findingSignature({category, logGroupName, normalizedMessage})` → signature string
- `groupBySignature(events)` → `Map<signature, {events: array}>`

**Key:** A Finding's scope is always ONE log group (dedup key includes `logGroupName`, so a failure never spans groups in a single Finding).

### specialists.js
**Exports:**
- `SPECIALISTS: Record<category, (events) => LogFinding[]>` — one function per category

**Each specialist:**
1. Groups events by `findingSignature`
2. For each group:
   - Dedup within the group
   - Compute: count, firstSeen, lastSeen, affected stream count
   - Extract: severity (via `computeSeverity()`), top 5 evidence entries, CloudWatch URL
   - Build LogFinding object with `_allTimestampsMs` (internal only)
3. Return array of LogFindings

**Categories:** timeout, access_denied, throttling, resource_not_found, memory, runtime, network, database, connection, dependency, invocation, exception, application, other

### recurrence.js
**Exports:**
- `computeRecurrence(timestampsMs: number[])` → `{isRecurring: boolean, description: string|null, meanIntervalMs?, coefficientOfVariation?}`

**Logic:**
- If < 3 events: `{isRecurring: false, description: null}`
- Compute intervals between sorted timestamps
- Compute mean, stddev, coefficient of variation (CV = stddev / mean)
- If CV ≤ 0.5 && mean > 0: `isRecurring = true`, describe as "roughly every X seconds" or "roughly every X–Y minutes"
- Otherwise: `isRecurring = false, description: null`

**Justification:** CV ≤ 0.5 means intervals cluster within ±50% of their mean — "roughly regular." Anything looser is refused.

### correlation.js
**Exports:**
- `computeCorrelations(findings: LogFinding[])` → `{id, findingIds: [fid1, fid2], relationship: 'OBSERVED'|'INFERRED', reason}[]`

**Logic:**
- Filter findings to severity >= medium; cap at top 20 by count (bounds O(n²))
- For each pair:
  - If same log group AND time windows overlap or within 5 min: `relationship: 'OBSERVED'`
  - Else if different log groups AND both time windows within 5 min: `relationship: 'INFERRED'`
  - Else: no correlation entry
- Time window: (firstSeen, lastSeen) of each finding

### cloudwatchLinks.js
**Exports:**
- `buildCloudWatchUrl({region: string, logGroupName: string, logStreamName?: string})` → URL string

**URL format:**
```
Without stream:
https://{region}.console.aws.amazon.com/cloudwatch/home?region={region}#logsV2:log-groups/log-group/{double-encoded-group}

With stream:
https://{region}.console.aws.amazon.com/cloudwatch/home?region={region}#logsV2:log-groups/log-group/{double-encoded-group}/log-events/{double-encoded-stream}
```

**Double-encoding:** Each path segment (group/stream name) is `encodeURIComponent` twice. First pass normalizes the characters; second pass re-encodes the `%` signs. This is required for AWS CloudWatch console v2's SPA routing.

**Example:** `/aws/lambda/order-processor` → `%2Faws%2Flambda%2Forder-processor` → `%252Faws%252Flambda%252Forder-processor`

### narrative.js
**Exports:**
- `generateRootCauseNarrative({findings, correlations, kpis})` → Promise<string>
- `generateExecutiveSummary({kpis, findings})` → Promise<string>

**Root cause call:**
- System prompt enforces "Likely cause: / Confidence: high|medium|low / Supporting evidence: ..."
- Input: top 10 findings by count (simplified: id, category, severity, count, logGroupName, timestamps, recurrence only), correlations, kpis
- Max tokens: 400
- Never invents numbers; references only provided JSON

**Executive summary call:**
- System prompt enforces 5-question structure: is anything wrong / biggest issue / where / recurring / investigate first
- Input: kpis, top 1 finding (simplified)
- Max tokens: 250
- Fallback on empty findings: "No confirmed errors detected." / On failure: "Summary unavailable — see findings below."

**Exactly TWO icaChat calls per run** (not per finding, not more). Strict guardrails to prevent hallucination.

### worker.js
**Exports:**
- `WORKER_TIMEOUT_MS = 20_000`
- `runLogGroupWorker(assignment)` → Promise<WorkerResult>

**Worker result shape:**
```typescript
{
  agentId: string,
  agentType: 'log-group-worker',
  reportRunId: string,
  logGroupName: string,
  region: string,
  status: 'QUEUED'|'RUNNING'|'COMPLETED'|'FAILED'|'TIMED_OUT'|'CANCELLED'|'NO_DATA',
  rawEventCount: number,
  truncated: boolean,
  categorizedEvents: [{category, confidence, message, timestamp, logStreamName, eventId}],
  startedAt: ISO string,
  completedAt: ISO string,
  error: string | null
}
```

**Logic:**
1. Call `fetchBoundedEvents` with 20s timeout + AbortSignal
2. If timeout: status='TIMED_OUT'
3. If error: status='FAILED' (this is REPORT-AGENT infrastructure failure, never an application finding)
4. If zero events: status='NO_DATA'
5. Otherwise: categorize each event via `categorizeEvent`, filter nulls, status='COMPLETED'

**Critical:** A worker infrastructure failure (e.g. AccessDeniedException calling CloudWatch API) is NOT an application finding — it's marked as FAILED and reported separately from findings.

### reportRunner.js
**Exports:**
- `WORKER_CONCURRENCY = 5`
- `executeReportRun({runId, env, timeRange})`

**Lifecycle pipeline:**
1. Status: DISCOVERING → Call `discoverAllLogGroups`
2. Status: SPAWNING_WORKERS → Create N worker assignments (1 per log group)
3. Status: ANALYZING → Run pool of workers with concurrency=5
4. Status: AGGREGATING → Pool categorizedEvents from all completed workers, run specialists only for categories with ≥1 event (adaptive orchestration)
5. Compute recurrence for each finding
6. Compute correlations between top findings
7. Status: GENERATING_SUMMARY → Call `generateRootCauseNarrative` and `generateExecutiveSummary` in parallel
8. Build final report with all metadata
9. Determine final status: 'complete' if no workers failed, 'partial' if some succeeded, 'failed' if all failed
10. Save via `store.saveRun`

**KPIs computed deterministically** (never by AI):
- `totalFindings`: count of all findings
- `criticalCount`: count of severity='critical'
- `categoryCounts: Record<category, count>`
- `severityCounts: Record<severity, count>`
- `affectedGroupsCount`: distinct logGroupNames in findings
- `trend: [{bucketLabel, count}]` — hourly buckets for 24h, daily for 7d, computed from timestamps

**Log group analyses** (per-group summary):
- status: 'Healthy'|'Issues'|'Critical'|'No Data'|'Analysis Failed'|'Analyzing' (from worker status, findings)
- findingCount: how many findings in this group
- criticalCount: how many critical
- lastEventTime: latest timestamp from that group's findings

### agent.js
**Exports:**
- `runInvestigation(query: string, history?: array, env?: string)` → Promise<{reply, tool_calls_made, history, orchestration_trace}>

**Note:** Takes optional 3rd param `env` (backward compatible, existing callers ignore). Internally: `const executeTool = makeExecuteTool(env); return runAgent({..., executeTool, ...})`

**System prompt:** Enforce rules:
- Never invent findings/counts/timeouts
- Cite actual tool results only
- If zero findings: "No confirmed errors detected"
- If analysis failed: "Analysis unavailable"

### tools.js
**Exports:**
- `toolDefinitions: array` (standard OpenAI-compatible tool schema)
- `makeExecuteTool(env)` → async function (executeTool)

**Tools:**
1. `start_report_run({time_range: '24h'|'7d'})` → `{runId, status}`
2. `get_report_run_status({run_id})` → run metadata (no findings, just status/counts)
3. `get_latest_report({time_range})` → full run object (findings, kpis, summary) or error
4. `list_log_groups({prefix?})` → `{logGroups: [name, ...], truncated}`

**Env threading:** Tools are generated by `makeExecuteTool(env)` closure, so they have access to env without a parameter.

### store.js
**Exports:**
- `rebuildIndexFromDisk()` → Promise (call once at boot)
- `createReportRun({timeRange, env})` → run object
- `updateRun(runId, patch)` → Promise (writes to disk, updates index)
- `saveRun(runId, patch)` → Promise (final write, cleans up cancel signal)
- `getRun(runId)` → run object | null
- `getLatestRunForRange(timeRange)` → run object | null
- `listRunSummaries({timeRange?, limit?})` → array of summaries
- `requestCancel(runId)` → boolean (true if cancelled, false if not found)

**Run object shape:**
```typescript
{
  id: string,
  env: 'qa'|'prod',
  timeRange: '24h'|'7d',
  status: 'queued'|'discovering'|'spawning_workers'|'analyzing'|'aggregating'|'generating_summary'|'complete'|'partial'|'failed',
  startedAt: ISO string,
  completedAt: ISO string | null,
  logGroupsDiscovered: number,
  workersSpawned: number,
  workersCompleted: number,
  workersFailed: number,
  findingCount: number,
  findings: LogFinding[],
  logGroupAnalyses: LogGroupAnalysis[],
  workers: WorkerResult[],
  correlations: Correlation[],
  kpis: ReportKpis,
  rootCause: string,
  executiveSummary: string,
  error: string | null
}
```

**Persistence:** Files at `backend/src/agents/report-agent/runs/{runId}.json`. Rebuilt from disk on boot (called in `app.js`).

**Why disk-backed:** Dev mode uses `node --watch`, which restarts the whole process on every file save. In-memory store would lose all runs. Disk provides durability for dev+test iteration.

---

## 2. Backend Integration Points

### backend/src/app.js
Add at the top, after imports:
```js
import { rebuildIndexFromDisk } from './agents/report-agent/store.js'
rebuildIndexFromDisk().catch(console.error)
```

Add before `app.listen()`.

### backend/src/routes/index.js
Add import after glueRouter import:
```js
import { reportRouter } from "./report.routes.js";
```

Add mount after glue mount:
```js
apiRouter.use("/report", reportRouter);
```

### backend/src/routes/agent.routes.js
Add after line 16 (after glue):
```js
agentRouter.post('/report/investigate', agentController.investigateReport)
```

### backend/src/controllers/agent.controller.js
Add import after glue import (line 10):
```js
import { runInvestigation as runReportInvestigation } from '../agents/report-agent/agent.js'
```

Add handler after investigateGlue:
```js
export async function investigateReport(req, res) {
  const env = resolveEnv(req)
  const { query, history } = req.body
  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ success: false, error: { message: 'query is required' } })
  }
  const result = await runReportInvestigation(query.trim(), history ?? [], env)
  res.json({ success: true, data: result })
}
```

### backend/src/agents/orchestrator-agent/tools.js
In `AGENT_REGISTRY` (line 9–16), add entry:
```js
report: { name: 'Report Agent', description: 'Runs Log Intelligence — analyzes real CloudWatch Logs across all discovered log groups, categorizes failures, and produces an operational report with evidence and CloudWatch deep links' },
```

Also update the orchestrator's system prompt to add to the agent list:
```
- **report** — Log Intelligence operational reports over real CloudWatch Logs across all log groups (timeouts, exceptions, AWS failures, dependency/runtime issues, with evidence and CloudWatch links)
```

### backend/src/agents/icaClient.js
Update function signature:
```js
export async function icaChat(messages, tools = [], opts = {}) {
  const ICA_KEY = process.env.ICA_API_KEY
  const body = { model: MODEL, max_tokens: opts.max_tokens ?? 1024, messages }
  // ... rest unchanged
}
```

---

## 3. New Backend Routes

### POST /api/report/runs?env=qa|prod
**Body:** `{timeRange: "24h"|"7d"}`  
**Response:** `{success: true, data: {runId: string, status: "queued"}}`  
**Side effect:** Kicks off background `executeReportRun`; run created in queued state, immediately returned.

### GET /api/report/runs?timeRange=24h|7d&limit=20
**Response:** `{success: true, data: {runs: [{id, status, timeRange, startedAt, completedAt, findingCount, workersSpawned, workersCompleted, workersFailed}]}}`

### GET /api/report/runs/:runId
**Response:** Full run object (findings, kpis, workers, correlations, root cause, summary).

### GET /api/report/runs/latest?timeRange=24h|7d
**Response:** Same shape as GET /:runId, or `{success: true, data: {run: null}}` if no runs exist.

### POST /api/report/runs/:runId/cancel
**Response:** `{success: true, data: {runId, status: "cancelled"}}`

### POST /api/agent/report/investigate (existing agent endpoint pattern)
**Body:** `{query: string, history?: array}`  
**Response:** `{success: true, data: {reply, tool_calls_made, history, orchestration_trace}}`

---

## 4. Frontend: `frontend/src/features/log-intelligence/`

### File Structure
```
frontend/src/features/log-intelligence/
├── index.js
├── routes.jsx
├── api/reportApi.js
├── hooks/useStartReportRun.js
│        useReportRun.js
│        useLatestReportRun.js
│        useReportRunsList.js
├── components/
│   ├── Header.jsx
│   ├── TimeRangeToggle.jsx
│   ├── ExecutiveSummary.jsx
│   ├── KpiStrip.jsx
│   ├── ErrorCategoryExplorer.jsx
│   ├── SeverityBreakdown.jsx
│   ├── TrendChart.jsx
│   ├── TopIssuesList.jsx
│   ├── LogGroupTable.jsx
│   ├── FindingDetailDrawer.jsx
│   ├── AgentActivityPanel.jsx
│   ├── FiltersBar.jsx
│   ├── LoadingSkeletons.jsx
│   └── EmptyAndErrorStates.jsx
└── pages/LogIntelligencePage.jsx
```

### api/reportApi.js
Every function: `return apiClient.<verb>(path).then(r => r.data)`

```js
export function startReportRun(timeRange) { /* ... */ }
export function getReportRun(runId) { /* ... */ }
export function getLatestReportRun(timeRange) { /* ... */ }
export function listReportRuns(timeRange, limit = 20) { /* ... */ }
export function cancelReportRun(runId) { /* ... */ }
export function runReportInvestigation(query, history = []) { /* ... */ }
```

### hooks/useReportRun.js — CRITICAL (polling pattern)
```js
export function useReportRun(runId) {
  return useQuery({
    queryKey: ['report', 'run', activeEnvKey, runId],
    queryFn: () => getReportRun(runId),
    enabled: !!runId,
    refetchInterval: (query) => 
      ['complete','partial','failed'].includes(query.state.data?.status) 
        ? false 
        : 3000
  })
}
```

**Key:** Dynamic refetch interval — stops polling once terminal status reached.

### components/

**Header.jsx:** Title, subtitle, [Refresh] button, agent status line, `children` (time range toggle)

**TimeRangeToggle.jsx:** Two-button segmented control `[24 Hours] [7 Days]`

**ExecutiveSummary.jsx:** `Card` rendering `run.executiveSummary` as one paragraph

**KpiStrip.jsx:** 4 `Card`s: Total Findings, Critical, Timeouts, Affected Groups (from `run.kpis`)

**ErrorCategoryExplorer.jsx:** Clickable category list with counts (from `kpis.categoryCounts`)

**SeverityBreakdown.jsx:** Hand-rolled stacked bar chart: `bg-destructive|amber-500|chart-1|muted-foreground` per severity, width % from filtered findings

**TrendChart.jsx:** Hand-rolled bar chart (hourly for 24h, daily for 7d) from `run.kpis.trend`

**TopIssuesList.jsx:** Ranked list `01/02/03...`, each row: title, log group, count, severity badge, [Open] button linking `finding.cloudWatchUrl`

**LogGroupTable.jsx:** shadcn Table, columns: Log Group, Status, Findings, Critical, Last Event

**FindingDetailDrawer.jsx:** shadcn Sheet (side=right), showing finding category/count/evidence/recurrence/CloudWatch link per evidence entry

**AgentActivityPanel.jsx:** Real agent activity (discovered N log groups, spawned N workers, N/M completed, N findings aggregated, worker status list `✓/●/✗/⏱/–`). Progress bar while running.

**FiltersBar.jsx:** Input (search) + dropdowns for category/severity filters

**LoadingSkeletons.jsx:** Export `ReportSkeleton` (shadcn Skeleton blocks matching page layout)

**EmptyAndErrorStates.jsx:** Export `NoDataState` (success-styled, "No confirmed errors"), `AnalysisFailedState` (red Alert + Retry button)

### pages/LogIntelligencePage.jsx
Assembly point: state (timeRange, activeRunId, selectedFinding, filters), hooks (useStartReportRun, useReportRun, useLatestReportRun), conditional rendering (loading/running/complete/failed), filters + search, drawer for finding details.

### routes.jsx / index.js
```jsx
export const logIntelligenceRoutes = [
  { path: 'log-intelligence', element: <LogIntelligencePage /> },
]
```

### Frontend Integration Points

#### frontend/src/app/router.jsx
Add import after glueRoutes:
```js
import { logIntelligenceRoutes } from "@/features/log-intelligence";
```

Add spread after glueRoutes in children array:
```js
...logIntelligenceRoutes,
```

#### frontend/src/constants/nav.js
Add to NAV_MODULES array after glue entry:
```js
{ id: "log-intelligence", label: "Log Intelligence", href: "/log-intelligence", enabled: true },
```

#### frontend/src/components/layout/Sidebar.jsx
Add to lucide imports:
```js
import { ... ScrollText } from 'lucide-react'
```

Add to SERVICE_ICONS map:
```js
'log-intelligence': ScrollText,
```

#### frontend/src/components/ui/progress.jsx (NEW — hand-rolled)
```jsx
export function Progress({ value, max = 100, className = '' }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className={`h-1.5 w-full rounded-full bg-muted overflow-hidden ${className}`}>
      <div className="h-full bg-primary transition-all duration-300" style={{ width: `${pct}%` }} />
    </div>
  )
}
```

---

## 5. Numeric Parameters

| Parameter | Value | Justification |
|-----------|-------|---|
| Worker concurrency | 5 | Fast enough (20 groups = ~4 batches), safe for API throttling |
| Per-worker timeout | 20,000 ms | Covers 5 paginated calls + jitter, short enough to not stall |
| Max events per group | 500 | Enough to detect patterns (recurrence needs ≥3), bounded payload |
| Max log groups | 500 | Generous, realistic cap on account size |
| Evidence per finding | 5 (most recent) | Substantiates pattern, not bloated |
| Correlation window | 5 minutes | Tight enough for causality, loose enough for cascades |
| Recurrence CV threshold | ≤ 0.5 | "Roughly regular" — stddev ≤ 50% of mean |

---

## 6. Definition-of-Done Tests

1. ✅ Sidebar entry "Log Intelligence" appears, navigates to route
2. ✅ `POST /api/report/runs` returns runId immediately, file created on disk
3. ✅ `workersSpawned` equals actual account's log-group count (no hardcoding)
4. ✅ Status transitions: queued → discovering → ... → complete (or partial/failed)
5. ✅ 24h and 7d independent runs coexist
6. ✅ Every finding's evidence message appears in real CloudWatch for that group/time
7. ✅ Zero-error group shows `status: Healthy`, UI shows "No confirmed errors detected"
8. ✅ Analysis failure (e.g. AccessDenied) shows `status: Analysis Failed`, not fake zero
9. ✅ One worker failure → run status partial, other groups' findings remain
10. ✅ Evidence entries link directly to CloudWatch (double-encoded URL works)
11. ✅ Many identical errors → one finding with count + affected streams, no spam
12. ✅ Recurrence only when timestamps are actually regular
13. ✅ Correlations labeled OBSERVED/INFERRED, narrative uses "Likely cause:/Confidence:" phrasing
14. ✅ Every number in executive summary/root cause comes from provided JSON context
15. ✅ Filtering by category/search updates immediately
16. ✅ Agent Center unchanged (6-agent canvas still works)
17. ✅ CloudWatch console page unchanged
18. ✅ Conversational agent can start/check/list reports without fabricating
19. ✅ Orchestrator can delegate to Report Agent via loopback
20. ✅ Dark mode: page uses semantic tokens (no hardcoded hex)

---

## Files to Create/Modify

### NEW Files (Backend)
- `backend/src/agents/report-agent/agent.js`
- `backend/src/agents/report-agent/tools.js`
- `backend/src/agents/report-agent/knowledge.md` (empty)
- `backend/src/agents/report-agent/store.js`
- `backend/src/agents/report-agent/engine/*.js` (11 files: pool.js, cwGateway.js, categorize.js, severity.js, dedupe.js, specialists.js, recurrence.js, correlation.js, cloudwatchLinks.js, narrative.js, worker.js, reportRunner.js)
- `backend/src/routes/report.routes.js`
- `backend/src/controllers/report.controller.js`

### MODIFY Files (Backend)
- `backend/src/app.js` (add rebuildIndexFromDisk call)
- `backend/src/routes/index.js` (add import + mount)
- `backend/src/routes/agent.routes.js` (add route)
- `backend/src/controllers/agent.controller.js` (add import + handler)
- `backend/src/agents/orchestrator-agent/tools.js` (add to AGENT_REGISTRY + prompt)
- `backend/src/agents/icaClient.js` (extend signature for max_tokens override)

### NEW Files (Frontend)
- `frontend/src/features/log-intelligence/index.js`
- `frontend/src/features/log-intelligence/routes.jsx`
- `frontend/src/features/log-intelligence/api/reportApi.js`
- `frontend/src/features/log-intelligence/hooks/useStartReportRun.js`
- `frontend/src/features/log-intelligence/hooks/useReportRun.js`
- `frontend/src/features/log-intelligence/hooks/useLatestReportRun.js`
- `frontend/src/features/log-intelligence/hooks/useReportRunsList.js`
- `frontend/src/features/log-intelligence/components/*.jsx` (14 component files)
- `frontend/src/features/log-intelligence/pages/LogIntelligencePage.jsx`
- `frontend/src/components/ui/progress.jsx`

### MODIFY Files (Frontend)
- `frontend/src/app/router.jsx` (add import + spread)
- `frontend/src/constants/nav.js` (add nav entry)
- `frontend/src/components/layout/Sidebar.jsx` (add icon + map entry)

---

## Implementation Order (Sequential)

1. Backend services: engine files (pool, cwGateway, categorize, severity, dedupe, specialists, recurrence, correlation, cloudwatchLinks, narrative, worker, reportRunner)
2. Backend store + agent (store.js, agent.js, tools.js)
3. Backend routes/controllers (report.routes.js, report.controller.js + integrations)
4. Backend orchestrator additions (AGENT_REGISTRY, icaChat)
5. Frontend components (all 14 + LoadingSkeletons + EmptyAndErrorStates)
6. Frontend hooks (4 hooks)
7. Frontend api + routes
8. Frontend page + integrations
9. Frontend nav + router + icon

---

## Key Design Choices (Explicit, not Options)

- **Dedup by (logGroupName, category, normalizedMessage)** — one Finding per group/category/normalized-signature combo
- **Adaptive specialists** — only run a specialist if ≥1 event exists for that category (saves work)
- **Cross-cutting categorization** — workers do cheap regex tagging; specialists do expensive dedup/severity/evidence client-side after pooling (avoids 500× redundant dedup)
- **Own CloudWatch client in engine/** — bypasses `cloudwatch.service.js` singleton hazard entirely
- **Disk-backed run store** — required for dev mode (`--watch` restarts process)
- **Own Agent Activity panel** — can't use 6-agent hardcoded canvas for arbitrary N workers
- **Two icaChat calls max** — strict guardrails (root cause + executive summary only)
- **Double-encoded CloudWatch URLs** — AWS console v2 SPA routing requirement
- **No new dependencies** — hand-roll Progress (simple div), trend chart (simple divs), no recharts/date-fns

---

**END OF PLAN**
