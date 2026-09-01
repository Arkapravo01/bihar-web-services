import { useQuery } from '@tanstack/react-query'
import { listSecrets } from '../api/secretsApi'

export function useSecrets() {
  return useQuery({ queryKey: ['secrets', 'list'], queryFn: listSecrets })
}
