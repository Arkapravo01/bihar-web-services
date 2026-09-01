import { useMutation, useQueryClient } from '@tanstack/react-query'
import { restoreFromSnapshot } from '../api/rdsApi'

export function useRestoreFromSnapshot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ snapshotId, newInstanceId }) => restoreFromSnapshot(snapshotId, newInstanceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rds', 'instances'] })
    },
  })
}
