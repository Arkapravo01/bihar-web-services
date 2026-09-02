import { useMutation } from '@tanstack/react-query'
import { runOrchestratorInvestigation } from '../api/orchestratorApi'

export function useOrchestratorInvestigation() {
  return useMutation({
    mutationFn: ({ query, history }) => runOrchestratorInvestigation(query, history),
  })
}
