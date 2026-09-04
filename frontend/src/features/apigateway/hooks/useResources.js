import { useQuery } from '@tanstack/react-query'
import { listResources } from '../api/apiGatewayApi'

export function useResources(apiId) {
  return useQuery({
    queryKey: ['apigateway', 'resources', apiId],
    queryFn: () => listResources(apiId),
    enabled: !!apiId,
  })
}
