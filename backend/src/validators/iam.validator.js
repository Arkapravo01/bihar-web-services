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
