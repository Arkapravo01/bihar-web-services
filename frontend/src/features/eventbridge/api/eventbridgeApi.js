import { apiClient } from '@/services/apiClient'

/** Bus and rule names travel in the path, so both are always encoded. */
const seg = encodeURIComponent

export function getEnv() {
  return apiClient.get('/api/eventbridge/env').then((r) => r.data)
}

export function listEventBuses() {
  return apiClient.get('/api/eventbridge/buses').then((r) => r.data)
}

export function describeEventBus(eventBusName = 'default') {
  return apiClient.get(`/api/eventbridge/buses/${seg(eventBusName)}`).then((r) => r.data)
}

/** Every rule on every bus, targets included — one request for the whole page. */
export function listAllRules() {
  return apiClient.get('/api/eventbridge/rules').then((r) => r.data)
}

export function listRules(eventBusName = 'default') {
  return apiClient.get(`/api/eventbridge/buses/${seg(eventBusName)}/rules`).then((r) => r.data)
}

export function describeRule(eventBusName, ruleName) {
  return apiClient.get(`/api/eventbridge/buses/${seg(eventBusName)}/rules/${seg(ruleName)}`).then((r) => r.data)
}

export function listTargets(eventBusName, ruleName) {
  return apiClient
    .get(`/api/eventbridge/buses/${seg(eventBusName)}/rules/${seg(ruleName)}/targets`)
    .then((r) => r.data)
}

export function setRuleState(eventBusName, ruleName, enabled) {
  return apiClient
    .patch(`/api/eventbridge/buses/${seg(eventBusName)}/rules/${seg(ruleName)}/state`, { enabled })
    .then((r) => r.data)
}

export function runEventBridgeInvestigation(query, history = []) {
  return apiClient.post('/api/agent/eventbridge/investigate', { query, history }).then((r) => r.data)
}
