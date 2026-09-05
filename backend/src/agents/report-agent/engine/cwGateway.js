import { DescribeLogGroupsCommand, FilterLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs'
import { getLogsClientForEnv } from '../../../clients/index.js'
import { AWS_REGION } from '../../../config/aws.js'

/**
 * CloudWatch Logs collection gateway.
 *
 * Two problems this file used to have, both of which made reports vary wildly
 * between runs of the same window:
 *
 * 1. NO FILTER. It pulled raw log events and classified them afterwards, so the
 *    per-group event budget was spent on whatever the group happened to be
 *    printing. Measured on a real 7-day run: `/aws-glue/python-jobs/output` and
 *    two API Gateway groups each burned their entire 500-event budget and
 *    produced zero findings. CloudWatch can do this filtering server-side for
 *    free, so it now does — the budget only holds candidate failures.
 *
 * 2. OLDEST-FIRST TRUNCATION. FilterLogEvents returns events in ascending time
 *    order, so a capped fetch returns the START of the window. On the same real
 *    run, `/aws-glue/jobs/error` filled its 500 events from a burst 131 hours
 *    old spanning 0.0 hours — the other 5.5 days were never looked at. That is
 *    exactly why a 24h report could show errors a 7d report "didn't have". The
 *    window is now split into slices, each with its own budget, so coverage is
 *    even across the whole range and 7d is a superset of 24h.
 */

// Per-group ceiling across all slices. Bounds memory and API spend.
export const GROUP_EVENT_BUDGET = 600
const PAGE_LIMIT = 100
const MAX_PAGES_PER_SLICE = 3

// Throttling used to silently drop a different random subset of log groups on
// every run — the single largest source of "the report changed and nothing
// else did". Retries are patient enough that throttling rarely decides what
// ends up in a report; anything still failing is surfaced as a failed
// collector and turns the run "partial" rather than quietly shrinking it.
const MAX_RETRIES = 5
const MAX_BACKOFF_MS = 8_000

/**
 * Server-side prefilter. CloudWatch term matching is case-sensitive substring
 * matching and `?` makes terms OR'd, so each token needs its casings listed.
 * The vocabulary deliberately mirrors categorize.js: anything this pattern
 * drops could not have been classified anyway, and anything it keeps still has
 * to pass noise.js and the classifier before it can become a finding.
 */
const FILTER_TERMS = [
  'ERROR', 'Error', 'error',
  'FATAL', 'Fatal', 'fatal',
  'CRITICAL', 'Critical',
  'Exception', 'EXCEPTION', 'exception',
  'FAIL', 'Fail', 'fail',
  'Traceback', 'traceback',
  'timed out', 'Timed out', 'TIMED OUT',
  'Timeout', 'timeout', 'TIMEOUT',
  'denied', 'Denied', 'DENIED',
  'Throttl', 'throttl', 'THROTTL',
  'ECONN', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN', 'ENOSPC', 'ENOMEM', 'EPIPE',
  'OutOfMemory', 'OOMKilled', 'out of memory',
  'panic', 'Panic', 'PANIC',
  'Unauthorized', 'unauthorized',
  'NoSuch', 'NotFound', 'not found', 'Not Found',
  'refused', 'Refused',
  'crash', 'Crash',
  'abort', 'Abort',
  'SIGSEGV', 'SIGKILL', 'killed', 'Killed',
  'deadlock', 'Deadlock',
  'exited', 'Exited',
  'unhealthy', 'Unhealthy',
]

export const ERROR_FILTER_PATTERN = FILTER_TERMS.map((t) => `?"${t}"`).join(' ')

function isRetryableError(err) {
  const name = err?.name ?? ''
  const msg = err?.message ?? ''
  const status = err?.$metadata?.httpStatusCode
  if (name === 'ThrottlingException' || name === 'TooManyRequestsException') return true
  if (name === 'LimitExceededException' || name === 'ServiceUnavailableException') return true
  if (/rate exceeded|throttl/i.test(msg)) return true
  if (typeof status === 'number' && (status === 429 || status >= 500)) return true
  return false
}

function isMissingLogGroup(err) {
  return err?.name === 'ResourceNotFoundException'
}

function isBadFilterPattern(err) {
  return err?.name === 'InvalidParameterException' && /filter ?pattern/i.test(err?.message ?? '')
}

function jitteredBackoffMs(attempt) {
  return Math.min(MAX_BACKOFF_MS, 400 * 2 ** attempt) + Math.random() * 400
}

async function sendWithRetry(client, cmd, signal) {
  let throttled = 0
  for (let attempt = 0; ; attempt++) {
    try {
      const out = await client.send(cmd, { abortSignal: signal })
      return { out, throttled }
    } catch (err) {
      if (attempt >= MAX_RETRIES || !isRetryableError(err) || signal?.aborted) throw err
      throttled++
      await new Promise((r) => setTimeout(r, jitteredBackoffMs(attempt)))
    }
  }
}

export async function discoverAllLogGroups({ env, prefix, signal } = {}) {
  const client = getLogsClientForEnv(env)
  const logGroups = []
  let nextToken
  let page = 0
  while (page < 10) {
    if (signal?.aborted) break
    const { out } = await sendWithRetry(
      client,
      new DescribeLogGroupsCommand({ limit: 50, nextToken, ...(prefix ? { logGroupNamePrefix: prefix } : {}) }),
      signal,
    )
    for (const lg of out.logGroups ?? []) {
      logGroups.push({ name: lg.logGroupName, arn: lg.arn ?? null, storedBytes: lg.storedBytes ?? 0 })
    }
    page++
    if (!out.nextToken) break
    nextToken = out.nextToken
  }
  // Deterministic order so collector slots, and therefore the methodology
  // panel, line up between runs.
  logGroups.sort((a, b) => a.name.localeCompare(b.name))
  return { logGroups, truncated: false, region: AWS_REGION }
}

/**
 * How many slices to cut a window into. Each slice gets its own budget, which
 * is what guarantees the tail of the window is represented.
 */
export function sliceCountFor(windowMs) {
  const hours = windowMs / 3_600_000
  if (hours <= 2) return 2
  if (hours <= 26) return 6      // 24h → 6 × 4h
  return 7                        // 7d  → 7 × 1 day
}

async function fetchSlice({ client, logGroupName, startTime, endTime, budget, filterPattern, signal }) {
  const events = []
  let nextToken
  let pages = 0
  let throttled = 0
  let usedFilter = filterPattern

  while (pages < MAX_PAGES_PER_SLICE && events.length < budget) {
    if (signal?.aborted) throw new Error('Cancelled')
    let res
    try {
      res = await sendWithRetry(
        client,
        new FilterLogEventsCommand({
          logGroupName,
          startTime,
          endTime,
          limit: Math.min(PAGE_LIMIT, budget - events.length),
          nextToken,
          ...(usedFilter ? { filterPattern: usedFilter } : {}),
        }),
        signal,
      )
    } catch (err) {
      // A rejected filter pattern must degrade, not fail the group: fall back
      // to an unfiltered read of this slice so we still see something.
      if (usedFilter && isBadFilterPattern(err)) {
        console.warn(`[cwGateway] filter pattern rejected for ${logGroupName}; falling back to unfiltered read`)
        usedFilter = null
        nextToken = undefined
        continue
      }
      throw err
    }
    throttled += res.throttled
    for (const e of res.out.events ?? []) {
      events.push({
        logStreamName: e.logStreamName,
        timestamp: e.timestamp,
        message: e.message,
        eventId: e.eventId,
      })
    }
    pages++
    nextToken = res.out.nextToken
    if (!nextToken) break
  }

  return {
    events,
    // The slice had more matching events than its budget allowed.
    capped: events.length >= budget && Boolean(nextToken),
    throttled,
    filterDegraded: usedFilter !== filterPattern,
  }
}

/**
 * Collect candidate failure events across a window with even time coverage.
 */
export async function fetchBoundedEvents({
  env,
  logGroupName,
  startTime,
  endTime,
  signal,
  budget = GROUP_EVENT_BUDGET,
  useFilter = true,
} = {}) {
  const client = getLogsClientForEnv(env)
  const windowMs = Math.max(1, endTime - startTime)
  const slices = sliceCountFor(windowMs)
  const sliceMs = windowMs / slices
  const perSliceBudget = Math.max(60, Math.ceil(budget / slices))
  const filterPattern = useFilter ? ERROR_FILTER_PATTERN : null

  const events = []
  let cappedSlices = 0
  let throttled = 0
  let filterDegraded = false
  let missing = false

  for (let i = 0; i < slices; i++) {
    if (events.length >= budget) break
    const sliceStart = Math.floor(startTime + i * sliceMs)
    const sliceEnd = i === slices - 1 ? endTime : Math.floor(startTime + (i + 1) * sliceMs)
    try {
      const r = await fetchSlice({
        client,
        logGroupName,
        startTime: sliceStart,
        endTime: sliceEnd,
        budget: Math.min(perSliceBudget, budget - events.length),
        filterPattern,
        signal,
      })
      events.push(...r.events)
      if (r.capped) cappedSlices++
      throttled += r.throttled
      if (r.filterDegraded) filterDegraded = true
    } catch (err) {
      // A log group deleted between discovery and collection is not a failure
      // of the report — record it as empty and move on.
      if (isMissingLogGroup(err)) {
        missing = true
        break
      }
      throw err
    }
  }

  events.sort((a, b) => a.timestamp - b.timestamp)

  return {
    events,
    truncated: cappedSlices > 0,
    cappedSlices,
    slicesRequested: slices,
    throttledCalls: throttled,
    filterDegraded,
    missing,
    filtered: Boolean(filterPattern) && !filterDegraded,
  }
}
