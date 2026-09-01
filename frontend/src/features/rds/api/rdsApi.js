import { apiClient } from '@/services/apiClient'

export function getEnv() {
  return apiClient.get('/api/rds/env').then((r) => r.data)
}

export function listInstances() {
  return apiClient.get('/api/rds').then((r) => r.data)
}

export function getInstanceDetail(instanceId) {
  return apiClient.get(`/api/rds/${encodeURIComponent(instanceId)}`).then((r) => r.data)
}

export function listSnapshots(instanceId) {
  return apiClient.get(`/api/rds/${encodeURIComponent(instanceId)}/snapshots`).then((r) => r.data)
}

export function startInstance(instanceId) {
  return apiClient.post(`/api/rds/${encodeURIComponent(instanceId)}/start`, {}).then((r) => r.data)
}

export function stopInstance(instanceId) {
  return apiClient.post(`/api/rds/${encodeURIComponent(instanceId)}/stop`, {}).then((r) => r.data)
}

export function rebootInstance(instanceId) {
  return apiClient.post(`/api/rds/${encodeURIComponent(instanceId)}/reboot`, {}).then((r) => r.data)
}

export function createSnapshot(instanceId, snapshotId) {
  return apiClient.post(`/api/rds/${encodeURIComponent(instanceId)}/snapshots`, { snapshotId }).then((r) => r.data)
}

export function deleteInstance(instanceId, { skipFinalSnapshot, finalSnapshotIdentifier }) {
  return apiClient.delete(`/api/rds/${encodeURIComponent(instanceId)}`, { skipFinalSnapshot, finalSnapshotIdentifier }).then((r) => r.data)
}

export function restoreFromSnapshot(snapshotId, newInstanceId) {
  return apiClient.post('/api/rds/restore', { snapshotId, newInstanceId }).then((r) => r.data)
}

export function runRdsInvestigation(query, history = []) {
  return apiClient.post('/api/agent/rds/investigate', { query, history }).then((r) => r.data)
}
