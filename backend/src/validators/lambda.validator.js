import { ApiError } from '../errors.js'

export function assertFunctionName(functionName) {
  if (!functionName || typeof functionName !== 'string' || !functionName.trim()) {
    throw new ApiError(400, 'FUNCTION_NAME_REQUIRED', 'Function name is required')
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(functionName)) {
    throw new ApiError(400, 'INVALID_FUNCTION_NAME', 'Function name can only contain alphanumeric chars, underscores, and hyphens')
  }
}

export function assertInvocationPayload(payload) {
  if (payload && typeof payload !== 'object') {
    throw new ApiError(400, 'INVALID_PAYLOAD', 'Payload must be a valid JSON object')
  }
}
