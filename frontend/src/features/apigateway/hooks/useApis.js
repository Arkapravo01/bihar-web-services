import { useQuery } from '@tanstack/react-query'
import { listApis } from '../api/apiGatewayApi'

export function useApis() {
  return useQuery({ queryKey: ['apigateway', 'apis'], queryFn: listApis })
}
