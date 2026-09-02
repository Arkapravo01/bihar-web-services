import { apiClient } from '@/services/apiClient'

export function listClusters() {
  return apiClient.get('/api/ecs/clusters').then((r) => r.data)
}

export function describeCluster(clusterName) {
  return apiClient.get(`/api/ecs/clusters/${clusterName}`).then((r) => r.data)
}

export function listServices(clusterName) {
  return apiClient.get(`/api/ecs/clusters/${encodeURIComponent(clusterName)}/services`).then((r) => r.data)
}

export function describeService(clusterName, serviceName) {
  return apiClient
    .get(`/api/ecs/clusters/${encodeURIComponent(clusterName)}/services/${encodeURIComponent(serviceName)}`)
    .then((r) => r.data)
}

export function updateDesiredCount(clusterName, serviceName, desiredCount) {
  return apiClient
    .patch(`/api/ecs/clusters/${encodeURIComponent(clusterName)}/services/${encodeURIComponent(serviceName)}/desired-count`, { desiredCount })
    .then((r) => r.data)
}

export function forceNewDeployment(clusterName, serviceName) {
  return apiClient
    .post(`/api/ecs/clusters/${encodeURIComponent(clusterName)}/services/${encodeURIComponent(serviceName)}/force-deployment`, {})
    .then((r) => r.data)
}

export function listTasks(clusterName, serviceName = null) {
  const params = serviceName ? `?serviceName=${encodeURIComponent(serviceName)}` : ''
  return apiClient.get(`/api/ecs/clusters/${encodeURIComponent(clusterName)}/tasks${params}`).then((r) => r.data)
}

export function stopTask(clusterName, taskArn, reason) {
  return apiClient
    .post(`/api/ecs/clusters/${encodeURIComponent(clusterName)}/tasks/stop`, { taskArn, reason })
    .then((r) => r.data)
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
