/**
 * Specialist analysis.
 *
 * There used to be eight named "specialist agents" mapped from fourteen
 * categories, and every one of them called the same function with a different
 * label — the specialisation was cosmetic. They are now three, each owning a
 * coherent family of failures, which is what the report actually distinguishes:
 *
 *   failure-analysis     the platform refused or cut off the work
 *                        (timeout, throttling, access_denied,
 *                         resource_not_found, invocation)
 *   runtime-analysis     our code or its process died
 *                        (memory, runtime, exception, application, other)
 *   dependency-analysis  something we depend on failed
 *                        (network, database, connection, dependency)
 *
 * Category ids on findings are unchanged, so the frontend's category filter
 * and labels keep working.
 */

import { groupBySignature, findingId, rollupSignature } from './dedupe.js'
import { computeSeverity } from './severity.js'
import { buildCloudWatchUrl } from './cloudwatchLinks.js'
import { computeRecurrence } from './recurrence.js'

export const SPECIALIST_FAMILIES = [
  {
    type: 'failure-analysis',
    name: 'Failure Analysis Agent',
    categories: ['timeout', 'throttling', 'access_denied', 'resource_not_found', 'invocation'],
  },
  {
    type: 'runtime-analysis',
    name: 'Runtime Analysis Agent',
    categories: ['memory', 'runtime', 'exception', 'application', 'other'],
  },
  {
    type: 'dependency-analysis',
    name: 'Dependency Analysis Agent',
    categories: ['network', 'database', 'connection', 'dependency'],
  },
]

export const CATEGORY_TO_SPECIALIST = Object.fromEntries(
  SPECIALIST_FAMILIES.flatMap((f) => f.categories.map((c) => [c, f.type])),
)

const CONFIDENCE_RANK = { high: 3, medium: 2, low: 1 }

function strongestConfidence(events) {
  let best = 'low'
  for (const e of events) {
    if ((CONFIDENCE_RANK[e.confidence] ?? 0) > (CONFIDENCE_RANK[best] ?? 0)) best = e.confidence
  }
  return best
}

function buildFinding({ category, logGroupName, region, group, windowHours, groupsForCategory }) {
  const sorted = [...group.events].sort((a, b) => a.timestamp - b.timestamp)
  const count = sorted.length
  const affectedStreams = new Set(sorted.map((e) => e.logStreamName).filter(Boolean))
  const confidence = strongestConfidence(sorted)

  const severity = computeSeverity({
    category,
    count,
    windowHours,
    confidence,
    affectedStreamCount: affectedStreams.size,
    affectedLogGroupsCount: groupsForCategory,
  })

  const recurrence = computeRecurrence(sorted.map((e) => e.timestamp))

  // Newest evidence last — an operator reads the most recent occurrence first.
  const evidence = sorted.slice(-5).map((e) => ({
    timestamp: new Date(e.timestamp).toISOString(),
    message: e.message?.slice(0, 500) ?? '',
    logStreamName: e.logStreamName ?? null,
    eventId: e.eventId ?? null,
    cloudWatchUrl: buildCloudWatchUrl({ region, logGroupName, logStreamName: e.logStreamName }),
  }))

  return {
    id: findingId(group.signature),
    category,
    logGroupName,
    severity,
    confidence,
    count,
    occurrencesPerHour: Number((count / (windowHours || 24)).toFixed(3)),
    firstSeen: new Date(sorted[0].timestamp).toISOString(),
    lastSeen: new Date(sorted[sorted.length - 1].timestamp).toISOString(),
    affectedStreamCount: affectedStreams.size,
    evidence,
    cloudWatchUrl: buildCloudWatchUrl({ region, logGroupName }),
    isRecurring: recurrence.isRecurring,
    recurrenceDescription: recurrence.description,
    fingerprint: group.fingerprint,
    _allTimestampsMs: sorted.map((e) => e.timestamp),
  }
}

/**
 * Analyse one specialist family.
 * @param {object[]} events  classified events belonging to this family only
 * @returns {object[]} findings, deterministically ordered
 */
export function analyzeFamily({ events, region, windowHours }) {
  // How many distinct log groups each category touches — feeds the breadth
  // term of the severity score.
  const groupsPerCategory = {}
  for (const e of events) {
    ;(groupsPerCategory[e.category] ??= new Set()).add(e.logGroupName)
  }

  // `other` is the catch-all: a line held an error word but matched no rule.
  // These are usually fragments of one bulk payload and are individually
  // worthless, so they collapse to one row per log group rather than burying
  // the real findings under a dozen near-identical low-severity rows.
  const rollupEvents = []
  const preciseEvents = []
  for (const e of events) {
    ;(e.category === 'other' ? rollupEvents : preciseEvents).push(e)
  }

  const groups = groupBySignature(preciseEvents)
  const rollupByGroup = new Map()
  for (const e of rollupEvents) {
    if (!rollupByGroup.has(e.logGroupName)) rollupByGroup.set(e.logGroupName, [])
    rollupByGroup.get(e.logGroupName).push(e)
  }
  for (const [logGroupName, evs] of rollupByGroup) {
    const sig = rollupSignature(logGroupName)
    groups.set(sig, {
      events: evs,
      signature: sig,
      fingerprint: 'unclassified error lines',
      normalizedMessage: 'unclassified error lines',
      isRollup: true,
    })
  }

  const findings = []
  for (const [, group] of groups) {
    const first = group.events[0]
    findings.push(
      buildFinding({
        category: first.category,
        logGroupName: first.logGroupName ?? 'unknown',
        region,
        group,
        windowHours,
        groupsForCategory: groupsPerCategory[first.category]?.size ?? 1,
      }),
    )
    if (group.isRollup) findings[findings.length - 1].isRollup = true
  }
  return findings
}
