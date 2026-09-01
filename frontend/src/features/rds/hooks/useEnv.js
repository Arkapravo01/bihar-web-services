import { useQuery } from '@tanstack/react-query'
import { getEnv } from '../api/rdsApi'

export function useEnv() {
  return useQuery({ queryKey: ['rds', 'env'], queryFn: getEnv })
}
