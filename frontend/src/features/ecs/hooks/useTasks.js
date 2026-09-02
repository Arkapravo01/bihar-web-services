import { useQuery } from '@tanstack/react-query'
import { listTasks } from '../api/ecsApi'

export function useTasks(clusterName, serviceName = null) {
  return useQuery({
    queryKey: ['ecs', 'tasks', clusterName, serviceName],
    queryFn: () => listTasks(clusterName, serviceName),
    enabled: !!clusterName,
  })
}
