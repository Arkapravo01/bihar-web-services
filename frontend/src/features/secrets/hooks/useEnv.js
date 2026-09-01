import { useQuery } from '@tanstack/react-query'
import { getEnv } from '../api/secretsApi'

export function useEnv() {
  return useQuery({ queryKey: ['secrets', 'env'], queryFn: getEnv })
}
