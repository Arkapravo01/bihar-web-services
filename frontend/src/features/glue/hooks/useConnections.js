import { useQuery } from '@tanstack/react-query'
import { listConnections } from '../api/glueApi'

export function useConnections() {
  return useQuery({ queryKey: ['glue', 'connections'], queryFn: listConnections })
}
