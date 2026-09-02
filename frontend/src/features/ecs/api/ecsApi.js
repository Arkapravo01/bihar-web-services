import { apiClient } from '@/services/apiClient'

export function listClusters() {
  return apiClient.get('/api/ecs/clusters').then((r) => r.data)
}

export function describeCluster(clusterName) {
  return apiClient.get(`/api/ecs/clusters/${clusterName}`).then((r) => r.data)
}

export function listServices(clusterName) {
  return apiClient.get(`/api/ecs/clusters/${clusterName}/services`).then((r) => r.data)
}

export function listTasks(clusterName, serviceName = null) {
  const params = serviceName ? `?serviceName=${serviceName}` : ''
  return apiClient.get(`/api/ecs/clusters/${clusterName}/tasks${params}`).then((r) => r.data)
}

export function listTaskDefinitions() {
  return apiClient.get('/api/ecs/task-definitions').then((r) => r.data)
}

export function listContainerInstances(clusterName) {
  return apiClient.get(`/api/ecs/container-instances/${clusterName}`).then((r) => r.data)
}

export function runEcsInvestigation(query, history = []) {
  return apiClient.post('/api/agent/ecs/investigate', { query, history }).then((r) => r.data)
}
