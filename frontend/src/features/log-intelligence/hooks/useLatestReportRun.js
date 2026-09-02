import { useQuery } from '@tanstack/react-query'
import { getLatestReportRun } from '../api/reportApi'

const TERMINAL = ['complete', 'partial', 'failed']

export function useLatestReportRun(timeRange) {
  return useQuery({
    queryKey: ['report', 'latest', timeRange],
    queryFn: () => getLatestReportRun(timeRange),
    staleTime: 0,
    refetchInterval: (query) => {
      const data = query.state.data
      if (data === null || data === undefined) return 3000
      return TERMINAL.includes(data?.status) ? false : 3000
    },
  })
}
