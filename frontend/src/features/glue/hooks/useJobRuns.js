import { useQuery } from '@tanstack/react-query'
import { getJobRuns } from '../api/glueApi'

export function useJobRuns(jobName) {
  return useQuery({ queryKey: ['glue', 'jobruns', jobName], queryFn: () => getJobRuns(jobName), enabled: !!jobName })
}
