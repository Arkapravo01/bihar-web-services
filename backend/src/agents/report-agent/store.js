/**
 * Report Run store — disk-backed persistence with in-memory index.
 * Disk-backed because dev mode uses node --watch which restarts the process.
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const RUNS_DIR = path.join(__dirname, 'runs')

// In-memory index: runId → run object
const index = new Map()

async function ensureRunsDir() {
  await fs.mkdir(RUNS_DIR, { recursive: true })
}

function runFilePath(runId) {
  return path.join(RUNS_DIR, `${runId}.json`)
}

const TERMINAL_STATUSES = ['complete', 'partial', 'failed']

export async function rebuildIndexFromDisk() {
  await ensureRunsDir()
  let files
  try { files = await fs.readdir(RUNS_DIR) } catch { return }
  for (const file of files) {
    if (!file.endsWith('.json')) continue
    try {
      const raw = await fs.readFile(path.join(RUNS_DIR, file), 'utf8')
      const run = JSON.parse(raw)
      if (!run?.id) continue
      // Any run that was not in a terminal state when the server last saved it
      // means the process was killed mid-run. Mark it failed so the UI unblocks.
      if (!TERMINAL_STATUSES.includes(run.status)) {
        run.status = 'failed'
        run.completedAt = run.completedAt ?? new Date().toISOString()
        run.error = 'Run was interrupted by a server restart before it could finish. Start a new analysis.'
        await fs.writeFile(path.join(RUNS_DIR, file), JSON.stringify(run, null, 2), 'utf8')
      }
      index.set(run.id, run)
    } catch { /* skip corrupt files */ }
  }
  console.log(`[report-store] rebuilt index from disk: ${index.size} runs`)
}

export function createReportRun({ timeRange, env }) {
  const run = {
    id: randomUUID(),
    env,
    timeRange,
    status: 'queued',
    startedAt: new Date().toISOString(),
    completedAt: null,
    logGroupsDiscovered: 0,
    workersSpawned: 0,
    workersCompleted: 0,
    workersFailed: 0,
    findingCount: 0,
    findings: [],
    logGroupAnalyses: [],
    workers: [],       // Phase 1: log-group collectors
    specialists: [],   // Phase 2: named specialist agents
    correlations: [],
    kpis: null,
    rootCause: null,
    executiveSummary: null,
    error: null,
  }
  index.set(run.id, run)
  return run
}

export async function updateRun(runId, patch) {
  const run = index.get(runId)
  if (!run) return
  Object.assign(run, patch)
  index.set(runId, run)
  await ensureRunsDir()
  await fs.writeFile(runFilePath(runId), JSON.stringify(run, null, 2), 'utf8')
}

export async function saveRun(runId, patch) {
  await updateRun(runId, patch)
}

export function getRun(runId) {
  return index.get(runId) ?? null
}

export function getLatestRunForRange(timeRange) {
  let latest = null
  for (const run of index.values()) {
    if (run.timeRange !== timeRange) continue
    if (!latest || run.startedAt > latest.startedAt) latest = run
  }
  return latest
}

export function listRunSummaries({ timeRange, limit = 20 } = {}) {
  let runs = [...index.values()]
  if (timeRange) runs = runs.filter(r => r.timeRange === timeRange)
  runs.sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  return runs.slice(0, limit).map(r => ({
    id: r.id,
    status: r.status,
    timeRange: r.timeRange,
    env: r.env,
    startedAt: r.startedAt,
    completedAt: r.completedAt,
    findingCount: r.findingCount,
    workersSpawned: r.workersSpawned,
    workersCompleted: r.workersCompleted,
    workersFailed: r.workersFailed,
    specialistsCount: r.specialists?.length ?? 0,
  }))
}

export function requestCancel(runId) {
  const run = index.get(runId)
  if (!run) return false
  run._cancelRequested = true
  return true
}
