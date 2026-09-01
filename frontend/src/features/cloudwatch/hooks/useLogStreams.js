import { useQuery } from '@tanstack/react-query'
import { listLogStreams } from '../api/cloudwatchApi'
import { useActiveEnv } from '@/app/providers/ActiveEnvProvider'

export function useLogStreams(logGroupName, params = {}) {
  const { activeEnvKey } = useActiveEnv()
  return useQuery({
    queryKey: ['cloudwatch', 'log-streams', activeEnvKey, logGroupName, params],
    queryFn: () => listLogStreams(logGroupName, params),
    staleTime: 30_000,
    enabled: Boolean(logGroupName),
  })
}
