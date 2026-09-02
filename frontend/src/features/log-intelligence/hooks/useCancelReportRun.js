import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cancelReportRun } from '../api/reportApi'

export function useCancelReportRun() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (runId) => cancelReportRun(runId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report'] })
    },
  })
}
