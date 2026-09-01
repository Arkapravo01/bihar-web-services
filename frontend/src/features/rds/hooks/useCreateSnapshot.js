import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createSnapshot } from '../api/rdsApi'

export function useCreateSnapshot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ instanceId, snapshotId }) => createSnapshot(instanceId, snapshotId),
    onSuccess: (_data, { instanceId }) => {
      queryClient.invalidateQueries({ queryKey: ['rds', 'snapshots', instanceId] })
    },
  })
}
