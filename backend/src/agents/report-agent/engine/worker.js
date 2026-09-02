/**
 * Per-log-group worker.
 * Infrastructure failures (AccessDenied, network errors) → status FAILED.
 * These are NOT application findings — they're report pipeline failures.
 */

import { randomUUID } from 'crypto'
import { fetchBoundedEvents } from './cwGateway.js'
import { categorizeEvent } from './categorize.js'
import { withTimeout } from './pool.js'

export const WORKER_TIMEOUT_MS = 20_000

export async function runLogGroupWorker({ reportRunId, env, logGroupName, region, startTime, endTime }) {
  const agentId = randomUUID()
  const startedAt = new Date().toISOString()

  const base = {
    agentId,
    agentType: 'log-group-worker',
    reportRunId,
    logGroupName,
    region,
    startedAt,
    completedAt: null,
    rawEventCount: 0,
    truncated: false,
    categorizedEvents: [],
    error: null,
  }

  const result = await withTimeout(
    (signal) => fetchBoundedEvents({ env, logGroupName, startTime, endTime, signal }),
    WORKER_TIMEOUT_MS
  )

  const completedAt = new Date().toISOString()

  if (result.timedOut) {
    return { ...base, status: 'TIMED_OUT', completedAt, error: 'Worker timed out after 20s' }
  }

  if (result.error) {
    return { ...base, status: 'FAILED', completedAt, error: result.error.message ?? String(result.error) }
  }

  const { events, truncated } = result.value

  if (!events.length) {
    return { ...base, status: 'NO_DATA', completedAt, rawEventCount: 0 }
  }

  const categorizedEvents = []
  for (const e of events) {
    const cat = categorizeEvent(e.message)
    if (cat) {
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
  }

  return {
    ...base,
    status: 'COMPLETED',
    completedAt,
    rawEventCount: events.length,
    truncated,
    categorizedEvents,
  }
}
