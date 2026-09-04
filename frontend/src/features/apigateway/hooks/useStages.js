import { useQuery } from '@tanstack/react-query'
import { listStages } from '../api/apiGatewayApi'

export function useStages(apiId) {
  return useQuery({
    queryKey: ['apigateway', 'stages', apiId],
    queryFn: () => listStages(apiId),
    enabled: !!apiId,
  })
}
