import { useQuery } from '@tanstack/react-query'
import { getEnv } from '../api/iamApi'

export function useEnv() {
  return useQuery({ queryKey: ['iam', 'env'], queryFn: getEnv })
}
