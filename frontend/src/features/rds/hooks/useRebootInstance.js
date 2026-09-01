import { useMutation, useQueryClient } from '@tanstack/react-query'
import { rebootInstance } from '../api/rdsApi'

export function useRebootInstance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (instanceId) => rebootInstance(instanceId),
    onSuccess: (_data, instanceId) => {
      queryClient.invalidateQueries({ queryKey: ['rds', 'instance', instanceId] })
      queryClient.invalidateQueries({ queryKey: ['rds', 'instances'] })
    },
  })
}
