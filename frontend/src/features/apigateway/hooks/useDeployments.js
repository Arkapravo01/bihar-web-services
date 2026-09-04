import { useQuery } from '@tanstack/react-query'
import { listDeployments } from '../api/apiGatewayApi'

export function useDeployments(apiId) {
  return useQuery({
    queryKey: ['apigateway', 'deployments', apiId],
    queryFn: () => listDeployments(apiId),
    enabled: !!apiId,
  })
}
