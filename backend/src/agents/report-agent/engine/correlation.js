/**
 * Deterministic correlation rules — no AI.
 * OBSERVED: same log group, overlapping/near time windows.
 * INFERRED: different log groups, both within 5 min of each other.
 */

import { randomUUID } from 'crypto'

const CORRELATION_WINDOW_MS = 5 * 60 * 1000 // 5 minutes
const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info']

function severityRank(s) {
  const idx = SEVERITY_ORDER.indexOf(s)
  return idx === -1 ? 999 : idx
}

function windowsOverlapOrNear(f1, f2) {
  const a1 = new Date(f1.firstSeen).getTime()
  const b1 = new Date(f1.lastSeen).getTime()
  const a2 = new Date(f2.firstSeen).getTime()
  const b2 = new Date(f2.lastSeen).getTime()
  // overlapping
  if (a1 <= b2 && a2 <= b1) return true
  // near (within window)
  const gap = Math.max(a1, a2) - Math.min(b1, b2)
  return gap <= CORRELATION_WINDOW_MS
}

function bothWithinWindow(f1, f2) {
  const a1 = new Date(f1.firstSeen).getTime()
  const b1 = new Date(f1.lastSeen).getTime()
  const a2 = new Date(f2.firstSeen).getTime()
  const b2 = new Date(f2.lastSeen).getTime()
  const earliest = Math.min(a1, a2)
  const latest = Math.max(b1, b2)
  return (latest - earliest) <= CORRELATION_WINDOW_MS
}

export function computeCorrelations(findings) {
  // Only medium+ severity; cap at top 20 by count to bound O(n²)
  const candidates = findings
    .filter(f => severityRank(f.severity) <= severityRank('medium'))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)

  const correlations = []
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const f1 = candidates[i]
      const f2 = candidates[j]
      let relationship = null
      let reason = null

      if (f1.logGroupName === f2.logGroupName && windowsOverlapOrNear(f1, f2)) {
        relationship = 'OBSERVED'
        reason = `Both ${f1.category} and ${f2.category} events occurred in the same log group (${f1.logGroupName}) within overlapping time windows.`
      } else if (f1.logGroupName !== f2.logGroupName && bothWithinWindow(f1, f2)) {
        relationship = 'INFERRED'
        reason = `${f1.category} in ${f1.logGroupName} and ${f2.category} in ${f2.logGroupName} both occurred within a 5-minute window — possible cascading failure.`
      }

      if (relationship) {
        correlations.push({ id: randomUUID(), findingIds: [f1.id, f2.id], relationship, reason })
      }
    }
  }
  return correlations
}
