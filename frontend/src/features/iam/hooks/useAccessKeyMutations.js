import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createAccessKey, updateAccessKeyStatus, deleteAccessKey } from '../api/iamApi'

/**
 * Every key mutation invalidates both the fleet-wide list and the affected
 * user's detail, because a new or removed key changes what each view shows.
 */
function useKeyInvalidation() {
  const queryClient = useQueryClient()
  return (userName) => {
    queryClient.invalidateQueries({ queryKey: ['iam', 'access-keys'] })
    if (userName) queryClient.invalidateQueries({ queryKey: ['iam', 'users', userName] })
  }
}

/**
 * The created key's secret is returned to the caller and never placed in the
 * query cache — it is shown once and then only exists wherever the operator
 * saved it.
 */
export function useCreateAccessKey() {
  const invalidate = useKeyInvalidation()
  return useMutation({
    mutationFn: (userName) => createAccessKey(userName),
    onSuccess: (_data, userName) => invalidate(userName),
  })
}

export function useUpdateAccessKeyStatus() {
  const invalidate = useKeyInvalidation()
  return useMutation({
    mutationFn: ({ userName, accessKeyId, status }) =>
      updateAccessKeyStatus(userName, accessKeyId, status),
    onSuccess: (_data, { userName }) => invalidate(userName),
  })
}

export function useDeleteAccessKey() {
  const invalidate = useKeyInvalidation()
  return useMutation({
    mutationFn: ({ userName, accessKeyId }) => deleteAccessKey(userName, accessKeyId),
    onSuccess: (_data, { userName }) => invalidate(userName),
  })
}
