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

export function assertDeployEdits(edits) {
  if (!edits || typeof edits !== 'object' || Array.isArray(edits) || Object.keys(edits).length === 0) {
    throw new ApiError(400, 'EDITS_REQUIRED', 'At least one file edit is required')
  }
  for (const [path, content] of Object.entries(edits)) {
    if (typeof path !== 'string' || !path.trim()) {
      throw new ApiError(400, 'INVALID_EDIT_PATH', 'Every edit must have a non-empty file path')
    }
    if (typeof content !== 'string') {
      throw new ApiError(400, 'INVALID_EDIT_CONTENT', `Content for "${path}" must be a string`)
    }
  }
}

export function assertLayerArns(layerArns) {
  if (!Array.isArray(layerArns) || layerArns.some((a) => typeof a !== 'string' || !a.trim())) {
    throw new ApiError(400, 'INVALID_LAYER_ARNS', 'layerArns must be an array of ARN strings')
  }
}

export function assertLayerUpload(body, file) {
  if (!body.layerName || typeof body.layerName !== 'string' || !body.layerName.trim()) {
    throw new ApiError(400, 'LAYER_NAME_REQUIRED', 'A layer name is required')
  }
  if (!file || !file.buffer || !file.buffer.length) {
    throw new ApiError(400, 'LAYER_ZIP_REQUIRED', 'A zip file is required')
  }
}
