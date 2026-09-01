import { useQuery } from '@tanstack/react-query'
import { getFunctionFiles } from '../api/lambdaApi'

export function useFunctionFiles(functionName) {
  return useQuery({
    queryKey: ['lambda', 'files', functionName],
    queryFn: () => getFunctionFiles(functionName),
    enabled: !!functionName,
  })
}
