import { useQuery } from '@tanstack/react-query'
import { listClusters } from '../api/ecsApi'

export function useClusters() {
  return useQuery({ queryKey: ['ecs', 'clusters'], queryFn: listClusters })
}
