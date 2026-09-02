import { useQuery } from '@tanstack/react-query'
import { describeService } from '../api/ecsApi'

export function useService(clusterName, serviceName) {
  return useQuery({
    queryKey: ['ecs', 'service', clusterName, serviceName],
    queryFn: () => describeService(clusterName, serviceName),
    enabled: !!clusterName && !!serviceName,
    refetchInterval: 15000,
  })
}
