import { apiClient } from '@/services/apiClient'

export function getEnv() {
  return apiClient.get('/api/apigateway/env').then((r) => r.data)
}

export function listApis() {
  return apiClient.get('/api/apigateway/').then((r) => r.data)
}

export function getApiDetail(apiId) {
  return apiClient.get(`/api/apigateway/${encodeURIComponent(apiId)}`).then((r) => r.data)
}

export function listStages(apiId) {
  return apiClient.get(`/api/apigateway/${encodeURIComponent(apiId)}/stages`).then((r) => r.data)
}

export function listResources(apiId) {
  return apiClient.get(`/api/apigateway/${encodeURIComponent(apiId)}/resources`).then((r) => r.data)
}

export function listDeployments(apiId) {
  return apiClient.get(`/api/apigateway/${encodeURIComponent(apiId)}/deployments`).then((r) => r.data)
}

export function testInvokeMethod(apiId, resourceId, { httpMethod, pathWithQueryString, body, headers }) {
  return apiClient.post(`/api/apigateway/${encodeURIComponent(apiId)}/resources/${encodeURIComponent(resourceId)}/test`, {
    httpMethod, pathWithQueryString, body, headers,
  }).then((r) => r.data)
}

export function runApiGatewayInvestigation(query, history = []) {
  return apiClient.post('/api/agent/apigateway/investigate', { query, history }).then((r) => r.data)
}
