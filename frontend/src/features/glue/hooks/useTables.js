import { useQuery } from '@tanstack/react-query'
import { listTables } from '../api/glueApi'

export function useTables(databaseName) {
  return useQuery({ queryKey: ['glue', 'tables', databaseName], queryFn: () => listTables(databaseName), enabled: !!databaseName })
}
