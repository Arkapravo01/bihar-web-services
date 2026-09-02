/**
 * CloudWatch console deep-link builder.
 * Double-encoding required for AWS CloudWatch console v2 SPA routing.
 * Example: /aws/lambda/order-processor
 *   → %2Faws%2Flambda%2Forder-processor  (first pass)
 *   → %252Faws%252Flambda%252Forder-processor  (second pass, re-encodes %)
 */

import { AWS_REGION } from '../../../config/aws.js'

function doubleEncode(str) {
  return encodeURIComponent(encodeURIComponent(str))
}

export function buildCloudWatchUrl({ region, logGroupName, logStreamName } = {}) {
  const r = region ?? AWS_REGION
  const base = `https://${r}.console.aws.amazon.com/cloudwatch/home?region=${r}#logsV2:log-groups/log-group/${doubleEncode(logGroupName)}`
  if (logStreamName) {
    return `${base}/log-events/${doubleEncode(logStreamName)}`
  }
  return base
}
