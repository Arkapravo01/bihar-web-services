import { useQuery } from '@tanstack/react-query'
import { getEnv } from '../api/lambdaApi'

export function useEnv() {
  return useQuery({ queryKey: ['lambda', 'env'], queryFn: getEnv })
}
