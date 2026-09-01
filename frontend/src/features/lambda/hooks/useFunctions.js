import { useQuery } from '@tanstack/react-query'
import { listFunctions } from '../api/lambdaApi'

export function useFunctions() {
  return useQuery({ queryKey: ['lambda', 'functions'], queryFn: listFunctions })
}
