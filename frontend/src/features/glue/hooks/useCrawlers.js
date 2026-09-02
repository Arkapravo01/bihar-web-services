import { useQuery } from '@tanstack/react-query'
import { listCrawlers } from '../api/glueApi'

export function useCrawlers() {
  return useQuery({ queryKey: ['glue', 'crawlers'], queryFn: listCrawlers })
}
