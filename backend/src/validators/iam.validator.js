import { ApiError } from '../errors.js'

export function assertUserName(userName) {
  if (!userName || typeof userName !== 'string' || !userName.trim()) {
    throw new ApiError(400, 'USERNAME_REQUIRED', 'Username is required')
  }
  if (userName.length < 3) {
    throw new ApiError(400, 'USERNAME_TOO_SHORT', 'Username must be at least 3 characters')
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(userName)) {
    throw new ApiError(400, 'INVALID_USERNAME_FORMAT', 'Username can only contain letters, numbers, dots, dashes, and underscores')
  }
}

export function assertCreateUserInput(userName) {
  assertUserName(userName)
}

export function assertAccessKeyId(accessKeyId) {
  if (!accessKeyId || typeof accessKeyId !== 'string' || !accessKeyId.trim()) {
    throw new ApiError(400, 'ACCESS_KEY_ID_REQUIRED', 'An access key ID is required')
  }
  if (!/^[A-Z0-9]{16,128}$/.test(accessKeyId)) {
    throw new ApiError(400, 'INVALID_ACCESS_KEY_ID', 'That does not look like an access key ID')
  }
}

export function assertAccessKeyStatus(status) {
  if (status !== 'Active' && status !== 'Inactive') {
    throw new ApiError(400, 'INVALID_ACCESS_KEY_STATUS', 'Status must be either "Active" or "Inactive"')
  }
}
