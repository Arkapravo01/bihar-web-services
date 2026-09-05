import { useQuery } from '@tanstack/react-query'
import { describeRule } from '../api/eventbridgeApi'

export function useRuleDetail(eventBusName, ruleName) {
  return useQuery({
    queryKey: ['eventbridge', 'rule', eventBusName, ruleName],
    queryFn: () => describeRule(eventBusName, ruleName),
    enabled: Boolean(eventBusName && ruleName),
  })
}
