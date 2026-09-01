import { useQuery } from '@tanstack/react-query'
import { listInstances } from '../api/rdsApi'

export function useInstances() {
  return useQuery({ queryKey: ['rds', 'instances'], queryFn: listInstances })
}
