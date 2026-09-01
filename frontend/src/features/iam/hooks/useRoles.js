import { useQuery } from '@tanstack/react-query'
import { listRoles } from '../api/iamApi'

export function useRoles() {
  return useQuery({ queryKey: ['iam', 'roles'], queryFn: listRoles })
}
