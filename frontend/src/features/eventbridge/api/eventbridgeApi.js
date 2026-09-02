import { apiClient } from '@/services/apiClient'

export function listEventBuses() {
  return apiClient.get('/api/eventbridge/buses').then((r) => r.data)
}

export function describeEventBus(eventBusName = 'default') {
  return apiClient.get(`/api/eventbridge/buses/${eventBusName}`).then((r) => r.data)
}

export function listRules(eventBusName = 'default') {
  return apiClient.get(`/api/eventbridge/buses/${eventBusName}/rules`).then((r) => r.data)
}

export function describeRule(eventBusName, ruleName) {
  return apiClient.get(`/api/eventbridge/buses/${eventBusName}/rules/${ruleName}`).then((r) => r.data)
}

export function listTargets(eventBusName, ruleName) {
  return apiClient.get(`/api/eventbridge/buses/${eventBusName}/rules/${ruleName}/targets`).then((r) => r.data)
}

export function runEventBridgeInvestigation(query, history = []) {
  return apiClient.post('/api/agent/eventbridge/investigate', { query, history }).then((r) => r.data)
}
