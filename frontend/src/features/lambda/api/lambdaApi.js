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

export function getFunctionFiles(functionName) {
  return apiClient.get(`/api/lambda/functions/${encodeURIComponent(functionName)}/files`).then((r) => r.data)
}

export function deployFunction(functionName, edits) {
  return apiClient.post(`/api/lambda/functions/${encodeURIComponent(functionName)}/deploy`, { edits }).then((r) => r.data)
}

export function listLayers() {
  return apiClient.get('/api/lambda/layers').then((r) => r.data)
}

export async function publishLayer({ layerName, description, compatibleRuntimes, file }) {
  const form = new FormData()
  form.append('layerName', layerName)
  if (description) form.append('description', description)
  if (compatibleRuntimes?.length) form.append('compatibleRuntimes', compatibleRuntimes.join(','))
  form.append('file', file)
  const r = await apiClient.postForm('/api/lambda/layers', form)
  return r.data
}

export function setFunctionLayers(functionName, layerArns) {
  return apiClient.patch(`/api/lambda/functions/${encodeURIComponent(functionName)}/layers`, { layerArns }).then((r) => r.data)
}

export function runLambdaInvestigation(query, history = []) {
  return apiClient.post('/api/agent/lambda/investigate', { query, history }).then((r) => r.data)
}
