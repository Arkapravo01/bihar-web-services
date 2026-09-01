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

export async function runIAMInvestigation(query, history = []) {
  return apiClient.post('/api/agent/iam/investigate', { query, history }).then((r) => r.data)
}
