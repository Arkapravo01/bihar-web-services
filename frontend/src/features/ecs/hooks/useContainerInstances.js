import { useQuery } from '@tanstack/react-query'
import { listContainerInstances } from '../api/ecsApi'

export function useContainerInstances(clusterName) {
  return useQuery({
    queryKey: ['ecs', 'container-instances', clusterName],
    queryFn: () => listContainerInstances(clusterName),
    enabled: !!clusterName,
  })
}
