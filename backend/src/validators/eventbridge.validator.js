import { ApiError } from '../errors.js'

export function assertEventBusName(name) {
  if (!name) throw new ApiError(400, 'EVENTBRIDGE_BUS_NAME_REQUIRED', 'An event bus name is required')
}

export function assertRuleName(name) {
  if (!name) throw new ApiError(400, 'EVENTBRIDGE_RULE_NAME_REQUIRED', 'A rule name is required')
}

export function assertRuleArn(arn) {
  if (!arn) throw new ApiError(400, 'EVENTBRIDGE_RULE_ARN_REQUIRED', 'A rule ARN is required')
}
