import { useQuery } from '@tanstack/react-query'
import { getReportRun } from '../api/reportApi'

const TERMINAL = ['complete', 'partial', 'failed']

export function useReportRun(runId) {
  return useQuery({
    queryKey: ['report', 'run', runId],
    queryFn: () => getReportRun(runId),
    enabled: !!runId,
    staleTime: 0,
    refetchInterval: (query) => TERMINAL.includes(query.state.data?.status) ? false : 3000,
  })
}
