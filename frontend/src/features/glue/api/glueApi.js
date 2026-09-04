import { apiClient } from '@/services/apiClient'

export function listDatabases() {
  return apiClient.get('/api/glue/databases').then((r) => r.data)
}

export function getDatabase(name) {
  return apiClient.get(`/api/glue/databases/${encodeURIComponent(name)}`).then((r) => r.data)
}

export function listTables(databaseName) {
  return apiClient.get(`/api/glue/databases/${encodeURIComponent(databaseName)}/tables`).then((r) => r.data)
}

export function listJobs() {
  return apiClient.get('/api/glue/jobs').then((r) => r.data)
}

export function getJob(jobName) {
  return apiClient.get(`/api/glue/jobs/${encodeURIComponent(jobName)}`).then((r) => r.data)
}

export function getJobRuns(jobName) {
  return apiClient.get(`/api/glue/jobs/${encodeURIComponent(jobName)}/runs`).then((r) => r.data)
}

export function startJobRun(jobName, args = {}) {
  return apiClient.post(`/api/glue/jobs/${encodeURIComponent(jobName)}/runs`, { args }).then((r) => r.data)
}

export function listConnections() {
  return apiClient.get('/api/glue/connections').then((r) => r.data)
}

export function listCrawlers() {
  return apiClient.get('/api/glue/crawlers').then((r) => r.data)
}

export function getCrawler(crawlerName) {
  return apiClient.get(`/api/glue/crawlers/${encodeURIComponent(crawlerName)}`).then((r) => r.data)
}

export function listCrawlHistory(crawlerName) {
  return apiClient.get(`/api/glue/crawlers/${encodeURIComponent(crawlerName)}/crawls`).then((r) => r.data)
}

export function listWorkflows() {
  return apiClient.get('/api/glue/workflows').then((r) => r.data)
}

export function startWorkflowRun(workflowName) {
  return apiClient.post(`/api/glue/workflows/${encodeURIComponent(workflowName)}/runs`, {}).then((r) => r.data)
}

export function getWorkflowRuns(workflowName) {
  return apiClient.get(`/api/glue/workflows/${encodeURIComponent(workflowName)}/runs`).then((r) => r.data)
}

export function getWorkflowRunDetail(workflowName, runId) {
  return apiClient
    .get(`/api/glue/workflows/${encodeURIComponent(workflowName)}/runs/${encodeURIComponent(runId)}`)
    .then((r) => r.data)
}

export function runGlueInvestigation(query, history = []) {
  return apiClient.post('/api/agent/glue/investigate', { query, history }).then((r) => r.data)
}
