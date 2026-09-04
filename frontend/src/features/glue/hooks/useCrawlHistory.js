import { useQuery } from '@tanstack/react-query'
import { listCrawlHistory } from '../api/glueApi'

export function useCrawlHistory(crawlerName) {
  return useQuery({ queryKey: ['glue', 'crawlhistory', crawlerName], queryFn: () => listCrawlHistory(crawlerName), enabled: !!crawlerName })
}
