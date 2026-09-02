import { useQuery } from '@tanstack/react-query'
import { listDatabases } from '../api/glueApi'

export function useDatabases() {
  return useQuery({ queryKey: ['glue', 'databases'], queryFn: listDatabases })
}
