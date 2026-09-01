import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createUser } from '../api/iamApi'

export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userName) => createUser(userName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iam', 'users'] })
    },
  })
}
