/**
 * Deterministic severity rules — no AI, never approximate.
 * Checked in order; first match wins.
 */

export function computeSeverity({ category, count, affectedLogGroupsCount = 0 }) {
  // critical
  if ((category === 'memory' || category === 'runtime') && count >= 3) return 'critical'
  if (affectedLogGroupsCount >= 3 && count >= 10) return 'critical'
  if (count >= 20) return 'critical'

  // high
  if (['timeout', 'connection', 'dependency', 'database', 'network'].includes(category) && count >= 5) return 'high'
  if (count >= 10) return 'high'
  if (['access_denied', 'throttling', 'resource_not_found', 'invocation'].includes(category) && count >= 3) return 'high'

  // medium
  if (count >= 3) return 'medium'

  // low
  if (count >= 1) return 'low'

  return 'info'
}
