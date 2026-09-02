import { useMutation, useQueryClient } from '@tanstack/react-query'
import { stopTask } from '../api/ecsApi'

export function useStopTask(clusterName) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskArn, reason }) => stopTask(clusterName, taskArn, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ecs', 'tasks', clusterName] })
    },
  })
}
