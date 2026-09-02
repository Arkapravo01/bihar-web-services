/**
 * Specialist analysis functions — one per category family.
 * Each specialist groups events by signature, deduplicates,
 * computes severity + evidence, and returns LogFinding[].
 */

import { randomUUID } from 'crypto'
import { findingSignature, normalizeMessage, groupBySignature } from './dedupe.js'
import { computeSeverity } from './severity.js'
import { buildCloudWatchUrl } from './cloudwatchLinks.js'

const CATEGORIES = [
  'timeout', 'access_denied', 'throttling', 'resource_not_found',
  'memory', 'runtime', 'network', 'database', 'connection',
  'dependency', 'invocation', 'exception', 'application', 'other',
]

function buildFinding({ category, logGroupName, region, group }) {
  const { events, normalizedMessage } = group
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp)
  const count = sorted.length
  const firstSeen = new Date(sorted[0].timestamp).toISOString()
  const lastSeen = new Date(sorted[sorted.length - 1].timestamp).toISOString()
  const affectedStreams = new Set(sorted.map(e => e.logStreamName).filter(Boolean))
  const severity = computeSeverity({ category, count })
  const evidenceSamples = sorted.slice(-5).map(e => ({
    timestamp: new Date(e.timestamp).toISOString(),
    message: e.message?.slice(0, 500) ?? '',
    logStreamName: e.logStreamName ?? null,
    eventId: e.eventId ?? null,
    cloudWatchUrl: buildCloudWatchUrl({ region, logGroupName, logStreamName: e.logStreamName }),
  }))

  return {
    id: randomUUID(),
    category,
    logGroupName,
    severity,
    count,
    firstSeen,
    lastSeen,
    affectedStreamCount: affectedStreams.size,
    evidence: evidenceSamples,
    cloudWatchUrl: buildCloudWatchUrl({ region, logGroupName }),
    isRecurring: false,
    recurrenceDescription: null,
    _allTimestampsMs: sorted.map(e => e.timestamp),
  }
}

function runSpecialist(category, events, region) {
  // events are already filtered to this category
  // annotate with logGroupName (already on each event)
  const groups = groupBySignature(events)
  const findings = []
  for (const [, group] of groups) {
    const logGroupName = group.events[0]?.logGroupName ?? 'unknown'
    findings.push(buildFinding({ category, logGroupName, region, group }))
  }
  return findings
}

export const SPECIALISTS = Object.fromEntries(
  CATEGORIES.map(cat => [cat, (events, region) => runSpecialist(cat, events, region)])
)
