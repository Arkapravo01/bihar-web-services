export { ApiError } from '../errors.js'

export function assertBucketNameProvided(bucketName) {
  if (!bucketName || typeof bucketName !== 'string') {
    throw new ApiError(400, 'S3_BUCKET_REQUIRED', 'A bucket name is required')
  }
}

export function assertKeyProvided(key) {
  if (!key || typeof key !== 'string') {
    throw new ApiError(400, 'S3_KEY_REQUIRED', 'A "key" query parameter is required')
  }
}

export function assertFileProvided(file) {
  if (!file) {
    throw new ApiError(400, 'S3_FILE_REQUIRED', 'A file must be attached to the request')
  }
}
