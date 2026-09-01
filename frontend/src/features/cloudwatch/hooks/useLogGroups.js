import { useQuery } from '@tanstack/react-query'
import { listLogGroups } from '../api/cloudwatchApi'
import { useActiveEnv } from '@/app/providers/ActiveEnvProvider'

export function useLogGroups(params = {}) {
  const { activeEnvKey } = useActiveEnv()
  return useQuery({
    queryKey: ['cloudwatch', 'log-groups', activeEnvKey, params],
    queryFn: () => listLogGroups(params),
    staleTime: 30_000,
  })
}
