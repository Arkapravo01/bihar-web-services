import { apiClient } from '@/services/apiClient'

export function runOrchestratorInvestigation(query, history = []) {
  return apiClient
    .post('/api/agent/orchestrator/investigate', { query, history })
    .then((r) => r.data)
}
