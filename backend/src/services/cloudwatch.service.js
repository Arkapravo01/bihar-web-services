import {
  DescribeLogGroupsCommand,
  DescribeLogStreamsCommand,
  GetLogEventsCommand,
  FilterLogEventsCommand,
  StartQueryCommand,
  GetQueryResultsCommand,
} from '@aws-sdk/client-cloudwatch-logs'
import { getLogsClientForEnv } from '../clients/index.js'
import { CLOUDWATCH_PROFILE, AWS_REGION } from '../config/aws.js'

let contextClient = null

function setContextClient(client) {
  contextClient = client
}

function getClient() {
  if (!contextClient) throw new Error('CloudWatch client not initialized')
  return contextClient
}

export function setClientForEnv(env) {
  const client = getLogsClientForEnv(env)
  setContextClient(client)
  return { env, profile: CLOUDWATCH_PROFILE, region: AWS_REGION }
}

export async function listLogGroups({ limit = 50, nextToken, logGroupNamePrefix } = {}) {
  const out = await getClient().send(new DescribeLogGroupsCommand({ limit, nextToken, logGroupNamePrefix }))
  return {
    logGroups: (out.logGroups ?? []).map((lg) => ({
      name: lg.logGroupName,
      arn: lg.arn,
      creationTime: lg.creationTime,
      retentionInDays: lg.retentionInDays ?? null,
      storedBytes: lg.storedBytes ?? 0,
      metricFilterCount: lg.metricFilterCount ?? 0,
    })),
    nextToken: out.nextToken ?? null,
  }
}

export async function listLogStreams(logGroupName, { limit = 50, nextToken, orderBy = 'LastEventTime', descending = true } = {}) {
  const out = await getClient().send(new DescribeLogStreamsCommand({ logGroupName, limit, nextToken, orderBy, descending }))
  return {
    logStreams: (out.logStreams ?? []).map((ls) => ({
      name: ls.logStreamName,
      creationTime: ls.creationTime,
      firstEventTimestamp: ls.firstEventTimestamp ?? null,
      lastEventTimestamp: ls.lastEventTimestamp ?? null,
      storedBytes: ls.storedBytes ?? 0,
    })),
    nextToken: out.nextToken ?? null,
  }
}

export async function getLogEvents(logGroupName, logStreamName, { limit = 100, nextToken, startTime, endTime, startFromHead = false } = {}) {
  const out = await getClient().send(new GetLogEventsCommand({ logGroupName, logStreamName, limit, nextToken, startTime, endTime, startFromHead }))
  return {
    events: (out.events ?? []).map((e) => ({
      timestamp: e.timestamp,
      message: e.message,
      ingestionTime: e.ingestionTime,
    })),
    nextForwardToken: out.nextForwardToken ?? null,
    nextBackwardToken: out.nextBackwardToken ?? null,
  }
}

export async function filterLogEvents(logGroupName, { logStreamNames, startTime, endTime, filterPattern, limit = 100, nextToken } = {}) {
  const out = await getClient().send(new FilterLogEventsCommand({ logGroupName, logStreamNames, startTime, endTime, filterPattern, limit, nextToken }))
  return {
    events: (out.events ?? []).map((e) => ({
      logStreamName: e.logStreamName,
      timestamp: e.timestamp,
      message: e.message,
      eventId: e.eventId,
    })),
    nextToken: out.nextToken ?? null,
  }
}

export async function startInsightsQuery(logGroupNames, queryString, startTime, endTime) {
  const out = await getClient().send(new StartQueryCommand({
    logGroupNames: Array.isArray(logGroupNames) ? logGroupNames : [logGroupNames],
    queryString,
    startTime,
    endTime,
  }))
  return { queryId: out.queryId }
}

export async function getInsightsQueryResults(queryId) {
  const out = await getClient().send(new GetQueryResultsCommand({ queryId }))
  return {
    status: out.status,
    results: out.results ?? [],
    statistics: out.statistics ?? null,
  }
}
