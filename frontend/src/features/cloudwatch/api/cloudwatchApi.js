import { apiClient } from '@/services/apiClient'

// Log group names start with "/" — strip it when building the URL path
// so there's no double-slash, e.g. /aws/lambda/fn → aws/lambda/fn
function groupPath(name) {
  return name.replace(/^\//, '')
}

export function listLogGroups(params = {}) {
  const q = new URLSearchParams()
  if (params.limit)              q.append('limit', params.limit)
  if (params.nextToken)          q.append('nextToken', params.nextToken)
  if (params.logGroupNamePrefix) q.append('logGroupNamePrefix', params.logGroupNamePrefix)
  return apiClient.get(`/api/cloudwatch/log-groups?${q}`).then((r) => r.data)
}

export function listLogStreams(logGroupName, params = {}) {
  const q = new URLSearchParams()
  if (params.limit)    q.append('limit', params.limit)
  if (params.nextToken) q.append('nextToken', params.nextToken)
  if (params.orderBy)  q.append('orderBy', params.orderBy)
  if (params.descending !== undefined) q.append('descending', params.descending)
  return apiClient.get(`/api/cloudwatch/log-groups/${groupPath(logGroupName)}/streams?${q}`).then((r) => r.data)
}

export function listLogEvents(logGroupName, logStreamName, params = {}) {
  const q = new URLSearchParams()
  if (params.limit)        q.append('limit', params.limit)
  if (params.nextToken)    q.append('nextToken', params.nextToken)
  if (params.startTime)    q.append('startTime', params.startTime)
  if (params.endTime)      q.append('endTime', params.endTime)
  if (params.startFromHead !== undefined) q.append('startFromHead', params.startFromHead)
  return apiClient.get(`/api/cloudwatch/log-groups/${groupPath(logGroupName)}/streams/${logStreamName}/events?${q}`).then((r) => r.data)
}

export function filterLogEvents(logGroupName, params = {}) {
  const q = new URLSearchParams()
  if (params.logStreamNames?.length) q.append('logStreamNames', params.logStreamNames.join(','))
  if (params.startTime)    q.append('startTime', params.startTime)
  if (params.endTime)      q.append('endTime', params.endTime)
  if (params.filterPattern) q.append('filterPattern', params.filterPattern)
  if (params.limit)        q.append('limit', params.limit)
  if (params.nextToken)    q.append('nextToken', params.nextToken)
  return apiClient.get(`/api/cloudwatch/log-groups/${groupPath(logGroupName)}/filter?${q}`).then((r) => r.data)
}

export function startInsightsQuery(logGroupNames, queryString, startTime, endTime) {
  return apiClient.post('/api/cloudwatch/query', { logGroupNames, queryString, startTime, endTime }).then((r) => r.data)
}

export function getInsightsQueryResults(queryId) {
  return apiClient.get(`/api/cloudwatch/query/${queryId}`).then((r) => r.data)
}

export function runInvestigation(query, history = []) {
  return apiClient.post('/api/agent/cloudwatch/investigate', { query, history }).then((r) => r.data)
}
