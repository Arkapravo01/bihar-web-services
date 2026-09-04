import { DescribeLogGroupsCommand, FilterLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs'
import { getLogsClientForEnv } from '../../../clients/index.js'
import { AWS_REGION } from '../../../config/aws.js'

export const MAX_EVENTS_PER_GROUP = 500

// CloudWatch Logs' FilterLogEvents/DescribeLogGroups quota is low per-account.
// Running many collectors concurrently (see WORKER_CONCURRENCY in reportRunner.js)
// throttles a random subset of calls every run — the AWS SDK's own default retry
// exhausts fast under that much concurrent pressure. This app-level retry gives
// throttled calls real room (longer, jittered backoff) so a run doesn't silently
// drop a different set of log groups each time it's executed.
const MAX_RETRIES = 2

function isRetryableError(err) {
  const name = err?.name ?? ''
  const msg = err?.message ?? ''
  const status = err?.$metadata?.httpStatusCode
  if (name === 'ThrottlingException' || name === 'TooManyRequestsException') return true
  if (/rate exceeded/i.test(msg)) return true
  if (typeof status === 'number' && status >= 500) return true
  return false
}

function jitteredBackoffMs(attempt) {
  return 300 * 2 ** attempt + Math.random() * 300
}

async function sendWithRetry(client, cmd, signal) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await client.send(cmd, { abortSignal: signal })
    } catch (err) {
      if (attempt >= MAX_RETRIES || !isRetryableError(err) || signal?.aborted) throw err
      await new Promise((r) => setTimeout(r, jitteredBackoffMs(attempt)))
    }
  }
}

export async function discoverAllLogGroups({ env, prefix, signal } = {}) {
  const client = getLogsClientForEnv(env)
  const logGroups = []
  let nextToken = undefined
  let page = 0
  while (page < 10) {
    if (signal?.aborted) break
    const out = await sendWithRetry(
      client,
      new DescribeLogGroupsCommand({ limit: 50, nextToken, ...(prefix ? { logGroupNamePrefix: prefix } : {}) }),
      signal,
    )
    for (const lg of out.logGroups ?? []) logGroups.push({ name: lg.logGroupName, arn: lg.arn ?? null, storedBytes: lg.storedBytes ?? 0 })
    page++
    if (!out.nextToken) break
    nextToken = out.nextToken
  }
  return { logGroups, truncated: nextToken != null, region: AWS_REGION }
}

export async function fetchBoundedEvents({ env, logGroupName, startTime, endTime, signal } = {}) {
  const client = getLogsClientForEnv(env)
  const events = []
  let nextToken = undefined
  let pagesFetched = 0
  while (pagesFetched < 5) {
    if (signal?.aborted) throw new Error('Cancelled')
    const out = await sendWithRetry(
      client,
      new FilterLogEventsCommand({ logGroupName, startTime, endTime, limit: 100, nextToken }),
      signal,
    )
    for (const e of out.events ?? []) events.push({ logStreamName: e.logStreamName, timestamp: e.timestamp, message: e.message, eventId: e.eventId })
    pagesFetched++
    if (!out.nextToken || events.length >= MAX_EVENTS_PER_GROUP) { nextToken = out.nextToken; break }
    nextToken = out.nextToken
  }
  return { events: events.slice(0, MAX_EVENTS_PER_GROUP), truncated: nextToken != null, pagesFetched }
}
