import { apiClient } from '@/services/apiClient'

export function startReportRun(timeRange) {
  return apiClient.post('/api/report/runs', { timeRange }).then(r => r.data)
}

export function getReportRun(runId) {
  return apiClient.get(`/api/report/runs/${runId}`).then(r => r.data.run)
}

export function getLatestReportRun(timeRange) {
  return apiClient.get(`/api/report/runs/latest?timeRange=${timeRange}`).then(r => r.data.run)
}

export function listReportRuns(timeRange, limit = 20) {
  const params = new URLSearchParams({ limit: String(limit) })
  if (timeRange) params.set('timeRange', timeRange)
  return apiClient.get(`/api/report/runs?${params}`).then(r => r.data.runs)
}

export function cancelReportRun(runId) {
  return apiClient.post(`/api/report/runs/${runId}/cancel`, {}).then(r => r.data)
}

export function runReportInvestigation(query, history = []) {
  return apiClient.post('/api/agent/report/investigate', { query, history }).then(r => r.data)
}
