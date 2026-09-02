import { useMutation, useQueryClient } from '@tanstack/react-query'
import { forceNewDeployment } from '../api/ecsApi'

export function useForceNewDeployment(clusterName, serviceName) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => forceNewDeployment(clusterName, serviceName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ecs', 'service', clusterName, serviceName] })
      queryClient.invalidateQueries({ queryKey: ['ecs', 'services', clusterName] })
      queryClient.invalidateQueries({ queryKey: ['ecs', 'tasks', clusterName] })
    },
  })
}
