import { DescribeLogGroupsCommand, FilterLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs'
import { getLogsClientForEnv } from '../../../clients/index.js'
import { AWS_REGION } from '../../../config/aws.js'

export const MAX_EVENTS_PER_GROUP = 500

export async function discoverAllLogGroups({ env, prefix, signal } = {}) {
  const client = getLogsClientForEnv(env)
  const logGroups = []
  let nextToken = undefined
  let page = 0
  while (page < 10) {
    if (signal?.aborted) break
    const out = await client.send(new DescribeLogGroupsCommand({ limit: 50, nextToken, ...(prefix ? { logGroupNamePrefix: prefix } : {}) }))
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
    const out = await client.send(new FilterLogEventsCommand({ logGroupName, startTime, endTime, limit: 100, nextToken }))
    for (const e of out.events ?? []) events.push({ logStreamName: e.logStreamName, timestamp: e.timestamp, message: e.message, eventId: e.eventId })
    pagesFetched++
    if (!out.nextToken || events.length >= MAX_EVENTS_PER_GROUP) { nextToken = out.nextToken; break }
    nextToken = out.nextToken
  }
  return { events: events.slice(0, MAX_EVENTS_PER_GROUP), truncated: nextToken != null, pagesFetched }
}
