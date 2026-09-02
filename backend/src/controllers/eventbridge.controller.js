import * as eventbridgeService from '../services/eventbridge.service.js'
import { assertEventBusName, assertRuleName } from '../validators/eventbridge.validator.js'

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
  try {
    const env = resolveEnv(req)
    eventbridgeService.setClientForEnv(env)
    const buses = await eventbridgeService.listEventBuses()
    res.json({ success: true, data: { buses } })
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } })
  }
}

export async function describeEventBus(req, res) {
  try {
    const env = resolveEnv(req)
    eventbridgeService.setClientForEnv(env)
    const { eventBusName } = req.params
    const bus = await eventbridgeService.describeEventBus(eventBusName || 'default')
    if (!bus) {
      return res.status(404).json({ success: false, error: { message: 'Event bus not found' } })
    }
    res.json({ success: true, data: bus })
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } })
  }
}

export async function listRules(req, res) {
  try {
    const env = resolveEnv(req)
    eventbridgeService.setClientForEnv(env)
    const { eventBusName } = req.params
    const rules = await eventbridgeService.listRules(eventBusName || 'default')
    res.json({ success: true, data: { rules } })
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } })
  }
}

export async function describeRule(req, res) {
  try {
    const env = resolveEnv(req)
    eventbridgeService.setClientForEnv(env)
    const { eventBusName, ruleName } = req.params
    assertRuleName(ruleName)
    const rule = await eventbridgeService.describeRule(ruleName, eventBusName || 'default')
    if (!rule) {
      return res.status(404).json({ success: false, error: { message: 'Rule not found' } })
    }
    res.json({ success: true, data: rule })
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } })
  }
}

export async function listTargets(req, res) {
  try {
    const env = resolveEnv(req)
    eventbridgeService.setClientForEnv(env)
    const { eventBusName, ruleName } = req.params
    assertRuleName(ruleName)
    const targets = await eventbridgeService.listTargets(ruleName, eventBusName || 'default')
    res.json({ success: true, data: { targets } })
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } })
  }
}
