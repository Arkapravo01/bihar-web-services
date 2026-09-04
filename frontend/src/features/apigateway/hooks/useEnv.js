import { useQuery } from '@tanstack/react-query'
import { getEnv } from '../api/apiGatewayApi'

export function useEnv() {
  return useQuery({ queryKey: ['apigateway', 'env'], queryFn: getEnv })
}
