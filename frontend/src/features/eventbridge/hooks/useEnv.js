import { useQuery } from '@tanstack/react-query'
import { getEnv } from '../api/eventbridgeApi'

/** Which profile and region the backend is talking to — used for console links. */
export function useEnv() {
  return useQuery({ queryKey: ['eventbridge', 'env'], queryFn: getEnv, staleTime: Infinity })
}
