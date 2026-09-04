import { useQuery } from '@tanstack/react-query'
import { getJob } from '../api/glueApi'

export function useJob(jobName) {
  return useQuery({ queryKey: ['glue', 'job', jobName], queryFn: () => getJob(jobName), enabled: !!jobName })
}
