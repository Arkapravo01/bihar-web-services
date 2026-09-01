import { useQuery } from '@tanstack/react-query'
import { listAccessKeys } from '../api/iamApi'

export function useAccessKeys() {
  return useQuery({ queryKey: ['iam', 'access-keys'], queryFn: listAccessKeys })
}
