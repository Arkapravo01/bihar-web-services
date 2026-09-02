import {
  createReportRun,
  getRun as storeGetRun,
  getLatestRunForRange,
  listRunSummaries,
  requestCancel,
} from '../agents/report-agent/store.js'
import { executeReportRun } from '../agents/report-agent/engine/reportRunner.js'

function resolveEnv(req) {
  const env = req.query.env || 'qa'
  return env === 'prod' ? 'prod' : 'qa'
}

export async function startRun(req, res) {
  const env = resolveEnv(req)
  const { timeRange } = req.body
  if (!timeRange || !['24h', '7d'].includes(timeRange)) {
    return res.status(400).json({ success: false, error: { message: 'timeRange must be "24h" or "7d"' } })
  }
  const run = createReportRun({ timeRange, env })
  // Fire and forget
  executeReportRun({ runId: run.id, env, timeRange }).catch(err =>
    console.error(`[report.controller] run ${run.id} error:`, err)
  )
  res.json({ success: true, data: { runId: run.id, status: run.status } })
}

export function getRun(req, res) {
  const run = storeGetRun(req.params.runId)
  if (!run) return res.status(404).json({ success: false, error: { message: 'Run not found' } })
  res.json({ success: true, data: { run } })
}

export function getLatestRun(req, res) {
  const { timeRange } = req.query
  if (!timeRange || !['24h', '7d'].includes(timeRange)) {
    return res.status(400).json({ success: false, error: { message: 'timeRange must be "24h" or "7d"' } })
  }
  const run = getLatestRunForRange(timeRange)
  res.json({ success: true, data: { run: run ?? null } })
}

export function listRuns(req, res) {
  const { timeRange, limit } = req.query
  const runs = listRunSummaries({ timeRange, limit: limit ? parseInt(limit, 10) : 20 })
  res.json({ success: true, data: { runs } })
}

export function cancelRun(req, res) {
  const cancelled = requestCancel(req.params.runId)
  if (!cancelled) return res.status(404).json({ success: false, error: { message: 'Run not found' } })
  res.json({ success: true, data: { runId: req.params.runId, status: 'cancelled' } })
}
