import { useMutation, useQueryClient } from '@tanstack/react-query'
import { publishLayer } from '../api/lambdaApi'

export function usePublishLayer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: publishLayer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lambda', 'layers'] })
    },
  })
}
