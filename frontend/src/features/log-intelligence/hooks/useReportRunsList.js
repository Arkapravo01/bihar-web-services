import { useQuery } from '@tanstack/react-query'
import { listReportRuns } from '../api/reportApi'

export function useReportRunsList(timeRange, limit = 20) {
  return useQuery({
    queryKey: ['report', 'runs', timeRange, limit],
    queryFn: () => listReportRuns(timeRange, limit),
  })
}
