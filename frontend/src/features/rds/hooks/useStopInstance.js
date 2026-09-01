import { useMutation, useQueryClient } from '@tanstack/react-query'
import { stopInstance } from '../api/rdsApi'

export function useStopInstance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (instanceId) => stopInstance(instanceId),
    onSuccess: (_data, instanceId) => {
      queryClient.invalidateQueries({ queryKey: ['rds', 'instance', instanceId] })
      queryClient.invalidateQueries({ queryKey: ['rds', 'instances'] })
    },
  })
}
