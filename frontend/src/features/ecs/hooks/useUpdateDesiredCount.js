import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateDesiredCount } from '../api/ecsApi'

export function useUpdateDesiredCount(clusterName, serviceName) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (desiredCount) => updateDesiredCount(clusterName, serviceName, desiredCount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ecs', 'service', clusterName, serviceName] })
      queryClient.invalidateQueries({ queryKey: ['ecs', 'services', clusterName] })
    },
  })
}
