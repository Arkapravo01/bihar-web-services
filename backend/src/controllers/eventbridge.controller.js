import * as eventbridgeService from '../services/eventbridge.service.js'
import {
  ApiError,
  assertEventBusName,
  assertRuleEnabled,
  assertRuleName,
  assertRuleNotManaged,
} from '../validators/eventbridge.validator.js'

function resolveEnv(req) {
  const env = req.query.env || 'qa'
  return env === 'prod' ? 'prod' : 'qa'
}

export function getEnv(req, res) {
  const env = resolveEnv(req)
  const envInfo = eventbridgeService.setClientForEnv(env)
  res.json({ success: true, data: envInfo })
}

export async function listEventBuses(req, res) {
  const env = resolveEnv(req)
  eventbridgeService.setClientForEnv(env)
  const buses = await eventbridgeService.listEventBuses()
  res.json({ success: true, data: { buses } })
}

export async function describeEventBus(req, res) {
  const env = resolveEnv(req)
  eventbridgeService.setClientForEnv(env)
  const { eventBusName } = req.params
  assertEventBusName(eventBusName)
  const bus = await eventbridgeService.describeEventBus(eventBusName)
  if (!bus) throw new ApiError(404, 'EVENTBRIDGE_BUS_NOT_FOUND', `No event bus named ${eventBusName}`)
  res.json({ success: true, data: bus })
}

export async function listRules(req, res) {
  const env = resolveEnv(req)
  eventbridgeService.setClientForEnv(env)
  const { eventBusName } = req.params
  assertEventBusName(eventBusName)
  const rules = await eventbridgeService.listRules(eventBusName)
  res.json({ success: true, data: { rules } })
}

/** Every rule on every bus, targets included — what the overview reads. */
export async function listAllRules(req, res) {
  const env = resolveEnv(req)
  eventbridgeService.setClientForEnv(env)
  const { rules, buses } = await eventbridgeService.listAllRules()
  res.json({ success: true, data: { rules, buses } })
}

export async function describeRule(req, res) {
  const env = resolveEnv(req)
  eventbridgeService.setClientForEnv(env)
  const { eventBusName, ruleName } = req.params
  assertEventBusName(eventBusName)
  assertRuleName(ruleName)
  const rule = await eventbridgeService.describeRule(ruleName, eventBusName)
  if (!rule) throw new ApiError(404, 'EVENTBRIDGE_RULE_NOT_FOUND', `No rule named ${ruleName} on ${eventBusName}`)
  res.json({ success: true, data: rule })
}

export async function listTargets(req, res) {
  const env = resolveEnv(req)
  eventbridgeService.setClientForEnv(env)
  const { eventBusName, ruleName } = req.params
  assertEventBusName(eventBusName)
  assertRuleName(ruleName)
  const targets = await eventbridgeService.listTargets(ruleName, eventBusName)
  res.json({ success: true, data: { targets } })
}

/**
 * Turns a rule on or off. The rule is read first so a rule owned by another AWS
 * service is refused with an explanation instead of failing at the SDK, and the
 * rule as AWS now holds it is returned so the client re-renders from truth.
 */
export async function setRuleState(req, res) {
  const env = resolveEnv(req)
  eventbridgeService.setClientForEnv(env)
  const { eventBusName, ruleName } = req.params
  const { enabled } = req.body ?? {}
  assertEventBusName(eventBusName)
  assertRuleName(ruleName)
  assertRuleEnabled(enabled)

  const existing = await eventbridgeService.describeRule(ruleName, eventBusName)
  if (!existing) throw new ApiError(404, 'EVENTBRIDGE_RULE_NOT_FOUND', `No rule named ${ruleName} on ${eventBusName}`)
  assertRuleNotManaged(existing)

  const rule = await eventbridgeService.setRuleState(ruleName, eventBusName, enabled)
  res.json({ success: true, data: rule })
}
