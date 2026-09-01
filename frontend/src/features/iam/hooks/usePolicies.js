import { useQuery } from '@tanstack/react-query'
import { listPolicies } from '../api/iamApi'

export function usePolicies() {
  return useQuery({ queryKey: ['iam', 'policies'], queryFn: listPolicies })
}
