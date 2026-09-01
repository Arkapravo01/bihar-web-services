import { useQuery } from '@tanstack/react-query'
import { getMetrics, getPermissions } from '../api/s3Api'

export function useBucketMetrics(bucketName, enabled) {
  return useQuery({
    queryKey: ['s3', 'metrics', bucketName],
    queryFn: () => getMetrics(bucketName),
    enabled: Boolean(bucketName) && enabled,
  })
}

export function useBucketPermissions(bucketName, enabled) {
  return useQuery({
    queryKey: ['s3', 'permissions', bucketName],
    queryFn: () => getPermissions(bucketName),
    enabled: Boolean(bucketName) && enabled,
  })
}
