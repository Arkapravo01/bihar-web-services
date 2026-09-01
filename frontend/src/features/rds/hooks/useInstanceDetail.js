import { useQuery } from '@tanstack/react-query'
import { getInstanceDetail } from '../api/rdsApi'

export function useInstanceDetail(instanceId) {
  return useQuery({
    queryKey: ['rds', 'instance', instanceId],
    queryFn: () => getInstanceDetail(instanceId),
    enabled: !!instanceId,
  })
}
