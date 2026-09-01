import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteObject, listObjects, uploadObject } from '../api/s3Api'

export function useObjects(bucketName, prefix) {
  return useQuery({
    queryKey: ['s3', 'objects', bucketName, prefix],
    queryFn: () => listObjects(bucketName, prefix),
    enabled: Boolean(bucketName),
  })
}

export function useUploadObject(bucketName, prefix) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ file, overwrite }) => uploadObject(bucketName, { prefix, file, overwrite }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['s3', 'objects', bucketName, prefix] })
    },
  })
}

export function useDeleteObject(bucketName, prefix) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (key) => deleteObject(bucketName, key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['s3', 'objects', bucketName, prefix] })
    },
  })
}
