import { ApiError } from '../errors.js'

export function assertSecretName(name) {
  if (!name || typeof name !== 'string' || !name.trim()) {
    throw new ApiError(400, 'SECRET_NAME_REQUIRED', 'A secret name is required')
  }
}

export function assertSecretValue(value) {
  if (value === undefined || value === null) {
    throw new ApiError(400, 'SECRET_VALUE_REQUIRED', 'A secret value is required')
  }
  if (typeof value !== 'string' && typeof value !== 'object') {
    throw new ApiError(400, 'INVALID_SECRET_VALUE', 'Secret value must be a string or a JSON object')
  }
}

export function assertSecretDescription(description) {
  if (description !== undefined && typeof description !== 'string') {
    throw new ApiError(400, 'INVALID_DESCRIPTION', 'Description must be a string')
  }
}
