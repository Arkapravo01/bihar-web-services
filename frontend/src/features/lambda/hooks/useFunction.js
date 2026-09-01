import { useQuery } from '@tanstack/react-query'
import { getFunction } from '../api/lambdaApi'

export function useFunction(functionName) {
  return useQuery({
    queryKey: ['lambda', 'function', functionName],
    queryFn: () => getFunction(functionName),
    enabled: !!functionName,
  })
}
