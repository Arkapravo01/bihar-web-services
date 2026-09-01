import { useQuery } from '@tanstack/react-query'
import { listUsers } from '../api/iamApi'

export function useUsers() {
  return useQuery({ queryKey: ['iam', 'users'], queryFn: listUsers })
}
