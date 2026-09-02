import { useQuery } from '@tanstack/react-query'
import { listServices } from '../api/ecsApi'

export function useServices(clusterName) {
  return useQuery({
    queryKey: ['ecs', 'services', clusterName],
    queryFn: () => listServices(clusterName),
    enabled: !!clusterName,
  })
}
