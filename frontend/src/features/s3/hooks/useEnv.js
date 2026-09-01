import { useQuery } from '@tanstack/react-query'
import { getEnv } from '../api/s3Api'

export function useEnv() {
  return useQuery({ queryKey: ['s3', 'env'], queryFn: getEnv })
}
