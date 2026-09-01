import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deployFunction } from '../api/lambdaApi'

export function useDeployFunction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ functionName, edits }) => deployFunction(functionName, edits),
    onSuccess: (_data, { functionName }) => {
      queryClient.invalidateQueries({ queryKey: ['lambda', 'function', functionName] })
      queryClient.invalidateQueries({ queryKey: ['lambda', 'files', functionName] })
    },
  })
}
