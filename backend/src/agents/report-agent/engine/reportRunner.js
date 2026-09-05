/**
 * Top-level report pipeline orchestration.
 *
 * Phase 1 — Log Collectors: one per log group, error-filtered and time-sliced.
 * Phase 2 — Specialist Agents: three families, then correlation, then synthesis.
 *
 * The pipeline is deterministic end to end: given the same log events it
 * produces the same findings, the same ids, the same ordering, the same
 * severities and the same numbers in the narrative. Only two sentences of prose
 * come from the model, at temperature 0. Everything that varies between runs
 * now has to come from the logs actually changing — or is reported as a
 * coverage caveat rather than silently reshaping the report.
 *
 * Lifecycle:
 *   queued → discovering → collecting → spawning_specialists → analyzing
 *   → correlating → generating_summary → complete | partial | failed
 */

import { randomUUID } from 'crypto'
import { discoverAllLogGroups } from './cwGateway.js'
import { runPool, withTimeout } from './pool.js'
import { runLogGroupWorker } from './worker.js'
import { SPECIALIST_FAMILIES, CATEGORY_TO_SPECIALIST, analyzeFamily } from './specialists.js'
import { computeCorrelations } from './correlation.js'
import { generateRootCauseNarrative, generateExecutiveSummary, rankFindings } from './narrative.js'
import { updateRun, saveRun } from '../store.js'

// Kept modest on purpose: CloudWatch Logs' FilterLogEvents quota is low per
// account, and higher concurrency here throttles a random subset of log groups
// on every run (see cwGateway.js's retry for the other half of this fix).
export const WORKER_CONCURRENCY = 5
export const DISCOVERY_TIMEOUT_MS = 30_000

const PIPELINE_AGENTS = [
  { type: 'correlation-agent', name: 'Correlation Agent' },
  { type: 'synthesis-agent', name: 'Report Synthesis Agent' },
]

const SPECIALIST_NAMES = {
  ...Object.fromEntries(SPECIALIST_FAMILIES.map((f) => [f.type, f.name])),
  ...Object.fromEntries(PIPELINE_AGENTS.map((a) => [a.type, a.name])),
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
  return { startTime: now - hours * 60 * 60 * 1000, endTime: now, windowHours: hours }
}

function computeTrendBuckets(findings, timeRange) {
  const { startTime, endTime } = getTimeWindow(timeRange)
  const is24h = timeRange === '24h'
  const bucketMs = is24h ? 3_600_000 : 86_400_000
  const bucketCount = is24h ? 24 : 7
  const buckets = Array.from({ length: bucketCount }, (_, i) => {
    const bs = startTime + i * bucketMs
    const d = new Date(bs)
    return {
      bucketLabel: is24h
        ? d.toISOString().slice(11, 16)
        : `${d.toLocaleString('en', { month: 'short', timeZone: 'UTC' })} ${d.getUTCDate()}`,
      count: 0,
      bucketStart: bs,
      bucketEnd: bs + bucketMs,
    }
  })
  for (const f of findings) {
    for (const ts of f._allTimestampsMs ?? []) {
      if (ts < startTime || ts > endTime) continue
      const idx = Math.min(bucketCount - 1, Math.floor((ts - startTime) / bucketMs))
      buckets[idx].count++
    }
  }
  return buckets.map(({ bucketLabel, count }) => ({ bucketLabel, count }))
}

function buildLogGroupAnalyses(logGroups, collectorResults, findings) {
  const byGroup = new Map()
  for (const f of findings) {
    if (!byGroup.has(f.logGroupName)) byGroup.set(f.logGroupName, [])
    byGroup.get(f.logGroupName).push(f)
  }

  return logGroups.map((lg) => {
    const worker = collectorResults.find((w) => w.logGroupName === lg.name)
    const groupFindings = byGroup.get(lg.name) ?? []
    const criticalCount = groupFindings.filter((f) => f.severity === 'critical').length
    const lastEventTime = groupFindings.length
      ? groupFindings.reduce((max, f) => (f.lastSeen > max ? f.lastSeen : max), groupFindings[0].lastSeen)
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

    return {
      logGroupName: lg.name,
      status,
      findingCount: groupFindings.length,
      criticalCount,
      lastEventTime,
      truncated: worker?.truncated ?? false,
      // Explains a "Healthy" verdict on a group that was clearly busy.
      candidateEvents: worker?.rawEventCount ?? 0,
      suppressedEvents: worker?.suppressedCount ?? 0,
    }
  })
}

