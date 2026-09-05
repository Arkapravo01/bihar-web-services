import { ApiError } from '../errors.js'

export { ApiError }

export function assertEventBusName(name) {
  if (!name) throw new ApiError(400, 'EVENTBRIDGE_BUS_NAME_REQUIRED', 'An event bus name is required')
}

export function assertRuleName(name) {
  if (!name) throw new ApiError(400, 'EVENTBRIDGE_RULE_NAME_REQUIRED', 'A rule name is required')
}

export function assertRuleArn(arn) {
  if (!arn) throw new ApiError(400, 'EVENTBRIDGE_RULE_ARN_REQUIRED', 'A rule ARN is required')
}

/**
 * The state change arrives as a boolean rather than a string so there is no
 * third possibility to interpret: a rule is either enabled or disabled.
 */
export function assertRuleEnabled(enabled) {
  if (typeof enabled !== 'boolean') {
    throw new ApiError(
      400,
      'EVENTBRIDGE_RULE_STATE_REQUIRED',
      'enabled must be true or false',
    )
  }
}

/**
 * Rules created by another AWS service are owned by it. AWS rejects the write,
 * but it rejects it with an opaque message, so the refusal is made here where it
 * can name the owning service.
 */
export function assertRuleNotManaged(rule) {
  if (rule?.managedBy) {
    throw new ApiError(
      409,
      'EVENTBRIDGE_RULE_MANAGED',
      `This rule is managed by ${rule.managedBy} and can only be changed through that service`,
    )
  }
}
