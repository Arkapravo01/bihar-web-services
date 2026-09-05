/**
 * Per-log-group collector.
 *
 * Pipeline per event: noise suppression → classification. Both stages count
 * what they drop, so a report can state how it reached its numbers instead of
 * presenting a filtered view as the whole truth.
 *
 * Infrastructure failures (AccessDenied, network errors) → status FAILED.
 * These are NOT application findings — they are report pipeline failures, and
 * they make the run "partial" so a shrunken report is never mistaken for a
 * healthy one.
 */

import { randomUUID } from 'crypto'
import { fetchBoundedEvents } from './cwGateway.js'
import { categorizeEvent } from './categorize.js'
import { classifyNoise } from './noise.js'
import { withTimeout } from './pool.js'

// Covers the sliced fetch: up to ~7 slices, each up to 3 pages, plus retries.
export const WORKER_TIMEOUT_MS = 60_000

export async function runLogGroupWorker({ reportRunId, env, logGroupName, region, startTime, endTime }) {
  const agentId = randomUUID()
  const startedAt = new Date().toISOString()

  const base = {
    agentId,
    agentType: 'log-group-collector',
    reportRunId,
    logGroupName,
    region,
    startedAt,
    completedAt: null,
    rawEventCount: 0,
    suppressedCount: 0,
    unclassifiedCount: 0,
    suppressedByRule: {},
    truncated: false,
    cappedSlices: 0,
    throttledCalls: 0,
    categorizedEvents: [],
    error: null,
  }

  const result = await withTimeout(
    (signal) => fetchBoundedEvents({ env, logGroupName, startTime, endTime, signal }),
    WORKER_TIMEOUT_MS,
  )

  const completedAt = new Date().toISOString()

  if (result.timedOut) {
    return { ...base, status: 'TIMED_OUT', completedAt, error: `Collector timed out after ${WORKER_TIMEOUT_MS / 1000}s` }
  }
  if (result.error) {
    return { ...base, status: 'FAILED', completedAt, error: result.error.message ?? String(result.error) }
  }

  const { events, truncated, cappedSlices, throttledCalls, filterDegraded } = result.value

  if (!events.length) {
    return { ...base, status: 'NO_DATA', completedAt, throttledCalls, rawEventCount: 0 }
  }

  const categorizedEvents = []
  const suppressedByRule = {}
  let suppressedCount = 0
  let unclassifiedCount = 0

  for (const e of events) {
    const noise = classifyNoise(e.message)
    if (noise.suppressed) {
      suppressedCount++
      suppressedByRule[noise.rule] = (suppressedByRule[noise.rule] ?? 0) + 1
      continue
    }
    const cat = categorizeEvent(e.message)
    if (!cat) {
      unclassifiedCount++
      continue
    }
    categorizedEvents.push({
      category: cat.category,
      confidence: cat.confidence,
      message: e.message,
      timestamp: e.timestamp,
      logStreamName: e.logStreamName,
      eventId: e.eventId,
      logGroupName,
    })
  }

  return {
    ...base,
    status: 'COMPLETED',
    completedAt,
    rawEventCount: events.length,
    suppressedCount,
    unclassifiedCount,
    suppressedByRule,
    truncated,
    cappedSlices,
    throttledCalls,
    filterDegraded: Boolean(filterDegraded),
    categorizedEvents,
  }
}