export async function executeReportRun({ runId, env, timeRange }) {
  try {
    // ── Phase 1: Discover log groups ─────────────────────────────────────────
    await updateRun(runId, { status: 'discovering' })
    const discovery = await withTimeout((signal) => discoverAllLogGroups({ env, signal }), DISCOVERY_TIMEOUT_MS)
    if (discovery.timedOut) {
      throw new Error(
        `Log group discovery timed out after ${DISCOVERY_TIMEOUT_MS / 1000}s — check AWS connectivity/credentials for the CloudWatch profile.`,
      )
    }
    if (discovery.error) throw discovery.error
    const { logGroups, region } = discovery.value
    await updateRun(runId, { status: 'collecting', logGroupsDiscovered: logGroups.length })

    const { startTime, endTime, windowHours } = getTimeWindow(timeRange)

    if (!logGroups.length) {
      await saveRun(runId, {
        status: 'complete',
        completedAt: new Date().toISOString(),
        workersSpawned: 0,
        workersCompleted: 0,
        workersFailed: 0,
        findings: [],
        logGroupAnalyses: [],
        workers: [],
        specialists: [],
        correlations: [],
        kpis: { totalFindings: 0, criticalCount: 0, categoryCounts: {}, severityCounts: {}, affectedGroupsCount: 0, trend: [] },
        coverage: { windowHours, logGroupsScanned: 0, groupsWithCandidates: 0, groupsTruncated: 0, failedCollectors: 0, candidateEvents: 0, suppressedEvents: 0, unclassifiedEvents: 0, classifiedEvents: 0, suppressedByRule: {}, throttledCalls: 0 },
        rootCause: 'Likely cause: No log groups were discovered, so there is nothing to analyse.\nConfidence: high\nSupporting evidence:\n• Log group discovery returned zero groups for this environment.',
        executiveSummary: '• No confirmed errors detected in the selected time range.',
      })
      return
    }

    // ── Phase 1: Run log-group collectors ────────────────────────────────────
    const assignments = logGroups.map((lg) => ({
      reportRunId: runId,
      env,
      logGroupName: lg.name,
      region,
      startTime,
      endTime,
    }))

    await updateRun(runId, { workersSpawned: assignments.length })

    // Local counter, not a store read-modify-write: runPool's lanes each await
    // inside this callback, but the increment itself is synchronous JS, so
    // concurrent lanes can never clobber each other's progress update.
    let doneSoFar = 0
    const poolResults = await runPool(assignments, WORKER_CONCURRENCY, async (assignment) => {
      const result = await runLogGroupWorker(assignment)
      doneSoFar += 1
      await updateRun(runId, { workersCompleted: doneSoFar })
      return result
    })

    const collectorResults = poolResults.map((r, i) =>
      r.status === 'fulfilled'
        ? r.value
        : {
            agentId: randomUUID(),
            agentType: 'log-group-collector',
            reportRunId: runId,
            logGroupName: assignments[i]?.logGroupName ?? '?',
            region,
            status: 'FAILED',
            rawEventCount: 0,
            suppressedCount: 0,
            unclassifiedCount: 0,
            truncated: false,
            categorizedEvents: [],
            startedAt: null,
            completedAt: new Date().toISOString(),
            error: r.reason?.message ?? 'Unknown error',
          },
    )

    // NO_DATA is a legitimate, successfully-analyzed outcome (the group just had
    // no matching events) — it must count as "done", not sit in limbo, or the
    // collector tally visibly undercounts even on a fully successful run.
    const completedCollectors = collectorResults.filter((w) => ['COMPLETED', 'NO_DATA'].includes(w.status))
    const failedCollectors = collectorResults.filter((w) => ['FAILED', 'TIMED_OUT'].includes(w.status))

    await updateRun(runId, {
      workersCompleted: completedCollectors.length,
      workersFailed: failedCollectors.length,
    })

    // ── Coverage accounting — how the report reached its numbers ──────────────
    const suppressedByRule = {}
    for (const w of collectorResults) {
      for (const [rule, n] of Object.entries(w.suppressedByRule ?? {})) {
        suppressedByRule[rule] = (suppressedByRule[rule] ?? 0) + n
      }
    }
    const allCategorized = completedCollectors.flatMap((w) => w.categorizedEvents)
    const coverage = {
      windowHours,
      logGroupsScanned: logGroups.length,
      groupsWithCandidates: collectorResults.filter((w) => (w.rawEventCount ?? 0) > 0).length,
      groupsTruncated: collectorResults.filter((w) => w.truncated).length,
      failedCollectors: failedCollectors.length,
      candidateEvents: collectorResults.reduce((s, w) => s + (w.rawEventCount ?? 0), 0),
      suppressedEvents: collectorResults.reduce((s, w) => s + (w.suppressedCount ?? 0), 0),
      unclassifiedEvents: collectorResults.reduce((s, w) => s + (w.unclassifiedCount ?? 0), 0),
      classifiedEvents: allCategorized.length,
      suppressedByRule,
      throttledCalls: collectorResults.reduce((s, w) => s + (w.throttledCalls ?? 0), 0),
    }

    // ── Phase 2: Specialist agents ───────────────────────────────────────────
    // Three families, spawned only when their categories actually appear.
    const eventsByFamily = new Map()
    for (const e of allCategorized) {
      const family = CATEGORY_TO_SPECIALIST[e.category]
      if (!family) continue
      if (!eventsByFamily.has(family)) eventsByFamily.set(family, [])
      eventsByFamily.get(family).push(e)
    }

    const activeFamilies = SPECIALIST_FAMILIES.filter((f) => (eventsByFamily.get(f.type)?.length ?? 0) > 0)
    const specialistRecords = [
      ...activeFamilies.map((f) => makeSpecialistRecord(f.type)),
      ...PIPELINE_AGENTS.map((a) => makeSpecialistRecord(a.type)),
    ]

    await updateRun(runId, { status: 'spawning_specialists', specialists: specialistRecords })
    await updateRun(runId, { status: 'analyzing' })

    const findings = []
    for (const family of activeFamilies) {
      const rec = specialistRecords.find((s) => s.agentType === family.type)
      rec.status = 'RUNNING'
      rec.startedAt = new Date().toISOString()
      await updateRun(runId, { specialists: specialistRecords })

      const familyFindings = analyzeFamily({
        events: eventsByFamily.get(family.type) ?? [],
        region,
        windowHours,
      })
      findings.push(...familyFindings)

      rec.status = 'COMPLETED'
      rec.completedAt = new Date().toISOString()
      rec.findingsCount = familyFindings.length
      await updateRun(runId, { specialists: specialistRecords })
    }

    // ── Correlation agent ────────────────────────────────────────────────────
    await updateRun(runId, { status: 'correlating' })
    const corrRecord = specialistRecords.find((s) => s.agentType === 'correlation-agent')
    corrRecord.status = 'RUNNING'
    corrRecord.startedAt = new Date().toISOString()
    await updateRun(runId, { specialists: specialistRecords })

    const correlations = computeCorrelations(findings)

    corrRecord.status = 'COMPLETED'
    corrRecord.completedAt = new Date().toISOString()
    corrRecord.findingsCount = correlations.length
    await updateRun(runId, { specialists: specialistRecords })

    // ── KPIs — deterministic ─────────────────────────────────────────────────
    const categoryCounts = {}
    const severityCounts = {}
    for (const f of findings) {
      categoryCounts[f.category] = (categoryCounts[f.category] ?? 0) + 1
      severityCounts[f.severity] = (severityCounts[f.severity] ?? 0) + 1
    }
    const kpis = {
      totalFindings: findings.length,
      criticalCount: severityCounts.critical ?? 0,
      categoryCounts,
      severityCounts,
      affectedGroupsCount: new Set(findings.map((f) => f.logGroupName)).size,
      trend: computeTrendBuckets(findings, timeRange),
      recurringCount: findings.filter((f) => f.isRecurring).length,
    }

    // ── Synthesis agent ──────────────────────────────────────────────────────
    await updateRun(runId, { status: 'generating_summary' })
    const synthRecord = specialistRecords.find((s) => s.agentType === 'synthesis-agent')
    synthRecord.status = 'RUNNING'
    synthRecord.startedAt = new Date().toISOString()
    await updateRun(runId, { specialists: specialistRecords })

    const [rootCause, executiveSummary] = await Promise.all([
      generateRootCauseNarrative({ findings, correlations, kpis, coverage }),
      generateExecutiveSummary({ kpis, findings, coverage }),
    ])

    synthRecord.status = 'COMPLETED'
    synthRecord.completedAt = new Date().toISOString()
    synthRecord.findingsCount = findings.length
    await updateRun(runId, { specialists: specialistRecords })

    // ── Build final artefacts ────────────────────────────────────────────────
    const logGroupAnalyses = buildLogGroupAnalyses(logGroups, collectorResults, findings)

    // Ranked once, here, so the table order matches the narrative's ranking and
    // is identical between runs over identical data.
    const persistableFindings = rankFindings(findings).map(({ _allTimestampsMs, ...f }) => f)

    // Raw messages are dropped before persisting. Keeping every collected event
    // inflated stored runs to 5 MB each, and updateRun rewrites the file on
    // every progress tick — the report only ever displays the 5 evidence
    // samples already embedded in each finding.
    const persistableWorkers = collectorResults.map(({ categorizedEvents, ...w }) => ({
      ...w,
      classifiedCount: categorizedEvents?.length ?? 0,
    }))

    let finalStatus = 'complete'
    if (completedCollectors.length === 0) finalStatus = 'failed'
    else if (failedCollectors.length > 0) finalStatus = 'partial'

    await saveRun(runId, {
      status: finalStatus,
      completedAt: new Date().toISOString(),
      findingCount: persistableFindings.length,
      findings: persistableFindings,
      logGroupAnalyses,
      workers: persistableWorkers,
      specialists: specialistRecords,
      correlations,
      kpis,
      coverage,
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
