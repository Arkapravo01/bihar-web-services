import { useQuery } from '@tanstack/react-query'
import { listWorkflows } from '../api/glueApi'

export function useWorkflows() {
  return useQuery({ queryKey: ['glue', 'workflows'], queryFn: listWorkflows })
}
