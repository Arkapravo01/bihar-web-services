import { useMutation, useQueryClient } from '@tanstack/react-query'
import { setRuleState } from '../api/eventbridgeApi'

/**
 * Turning a rule on or off.
 *
 * Both the fleet list and the rule's own page are invalidated, because the state
 * change is the one fact they both display. The response carries the rule as AWS
 * holds it after the write, so nothing is optimistically assumed — if AWS refuses,
 * the UI never showed a state that did not exist.
 */
export function useSetRuleState() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ eventBusName, ruleName, enabled }) => setRuleState(eventBusName, ruleName, enabled),
    onSuccess: (_data, { eventBusName, ruleName }) => {
      queryClient.invalidateQueries({ queryKey: ['eventbridge', 'rules'] })
      queryClient.invalidateQueries({ queryKey: ['eventbridge', 'rule', eventBusName, ruleName] })
    },
  })
}
