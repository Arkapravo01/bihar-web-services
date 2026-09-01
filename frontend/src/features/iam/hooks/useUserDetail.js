import { useQuery } from '@tanstack/react-query'
import { getUserDetail } from '../api/iamApi'

export function useUserDetail(userName) {
  return useQuery({
    queryKey: ['iam', 'users', userName],
    queryFn: () => getUserDetail(userName),
    enabled: !!userName,
  })
}
