import { apiClient } from '@/services/apiClient'

export function getEnv() {
  return apiClient.get('/api/secrets/env').then((r) => r.data)
}

export function listSecrets() {
  return apiClient.get('/api/secrets').then((r) => r.data)
}

export function getSecretDetail(secretName) {
  return apiClient.get(`/api/secrets/${encodeURIComponent(secretName)}`).then((r) => r.data)
}

export function getSecretValue(secretName) {
  return apiClient.get(`/api/secrets/${encodeURIComponent(secretName)}/value`).then((r) => r.data)
}

export function updateSecretValue(secretName, value) {
  return apiClient.put(`/api/secrets/${encodeURIComponent(secretName)}/value`, { value }).then((r) => r.data)
}

export function createSecret({ secretName, value, description }) {
  return apiClient.post('/api/secrets', { secretName, value, description }).then((r) => r.data)
}

export function deleteSecret(secretName) {
  return apiClient.delete(`/api/secrets/${encodeURIComponent(secretName)}`).then((r) => r.data)
}

export function runSecretsInvestigation(query, history = []) {
  return apiClient.post('/api/agent/secrets/investigate', { query, history }).then((r) => r.data)
}
