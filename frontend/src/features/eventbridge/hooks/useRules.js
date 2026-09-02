import { useQuery } from '@tanstack/react-query'
import { listRules } from '../api/eventbridgeApi'

export function useRules(eventBusName = 'default') {
  return useQuery({
    queryKey: ['eventbridge', 'rules', eventBusName],
    queryFn: () => listRules(eventBusName),
  })
}
