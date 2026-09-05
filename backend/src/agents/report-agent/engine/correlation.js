/**
 * Deterministic correlation rules — no AI.
 *
 * OBSERVED: same log group, overlapping or near-adjacent time windows.
 * INFERRED: different log groups, both active inside the same 5-minute window.
 *
 * Ids are derived from the finding pair rather than randomUUID(), so the same
 * correlation keeps the same id across runs and the narrative can cite it.
 * Candidates are ranked by severity before the pair cap is applied, so the cap
 * drops the least important pairs instead of whatever sorted first.
 */

import { createHash } from 'crypto'
import { SEVERITY_RANK } from './severity.js'

const CORRELATION_WINDOW_MS = 5 * 60 * 1000
const MAX_CANDIDATES = 20
const MAX_CORRELATIONS = 40

function severityRank(s) {
  const i = SEVERITY_RANK.indexOf(s)
  return i === -1 ? -1 : i
}

function span(f) {
  return { from: new Date(f.firstSeen).getTime(), to: new Date(f.lastSeen).getTime() }
}

function windowsOverlapOrNear(f1, f2) {
  const a = span(f1)
  const b = span(f2)
  if (a.from <= b.to && b.from <= a.to) return true
  const gap = Math.max(a.from, b.from) - Math.min(a.to, b.to)
  return gap <= CORRELATION_WINDOW_MS
}

function bothWithinWindow(f1, f2) {
  const a = span(f1)
  const b = span(f2)
  return Math.max(a.to, b.to) - Math.min(a.from, b.from) <= CORRELATION_WINDOW_MS
}

function correlationId(id1, id2) {
  const [x, y] = [id1, id2].sort()
  return createHash('sha1').update(`${x}|${y}`).digest('hex').slice(0, 32)
}

export function computeCorrelations(findings) {
  // Only medium+ severity; ranked so the cap keeps the most significant pairs.
  const candidates = findings
    .filter((f) => severityRank(f.severity) >= severityRank('medium'))
    .sort(
      (a, b) =>
        severityRank(b.severity) - severityRank(a.severity) ||
        b.count - a.count ||
        a.id.localeCompare(b.id),
    )
    .slice(0, MAX_CANDIDATES)

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
        correlations.push({ id: correlationId(f1.id, f2.id), findingIds: [f1.id, f2.id], relationship, reason })
      }
    }
  }

  // OBSERVED first (directly witnessed), then stable id order.
  correlations.sort(
    (a, b) =>
      (a.relationship === b.relationship ? 0 : a.relationship === 'OBSERVED' ? -1 : 1) ||
      a.id.localeCompare(b.id),
  )
  return correlations.slice(0, MAX_CORRELATIONS)
}
