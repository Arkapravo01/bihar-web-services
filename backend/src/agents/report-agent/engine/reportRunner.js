/**
 * Top-level report pipeline orchestration.
 *
 * Two-phase architecture per the runtime subagents spec:
 *   Phase 1 — Log Collectors: one per log group (internal, not in specialists[])
 *   Phase 2 — Named Specialist Agents: spawned adaptively for categories found
 *
 * Named specialists (max ~10):
 *   error-analysis, timeout-analysis, aws-failure-analysis, dependency-analysis,
 *   runtime-analysis, invocation-analysis, pattern-analysis,
 *   correlation-agent, root-cause-agent, synthesis-agent
 *
 * Lifecycle:
 *   queued → discovering → collecting → spawning_specialists → analyzing
 *   → correlating → generating_summary → complete | partial | failed
 */

import { randomUUID } from 'crypto'
import { discoverAllLogGroups } from './cwGateway.js'
import { runPool } from './pool.js'
import { runLogGroupWorker } from './worker.js'
import { SPECIALISTS } from './specialists.js'
import { computeRecurrence } from './recurrence.js'
import { computeCorrelations } from './correlation.js'
import { generateRootCauseNarrative, generateExecutiveSummary } from './narrative.js'
import { updateRun, saveRun } from '../store.js'

export const WORKER_CONCURRENCY = 10

// Map from category → which named specialist handles it
const CATEGORY_TO_SPECIALIST = {
  timeout:            'timeout-analysis',
  access_denied:      'aws-failure-analysis',
  throttling:         'aws-failure-analysis',
  resource_not_found: 'aws-failure-analysis',
  memory:             'runtime-analysis',
  runtime:            'runtime-analysis',
  network:            'dependency-analysis',
  database:           'dependency-analysis',
  connection:         'dependency-analysis',
  dependency:         'dependency-analysis',
  invocation:         'invocation-analysis',
  exception:          'error-analysis',
  application:        'error-analysis',
  other:              'error-analysis',
}

const SPECIALIST_NAMES = {
  'error-analysis':       'Error Analysis Agent',
  'timeout-analysis':     'Timeout Analysis Agent',
  'aws-failure-analysis': 'AWS Failure Analysis Agent',
  'dependency-analysis':  'Dependency Analysis Agent',
  'runtime-analysis':     'Runtime / Resource Analysis Agent',
  'invocation-analysis':  'Invocation Analysis Agent',
  'pattern-analysis':     'Pattern / Recurrence Agent',
  'correlation-agent':    'Correlation Agent',
  'root-cause-agent':     'Root Cause Analysis Agent',
  'synthesis-agent':      'Report Synthesis Agent',
}

function makeSpecialistRecord(type, status = 'QUEUED') {
  return {
    agentId: randomUUID(),
    agentType: type,
    name: SPECIALIST_NAMES[type] ?? type,
    status,
    findingsCount: 0,
    startedAt: null,
    completedAt: null,
    error: null,
  }
}

function getTimeWindow(timeRange) {
  const now = Date.now()
  const hours = timeRange === '7d' ? 7 * 24 : 24
  return { startTime: now - hours * 60 * 60 * 1000, endTime: now }
}

function computeTrendBuckets(findings, timeRange) {
  const { startTime } = getTimeWindow(timeRange)
  if (timeRange === '24h') {
    const buckets = Array.from({ length: 24 }, (_, i) => {
      const bs = startTime + i * 3600_000
      return { bucketLabel: new Date(bs).toISOString().slice(11, 16), count: 0, bucketStart: bs, bucketEnd: bs + 3600_000 }
    })
    for (const f of findings)
      for (const ts of f._allTimestampsMs ?? []) {
        const b = buckets.find(b => ts >= b.bucketStart && ts < b.bucketEnd)
        if (b) b.count++
      }
    return buckets.map(({ bucketLabel, count }) => ({ bucketLabel, count }))
  } else {
    const buckets = Array.from({ length: 7 }, (_, i) => {
      const bs = startTime + i * 86_400_000
      const d = new Date(bs)
      return { bucketLabel: `${d.toLocaleString('en', { month: 'short' })} ${d.getUTCDate()}`, count: 0, bucketStart: bs, bucketEnd: bs + 86_400_000 }
    })
    for (const f of findings)
      for (const ts of f._allTimestampsMs ?? []) {
        const b = buckets.find(b => ts >= b.bucketStart && ts < b.bucketEnd)
        if (b) b.count++
      }
    return buckets.map(({ bucketLabel, count }) => ({ bucketLabel, count }))
  }
}

