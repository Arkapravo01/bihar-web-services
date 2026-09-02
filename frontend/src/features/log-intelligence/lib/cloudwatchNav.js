/**
 * Internal CloudWatch navigation helper.
 * Converts a log group name to the internal app route.
 * Leading "/" is stripped from the log group name to build the wildcard path.
 */

export function logGroupPath(logGroupName) {
  const stripped = logGroupName?.startsWith('/') ? logGroupName.slice(1) : logGroupName
  return `/cloudwatch/log-groups/${stripped}`
}
