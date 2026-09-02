import { apiClient } from '@/services/apiClient'

export function listDatabases() {
  return apiClient.get('/api/glue/databases').then((r) => r.data)
}

export function getDatabase(name) {
  return apiClient.get(`/api/glue/databases/${name}`).then((r) => r.data)
}

export function listTables(databaseName) {
  return apiClient.get(`/api/glue/databases/${databaseName}/tables`).then((r) => r.data)
}

export function listJobs() {
  return apiClient.get('/api/glue/jobs').then((r) => r.data)
}

export function getJobRuns(jobName) {
  return apiClient.get(`/api/glue/jobs/${jobName}/runs`).then((r) => r.data)
}

export function listConnections() {
  return apiClient.get('/api/glue/connections').then((r) => r.data)
}

export function listCrawlers() {
  return apiClient.get('/api/glue/crawlers').then((r) => r.data)
}

export async function runGlueInvestigation(query, history = []) {
  return apiClient.post('/api/agent/glue/investigate', { query, history }).then((r) => r.data)
}
