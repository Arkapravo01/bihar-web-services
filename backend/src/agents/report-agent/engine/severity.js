/**
 * Deterministic severity — no AI, and crucially, window-normalised.
 *
 * The old rules keyed off raw occurrence count alone (`count >= 20 → critical`).
 * That made severity a function of how long a window you happened to pick: the
 * same steady trickle of errors was "medium" over 24h and "critical" over 7d,
 * so the two reports disagreed about the health of an unchanged system. Counts
 * are now converted to a rate (occurrences per hour) before any threshold is
 * applied, so a 24h run and a 7d run over the same steady failure agree.
 *
 * Scoring is additive and every term is bounded, so the result is auditable:
 *
 *   score = categoryWeight (0–3) + rateBoost (0–2) + breadthBoost (0–1)
 *
 *   score >= 5  critical
 *   score >= 4  high
 *   score >= 2  medium
 *   otherwise   low
 *
 * Low-confidence findings (the `other` catch-all) are capped at `medium`: a
 * finding we could only pattern-match loosely must never top the report.
 */

// What the failure means for the system, independent of how often it happened.
const CATEGORY_WEIGHT = {
  memory: 3,             // the process died; nothing downstream ran
  runtime: 3,            // container/process level failure
  database: 2,
  connection: 2,
  network: 2,
  dependency: 2,
  timeout: 2,
  throttling: 2,         // capacity limit — spreads to callers
  access_denied: 2,      // usually a misconfiguration blocking real work
  invocation: 2,         // work was dropped or dead-lettered
  resource_not_found: 1,
  exception: 1,
  application: 1,
  other: 0,
}

const CONFIDENCE_CAP = { low: 'medium', medium: 'critical', high: 'critical' }
const RANK = ['low', 'medium', 'high', 'critical']

// Occurrences per hour. A single failure every couple of hours is background
// noise on most systems; one a minute is an incident.
function rateBoost(perHour) {
  if (perHour >= 10) return 2
  if (perHour >= 1) return 1
  return 0
}

// A failure showing up in many streams or many log groups is systemic, not a
// one-off bad record.
function breadthBoost({ affectedStreamCount, affectedLogGroupsCount }) {
  if (affectedLogGroupsCount >= 3 || affectedStreamCount >= 5) return 1
  return 0
}

function capAt(severity, cap) {
  return RANK.indexOf(severity) > RANK.indexOf(cap) ? cap : severity
}

export function computeSeverity({
  category,
  count,
  windowHours,
  confidence = 'medium',
  affectedStreamCount = 1,
  affectedLogGroupsCount = 1,
}) {
  if (!count || count < 1) return 'info'

  const hours = windowHours > 0 ? windowHours : 24
  const perHour = count / hours

  const score =
    (CATEGORY_WEIGHT[category] ?? 0) +
    rateBoost(perHour) +
    breadthBoost({ affectedStreamCount, affectedLogGroupsCount })

  let severity = 'low'
  if (score >= 5) severity = 'critical'
  else if (score >= 4) severity = 'high'
  else if (score >= 2) severity = 'medium'

  return capAt(severity, CONFIDENCE_CAP[confidence] ?? 'critical')
}

export const SEVERITY_RANK = RANK