function buildLogGroupAnalyses(logGroups, collectorResults, findings) {
  return logGroups.map(lg => {
    const worker = collectorResults.find(w => w.logGroupName === lg.name)
    const groupFindings = findings.filter(f => f.logGroupName === lg.name)
    const criticalCount = groupFindings.filter(f => f.severity === 'critical').length
    const lastEventTime = groupFindings.length
      ? groupFindings.reduce((max, f) => f.lastSeen > max ? f.lastSeen : max, groupFindings[0].lastSeen)
      : null
    let status = 'No Data'
    if (!worker) status = 'No Data'
    else if (worker.status === 'FAILED' || worker.status === 'TIMED_OUT') status = 'Analysis Failed'
    else if (worker.status === 'NO_DATA') status = 'No Data'
    else if (worker.status === 'COMPLETED') {
      if (criticalCount > 0) status = 'Critical'
      else if (groupFindings.length > 0) status = 'Issues'
      else status = 'Healthy'
    }
    return { logGroupName: lg.name, status, findingCount: groupFindings.length, criticalCount, lastEventTime }
  })
}

export async function executeReportRun({ runId, env, timeRange }) {
  try {
    // ── Phase 1: Discover log groups ─────────────────────────────────────────
    await updateRun(runId, { status: 'discovering' })
    const { logGroups, region } = await discoverAllLogGroups({ env })
    await updateRun(runId, { status: 'collecting', logGroupsDiscovered: logGroups.length })

    if (!logGroups.length) {
      await saveRun(runId, {
        status: 'complete',
        completedAt: new Date().toISOString(),
        workersSpawned: 0, workersCompleted: 0, workersFailed: 0,
        findings: [], logGroupAnalyses: [], workers: [], specialists: [],
        correlations: [],
        kpis: { totalFindings: 0, criticalCount: 0, categoryCounts: {}, severityCounts: {}, affectedGroupsCount: 0, trend: [] },
        rootCause: 'No log groups discovered.',
        executiveSummary: '• No confirmed errors detected in the selected time range.',
      })
      return
    }

    // ── Phase 1: Run log-group collectors ─────────────────────────────────────
    const { startTime, endTime } = getTimeWindow(timeRange)
    const assignments = logGroups.map(lg => ({ reportRunId: runId, env, logGroupName: lg.name, region, startTime, endTime }))

    await updateRun(runId, { workersSpawned: assignments.length })

    const poolResults = await runPool(assignments, WORKER_CONCURRENCY, async (assignment, idx) => {
      const result = await runLogGroupWorker(assignment)
      // Update progress as each collector finishes
      const run = (await import('../store.js')).getRun(runId)
      if (run) {
        const completedSoFar = (run.workersCompleted ?? 0) + 1
        await updateRun(runId, { workersCompleted: completedSoFar })
      }
      return result
    })

    const collectorResults = poolResults.map(r => r.status === 'fulfilled' ? r.value : {
      agentId: 'unknown', agentType: 'log-group-collector', reportRunId: runId,
      logGroupName: '?', region, status: 'FAILED', rawEventCount: 0,
      truncated: false, categorizedEvents: [],
      startedAt: null, completedAt: new Date().toISOString(),
      error: r.reason?.message ?? 'Unknown error',
    })

    const completedCollectors = collectorResults.filter(w => w.status === 'COMPLETED')
    const failedCollectors = collectorResults.filter(w => ['FAILED', 'TIMED_OUT'].includes(w.status))

    await updateRun(runId, {
      workersCompleted: completedCollectors.length,
      workersFailed: failedCollectors.length,
    })

    // ── Phase 2: Specialist agents ────────────────────────────────────────────
    // Aggregate all categorized events
    const allCategorized = completedCollectors.flatMap(w => w.categorizedEvents)

    // Determine which category groups have events
    const byCategory = {}
    for (const e of allCategorized) {
      if (!byCategory[e.category]) byCategory[e.category] = []
      byCategory[e.category].push(e)
    }

    // Map categories → specialist type (adaptive: only for categories with ≥1 event)
    const neededSpecialistTypes = new Set(
      Object.keys(byCategory).map(cat => CATEGORY_TO_SPECIALIST[cat]).filter(Boolean)
    )

    // Always add pattern + correlation + root-cause + synthesis
    const pipelineAgents = ['pattern-analysis', 'correlation-agent', 'root-cause-agent', 'synthesis-agent']

    const allSpecialistTypes = [...neededSpecialistTypes, ...pipelineAgents]
    const specialistRecords = allSpecialistTypes.map(t => makeSpecialistRecord(t, 'QUEUED'))

    await updateRun(runId, { status: 'spawning_specialists', specialists: specialistRecords })

    // ── Run category specialist agents ────────────────────────────────────────
    await updateRun(runId, { status: 'analyzing' })

    const findings = []
    for (const specRecord of specialistRecords) {
      if (!neededSpecialistTypes.has(specRecord.agentType)) continue

      specRecord.status = 'RUNNING'
      specRecord.startedAt = new Date().toISOString()
      await updateRun(runId, { specialists: specialistRecords })

      // Gather all categories handled by this specialist
      const handledCategories = Object.entries(CATEGORY_TO_SPECIALIST)
        .filter(([, st]) => st === specRecord.agentType)
        .map(([cat]) => cat)

      const eventsForSpec = handledCategories.flatMap(cat => byCategory[cat] ?? [])
      const specFindings = []
      for (const cat of handledCategories) {
        const catEvents = byCategory[cat] ?? []
        if (catEvents.length && SPECIALISTS[cat]) {
          specFindings.push(...SPECIALISTS[cat](catEvents, region))
        }
      }
      findings.push(...specFindings)

      specRecord.status = 'COMPLETED'
      specRecord.completedAt = new Date().toISOString()
      specRecord.findingsCount = specFindings.length
      await updateRun(runId, { specialists: specialistRecords })
    }

    // ── Pattern / Recurrence agent ────────────────────────────────────────────
    const patternRecord = specialistRecords.find(s => s.agentType === 'pattern-analysis')
    if (patternRecord) {
      patternRecord.status = 'RUNNING'
      patternRecord.startedAt = new Date().toISOString()
      await updateRun(runId, { specialists: specialistRecords })

      for (const f of findings) {
        const rec = computeRecurrence(f._allTimestampsMs ?? [])
        f.isRecurring = rec.isRecurring
        f.recurrenceDescription = rec.description
      }

      patternRecord.status = 'COMPLETED'
      patternRecord.completedAt = new Date().toISOString()
      patternRecord.findingsCount = findings.filter(f => f.isRecurring).length
      await updateRun(runId, { specialists: specialistRecords })
    }

    // ── Correlation agent ─────────────────────────────────────────────────────
    let correlations = []
    const corrRecord = specialistRecords.find(s => s.agentType === 'correlation-agent')
    if (corrRecord) {
      corrRecord.status = 'RUNNING'
      corrRecord.startedAt = new Date().toISOString()
      await updateRun(runId, { specialists: specialistRecords })

      correlations = computeCorrelations(findings)

      corrRecord.status = 'COMPLETED'
      corrRecord.completedAt = new Date().toISOString()
      corrRecord.findingsCount = correlations.length
      await updateRun(runId, { specialists: specialistRecords })
    }

    // ── Compute KPIs deterministically ────────────────────────────────────────
    const categoryCounts = {}
    const severityCounts = {}
    for (const f of findings) {
      categoryCounts[f.category] = (categoryCounts[f.category] ?? 0) + 1
      severityCounts[f.severity] = (severityCounts[f.severity] ?? 0) + 1
    }
    const affectedGroups = new Set(findings.map(f => f.logGroupName))
    const kpis = {
      totalFindings: findings.length,
      criticalCount: severityCounts.critical ?? 0,
      categoryCounts,
      severityCounts,
      affectedGroupsCount: affectedGroups.size,
      trend: computeTrendBuckets(findings, timeRange),
    }

    // ── Root-cause agent ──────────────────────────────────────────────────────
    await updateRun(runId, { status: 'generating_summary' })

    const rcaRecord = specialistRecords.find(s => s.agentType === 'root-cause-agent')
    if (rcaRecord) {
      rcaRecord.status = 'RUNNING'
      rcaRecord.startedAt = new Date().toISOString()
      await updateRun(runId, { specialists: specialistRecords })
    }

    const synthRecord = specialistRecords.find(s => s.agentType === 'synthesis-agent')
    if (synthRecord) {
      synthRecord.status = 'RUNNING'
      synthRecord.startedAt = new Date().toISOString()
      await updateRun(runId, { specialists: specialistRecords })
    }

    const specialistSummary = specialistRecords.map(s => ({
      name: s.name, status: s.status, findingsCount: s.findingsCount,
    }))

    const [rootCause, executiveSummary] = await Promise.all([
      generateRootCauseNarrative({ findings, correlations, kpis }),
      generateExecutiveSummary({ kpis, findings, specialists: specialistSummary }),
    ])

    if (rcaRecord) {
      rcaRecord.status = 'COMPLETED'
      rcaRecord.completedAt = new Date().toISOString()
    }
    if (synthRecord) {
      synthRecord.status = 'COMPLETED'
      synthRecord.completedAt = new Date().toISOString()
    }

    // ── Build final artefacts ─────────────────────────────────────────────────
    const logGroupAnalyses = buildLogGroupAnalyses(logGroups, collectorResults, findings)
    const persistableFindings = findings.map(({ _allTimestampsMs, ...f }) => f)

    let finalStatus = 'complete'
    if (completedCollectors.length === 0) finalStatus = 'failed'
    else if (failedCollectors.length > 0) finalStatus = 'partial'

    await saveRun(runId, {
      status: finalStatus,
      completedAt: new Date().toISOString(),
      findingCount: persistableFindings.length,
      findings: persistableFindings,
      logGroupAnalyses,
      workers: collectorResults,
      specialists: specialistRecords,
      correlations,
      kpis,
      rootCause,
      executiveSummary,
    })
  } catch (err) {
    console.error(`[reportRunner] run ${runId} failed:`, err)
    await saveRun(runId, {
      status: 'failed',
      completedAt: new Date().toISOString(),
      error: err.message ?? String(err),
    }).catch(() => {})
  }
}
