import { useQuery } from '@tanstack/react-query'
import { listTargets } from '../api/eventbridgeApi'

export function useTargets(eventBusName, ruleName) {
  return useQuery({
    queryKey: ['eventbridge', 'targets', eventBusName, ruleName],
    queryFn: () => listTargets(eventBusName, ruleName),
    enabled: Boolean(eventBusName && ruleName),
  })
}
