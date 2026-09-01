import { useMutation, useQueryClient } from '@tanstack/react-query'
import { startInstance } from '../api/rdsApi'

export function useStartInstance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (instanceId) => startInstance(instanceId),
    onSuccess: (_data, instanceId) => {
      queryClient.invalidateQueries({ queryKey: ['rds', 'instance', instanceId] })
      queryClient.invalidateQueries({ queryKey: ['rds', 'instances'] })
    },
  })
}
