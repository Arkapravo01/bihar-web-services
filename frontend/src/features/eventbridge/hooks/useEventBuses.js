import { useQuery } from '@tanstack/react-query'
import { listEventBuses } from '../api/eventbridgeApi'

export function useEventBuses() {
  return useQuery({ queryKey: ['eventbridge', 'buses'], queryFn: listEventBuses })
}
