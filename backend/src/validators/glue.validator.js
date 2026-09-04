import { ApiError } from '../errors.js'

export function assertDatabaseName(name) {
  if (!name) throw new ApiError(400, 'GLUE_DATABASE_NAME_REQUIRED', 'Database name is required')
}

export function assertTableName(name) {
  if (!name) throw new ApiError(400, 'GLUE_TABLE_NAME_REQUIRED', 'Table name is required')
}

export function assertJobName(name) {
  if (!name) throw new ApiError(400, 'GLUE_JOB_NAME_REQUIRED', 'Job name is required')
}

export function assertCrawlerName(name) {
  if (!name) throw new ApiError(400, 'GLUE_CRAWLER_NAME_REQUIRED', 'Crawler name is required')
}

export function assertWorkflowName(name) {
  if (!name) throw new ApiError(400, 'GLUE_WORKFLOW_NAME_REQUIRED', 'Workflow name is required')
}
