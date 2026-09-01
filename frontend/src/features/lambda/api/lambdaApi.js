import { apiClient } from '@/services/apiClient'

export function getEnv() {
  return apiClient.get('/api/lambda/env').then((r) => r.data)
}

export function listFunctions() {
  return apiClient.get('/api/lambda/functions').then((r) => r.data)
}

export function getFunctionConfig(functionName) {
  return apiClient.get(`/api/lambda/functions/${encodeURIComponent(functionName)}/config`).then((r) => r.data)
}

export function getFunction(functionName) {
  return apiClient.get(`/api/lambda/functions/${encodeURIComponent(functionName)}`).then((r) => r.data)
}

export function invokeFunction(functionName, payload = null) {
  return apiClient.post(`/api/lambda/functions/${encodeURIComponent(functionName)}/invoke`, { payload }).then((r) => r.data)
}

export function getFunctionCode(functionName) {
  return apiClient.get(`/api/lambda/functions/${encodeURIComponent(functionName)}/code`).then((r) => r.data)
}

export function updateFunctionConfig(functionName, updates) {
  return apiClient.patch(`/api/lambda/functions/${encodeURIComponent(functionName)}/config`, updates).then((r) => r.data)
}
