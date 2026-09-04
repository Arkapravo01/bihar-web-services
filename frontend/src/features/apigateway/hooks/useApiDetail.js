import { useQuery } from '@tanstack/react-query'
import { getApiDetail } from '../api/apiGatewayApi'

export function useApiDetail(apiId) {
  return useQuery({
    queryKey: ['apigateway', 'api', apiId],
    queryFn: () => getApiDetail(apiId),
    enabled: !!apiId,
  })
}
