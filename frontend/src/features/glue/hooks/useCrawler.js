import { useQuery } from '@tanstack/react-query'
import { getCrawler } from '../api/glueApi'

export function useCrawler(crawlerName) {
  return useQuery({ queryKey: ['glue', 'crawler', crawlerName], queryFn: () => getCrawler(crawlerName), enabled: !!crawlerName })
}
