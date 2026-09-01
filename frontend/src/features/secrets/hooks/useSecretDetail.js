import { useQuery } from '@tanstack/react-query'
import { getSecretDetail } from '../api/secretsApi'

export function useSecretDetail(secretName) {
  return useQuery({
    queryKey: ['secrets', 'detail', secretName],
    queryFn: () => getSecretDetail(secretName),
    enabled: !!secretName,
  })
}
