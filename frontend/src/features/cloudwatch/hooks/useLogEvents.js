import { useQuery } from '@tanstack/react-query'
import { listLogEvents } from '../api/cloudwatchApi'
import { useActiveEnv } from '@/app/providers/ActiveEnvProvider'

export function useLogEvents(logGroupName, logStreamName, params = {}) {
  const { activeEnvKey } = useActiveEnv()
  return useQuery({
    queryKey: ['cloudwatch', 'log-events', activeEnvKey, logGroupName, logStreamName, params],
    queryFn: () => listLogEvents(logGroupName, logStreamName, params),
    staleTime: 10_000,
    enabled: Boolean(logGroupName) && Boolean(logStreamName),
  })
}
