import { useQuery } from '@tanstack/react-query'
import { getSecretValue } from '../api/secretsApi'

// Lazy by design: the value is never fetched until the caller invokes refetch()
// (e.g. a "Reveal" button click) — opening the page must not fetch the secret value.
export function useSecretValue(secretName) {
  return useQuery({
    queryKey: ['secrets', 'value', secretName],
    queryFn: () => getSecretValue(secretName),
    enabled: false,
    retry: false,
  })
}
