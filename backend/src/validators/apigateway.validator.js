import { ApiError } from '../errors.js'
export { ApiError }

export function assertApiId(apiId) {
  if (!apiId || typeof apiId !== 'string' || !apiId.trim()) {
    throw new ApiError(400, 'API_ID_REQUIRED', 'A REST API ID is required')
  }
}

export function assertStageName(stageName) {
  if (!stageName || typeof stageName !== 'string' || !stageName.trim()) {
    throw new ApiError(400, 'STAGE_NAME_REQUIRED', 'A stage name is required')
  }
}
