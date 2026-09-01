import { ApiError } from '../errors.js'

export { ApiError }

export function assertLogGroupName(logGroupName) {
  if (!logGroupName || typeof logGroupName !== 'string') {
    throw new ApiError(400, 'CW_LOG_GROUP_REQUIRED', 'A log group name is required')
  }
}

export function assertLogStreamName(logStreamName) {
  if (!logStreamName || typeof logStreamName !== 'string') {
    throw new ApiError(400, 'CW_LOG_STREAM_REQUIRED', 'A log stream name is required')
  }
}

export function assertQueryString(queryString) {
  if (!queryString || typeof queryString !== 'string') {
    throw new ApiError(400, 'CW_QUERY_REQUIRED', 'A query string is required')
  }
}

export function assertLogGroupNames(logGroupNames) {
  if (!Array.isArray(logGroupNames) || logGroupNames.length === 0) {
    throw new ApiError(400, 'CW_LOG_GROUP_NAMES_REQUIRED', 'logGroupNames must be a non-empty array')
  }
}
