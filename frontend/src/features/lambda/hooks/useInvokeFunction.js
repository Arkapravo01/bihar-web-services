import { useMutation } from '@tanstack/react-query'
import { invokeFunction } from '../api/lambdaApi'

export function useInvokeFunction() {
  return useMutation({
    mutationFn: ({ functionName, payload }) => invokeFunction(functionName, payload),
  })
}
