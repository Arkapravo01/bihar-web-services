import { useMutation, useQueryClient } from '@tanstack/react-query'
import { startReportRun } from '../api/reportApi'

export function useStartReportRun() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (timeRange) => startReportRun(timeRange),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report'] })
    },
  })
}
