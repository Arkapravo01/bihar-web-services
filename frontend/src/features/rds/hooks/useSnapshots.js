import { useQuery } from '@tanstack/react-query'
import { listSnapshots } from '../api/rdsApi'

export function useSnapshots(instanceId) {
  return useQuery({
    queryKey: ['rds', 'snapshots', instanceId],
    queryFn: () => listSnapshots(instanceId),
    enabled: !!instanceId,
  })
}
