import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateSecretValue } from '../api/secretsApi'

export function useUpdateSecretValue() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ secretName, value }) => updateSecretValue(secretName, value),
    onSuccess: (_data, { secretName }) => {
      queryClient.invalidateQueries({ queryKey: ['secrets', 'detail', secretName] })
      queryClient.invalidateQueries({ queryKey: ['secrets', 'value', secretName] })
      queryClient.invalidateQueries({ queryKey: ['secrets', 'list'] })
    },
  })
}
