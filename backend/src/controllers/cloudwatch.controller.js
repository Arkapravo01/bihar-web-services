import * as cwService from '../services/cloudwatch.service.js'
import { assertLogGroupName, assertLogStreamName, assertQueryString, assertLogGroupNames } from '../validators/cloudwatch.validator.js'

function resolveEnv(req) {
  const env = req.query.env || 'qa'
  return env === 'prod' ? 'prod' : 'qa'
}

// path-to-regexp v8 wildcard params are captured as arrays — join them back into a path string
// prefixSlash=true for log group names (they start with "/"), false for stream names
function resolveParam(param, prefixSlash = true) {
  if (!param) return ''
  const joined = Array.isArray(param) ? param.join('/') : param
  return prefixSlash ? '/' + joined : joined
}

export async function getLogGroups(req, res) {
  const env = resolveEnv(req)
  cwService.setClientForEnv(env)
  const { limit, nextToken, logGroupNamePrefix } = req.query
  const result = await cwService.listLogGroups({
    limit: limit ? Number(limit) : undefined,
    nextToken,
    logGroupNamePrefix,
  })
  res.json({ success: true, data: result })
}

export async function getLogStreams(req, res) {
  const env = resolveEnv(req)
  cwService.setClientForEnv(env)
  const logGroupName = resolveParam(req.params.logGroupName)
  const { limit, nextToken, orderBy, descending } = req.query
  assertLogGroupName(logGroupName)
  const result = await cwService.listLogStreams(logGroupName, {
    limit: limit ? Number(limit) : undefined,
    nextToken,
    orderBy,
    descending: descending === 'true',
  })
  res.json({ success: true, data: result })
}

export async function getLogEvents(req, res) {
  const env = resolveEnv(req)
  cwService.setClientForEnv(env)
  const logGroupName = resolveParam(req.params.logGroupName, true)
  const logStreamName = resolveParam(req.params.logStreamName, false)
  const { limit, nextToken, startTime, endTime, startFromHead } = req.query
  assertLogGroupName(logGroupName)
  assertLogStreamName(logStreamName)
  const result = await cwService.getLogEvents(logGroupName, logStreamName, {
    limit: limit ? Number(limit) : undefined,
    nextToken,
    startTime: startTime ? Number(startTime) : undefined,
    endTime: endTime ? Number(endTime) : undefined,
    startFromHead: startFromHead === 'true',
  })
  res.json({ success: true, data: result })
}

export async function filterLogEvents(req, res) {
  const env = resolveEnv(req)
  cwService.setClientForEnv(env)
  const logGroupName = resolveParam(req.params.logGroupName)
  const { logStreamNames, startTime, endTime, filterPattern, limit, nextToken } = req.query
  assertLogGroupName(logGroupName)
  const result = await cwService.filterLogEvents(logGroupName, {
    logStreamNames: logStreamNames ? logStreamNames.split(',') : undefined,
    startTime: startTime ? Number(startTime) : undefined,
    endTime: endTime ? Number(endTime) : undefined,
    filterPattern,
    limit: limit ? Number(limit) : undefined,
    nextToken,
  })
  res.json({ success: true, data: result })
}

export async function executeInsightsQuery(req, res) {
  const env = resolveEnv(req)
  cwService.setClientForEnv(env)
  const { logGroupNames, queryString, startTime, endTime } = req.body
  assertLogGroupNames(logGroupNames)
  assertQueryString(queryString)
  const result = await cwService.startInsightsQuery(logGroupNames, queryString, startTime, endTime)
  res.json({ success: true, data: result })
}

export async function getInsightsQueryResults(req, res) {
  const env = resolveEnv(req)
  cwService.setClientForEnv(env)
  const { queryId } = req.params
  const result = await cwService.getInsightsQueryResults(queryId)
  res.json({ success: true, data: result })
}
