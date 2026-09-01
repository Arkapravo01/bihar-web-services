import { apiClient, getApiBaseUrl } from '@/services/apiClient'

export function getEnv() {
  return apiClient.get('/api/s3/env').then((r) => r.data)
}

export function listBuckets() {
  return apiClient.get('/api/s3/buckets').then((r) => r.data)
}

export function listObjects(bucketName, prefix = '') {
  const q = new URLSearchParams({ prefix })
  return apiClient.get(`/api/s3/buckets/${encodeURIComponent(bucketName)}/objects?${q}`).then((r) => r.data)
}

export function getMetrics(bucketName) {
  return apiClient.get(`/api/s3/buckets/${encodeURIComponent(bucketName)}/metrics`).then((r) => r.data)
}

export function getPermissions(bucketName) {
  return apiClient.get(`/api/s3/buckets/${encodeURIComponent(bucketName)}/permissions`).then((r) => r.data)
}

export async function uploadObject(bucketName, { prefix = '', file, overwrite = false }) {
  const form = new FormData()
  form.append('prefix', prefix)
  if (overwrite) form.append('overwrite', 'true')
  form.append('file', file)
  const r = await apiClient.postForm(`/api/s3/buckets/${encodeURIComponent(bucketName)}/objects`, form)
  return r.data
}

export function downloadUrl(bucketName, key) {
  const q = new URLSearchParams({ key })
  return `${getApiBaseUrl()}/api/s3/buckets/${encodeURIComponent(bucketName)}/objects/download?${q}`
}

export function deleteObject(bucketName, key) {
  const q = new URLSearchParams({ key })
  return apiClient.delete(`/api/s3/buckets/${encodeURIComponent(bucketName)}/objects?${q}`).then((r) => r.data)
}

export function runS3Investigation(query, history = []) {
  return apiClient.post('/api/agent/s3/investigate', { query, history }).then((r) => r.data)
}
