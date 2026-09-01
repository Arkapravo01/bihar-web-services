import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteInstance } from '../api/rdsApi'

export function useDeleteInstance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ instanceId, skipFinalSnapshot, finalSnapshotIdentifier }) =>
      deleteInstance(instanceId, { skipFinalSnapshot, finalSnapshotIdentifier }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rds', 'instances'] })
    },
  })
}
