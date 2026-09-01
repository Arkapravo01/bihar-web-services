import { useQuery } from '@tanstack/react-query'
import { listBuckets } from '../api/s3Api'

export function useBuckets() {
  return useQuery({ queryKey: ['s3', 'buckets'], queryFn: listBuckets })
}
