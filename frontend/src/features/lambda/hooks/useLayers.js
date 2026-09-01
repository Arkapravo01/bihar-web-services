import { useQuery } from '@tanstack/react-query'
import { listLayers } from '../api/lambdaApi'

export function useLayers() {
  return useQuery({
    queryKey: ['lambda', 'layers'],
    queryFn: listLayers,
  })
}
