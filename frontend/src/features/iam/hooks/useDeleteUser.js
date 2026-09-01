import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteUser } from '../api/iamApi'

export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userName) => deleteUser(userName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iam', 'users'] })
    },
  })
}
