import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteSecret } from '../api/secretsApi'

export function useDeleteSecret() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (secretName) => deleteSecret(secretName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secrets', 'list'] })
    },
  })
}
