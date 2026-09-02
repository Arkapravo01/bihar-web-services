import { ApiError } from '../errors.js'

export function assertClusterName(name) {
  if (!name) throw new ApiError(400, 'ECS_CLUSTER_NAME_REQUIRED', 'A cluster name is required')
}

export function assertServiceName(name) {
  if (!name) throw new ApiError(400, 'ECS_SERVICE_NAME_REQUIRED', 'A service name is required')
}

export function assertTaskArn(arn) {
  if (!arn) throw new ApiError(400, 'ECS_TASK_ARN_REQUIRED', 'A task ARN is required')
}

export function assertTaskDefinitionArn(arn) {
  if (!arn) throw new ApiError(400, 'ECS_TASK_DEF_ARN_REQUIRED', 'A task definition ARN is required')
}

export function assertDesiredCount(count) {
  if (typeof count !== 'number' || !Number.isInteger(count) || count < 0) {
    throw new ApiError(400, 'ECS_DESIRED_COUNT_INVALID', 'desiredCount must be a non-negative integer')
  }
}
