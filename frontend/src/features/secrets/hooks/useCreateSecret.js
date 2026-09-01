import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createSecret } from '../api/secretsApi'

export function useCreateSecret() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createSecret,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secrets', 'list'] })
    },
  })
}
