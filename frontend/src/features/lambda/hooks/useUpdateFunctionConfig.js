import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateFunctionConfig } from '../api/lambdaApi'

export function useUpdateFunctionConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ functionName, updates }) => updateFunctionConfig(functionName, updates),
    onSuccess: (data, { functionName }) => {
      queryClient.invalidateQueries({ queryKey: ['lambda', 'function', functionName] })
    },
  })
}
