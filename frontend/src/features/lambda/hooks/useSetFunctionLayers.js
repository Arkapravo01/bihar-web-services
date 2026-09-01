import { useMutation, useQueryClient } from '@tanstack/react-query'
import { setFunctionLayers } from '../api/lambdaApi'

export function useSetFunctionLayers() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ functionName, layerArns }) => setFunctionLayers(functionName, layerArns),
    onSuccess: (_data, { functionName }) => {
      queryClient.invalidateQueries({ queryKey: ['lambda', 'function', functionName] })
    },
  })
}
