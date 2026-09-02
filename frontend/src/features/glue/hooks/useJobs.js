import { useQuery } from '@tanstack/react-query'
import { listJobs } from '../api/glueApi'

export function useJobs() {
  return useQuery({ queryKey: ['glue', 'jobs'], queryFn: listJobs })
}
