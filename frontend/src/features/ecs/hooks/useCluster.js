import { useQuery } from '@tanstack/react-query'
import { describeCluster } from '../api/ecsApi'

export function useCluster(clusterName) {
  return useQuery({
    queryKey: ['ecs', 'cluster', clusterName],
    queryFn: () => describeCluster(clusterName),
    enabled: !!clusterName,
    refetchInterval: 20000,
  })
}
