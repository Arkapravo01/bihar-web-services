import { apiClient } from '@/services/apiClient'

export function getEnv() {
  return apiClient.get('/api/iam/env').then((r) => r.data)
}

export function listUsers() {
  return apiClient.get('/api/iam/users').then((r) => r.data)
}

export function listRoles() {
  return apiClient.get('/api/iam/roles').then((r) => r.data)
}

export function listPolicies() {
  return apiClient.get('/api/iam/policies').then((r) => r.data)
}

export function getUserDetail(userName) {
  return apiClient.get(`/api/iam/users/${encodeURIComponent(userName)}`).then((r) => r.data)
}

export function getRoleDetails(roleName) {
  return apiClient.get(`/api/iam/roles/${encodeURIComponent(roleName)}`).then((r) => r.data)
}

export function listAccessKeys() {
  return apiClient.get('/api/iam/access-keys').then((r) => r.data)
}

export function createUser(userName) {
  return apiClient.post('/api/iam/users', { userName }).then((r) => r.data)
}

export function deleteUser(userName) {
  return apiClient.delete(`/api/iam/users/${encodeURIComponent(userName)}`).then((r) => r.data)
}

/**
 * The response carries the secret access key. AWS returns it exactly once and
 * never again, so it is handed straight to the caller for display and is
 * deliberately never written to a query cache.
 */
export function createAccessKey(userName) {
  return apiClient
    .post(`/api/iam/users/${encodeURIComponent(userName)}/access-keys`, {})
    .then((r) => r.data)
}

export function updateAccessKeyStatus(userName, accessKeyId, status) {
  return apiClient
    .patch(
      `/api/iam/users/${encodeURIComponent(userName)}/access-keys/${encodeURIComponent(accessKeyId)}`,
      { status },
    )
    .then((r) => r.data)
}

export function deleteAccessKey(userName, accessKeyId) {
  return apiClient
    .delete(
      `/api/iam/users/${encodeURIComponent(userName)}/access-keys/${encodeURIComponent(accessKeyId)}`,
    )
    .then((r) => r.data)
}

export async function runIAMInvestigation(query, history = []) {
  return apiClient.post('/api/agent/iam/investigate', { query, history }).then((r) => r.data)
}
