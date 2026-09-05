import {
  ListEventBusesCommand,
  DescribeEventBusCommand,
  ListRulesCommand,
  DescribeRuleCommand,
  ListTargetsByRuleCommand,
  EnableRuleCommand,
  DisableRuleCommand,
} from '@aws-sdk/client-eventbridge'
import { getEventBridgeClientForEnv } from '../clients/index.js'
import { AWS_REGION, EVENTBRIDGE_PROFILE } from '../config/aws.js'
import { toEventBus, toRule, toTarget } from '../models/EventBridge.js'

let contextClient = null

function setContextClient(client) {
  contextClient = client
}

function getClient() {
  if (!contextClient) throw new Error('EventBridge client not initialized')
  return contextClient
}

export function setClientForEnv(env) {
  const client = getEventBridgeClientForEnv(env)
  setContextClient(client)
  return { env, profile: EVENTBRIDGE_PROFILE, region: AWS_REGION }
}

/**
 * Runs a bounded number of requests at once.
 *
 * Building the fleet view needs one ListTargetsByRule per rule, and EventBridge
 * throttles at a low rate. Six in flight keeps an account with a hundred rules
 * responsive without tripping the API.
 */
async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length)
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++
      results[index] = await fn(items[index], index)
    }
  })
  await Promise.all(workers)
  return results
}

export async function listEventBuses() {
  const buses = []
  let nextToken
  do {
    const out = await getClient().send(new ListEventBusesCommand({ NextToken: nextToken, Limit: 100 }))
    buses.push(...(out.EventBuses ?? []))
    nextToken = out.NextToken
  } while (nextToken)
  return buses.map(toEventBus)
}

export async function describeEventBus(eventBusName = 'default') {
  try {
    const result = await getClient().send(new DescribeEventBusCommand({ Name: eventBusName }))
    return result ? toEventBus(result) : null
  } catch (e) {
    if (e.name === 'ResourceNotFoundException') return null
    throw e
  }
}

export async function listRules(eventBusName = 'default') {
  const rules = []
  let nextToken
  do {
    const out = await getClient().send(
      new ListRulesCommand({ EventBusName: eventBusName, NextToken: nextToken, Limit: 100 })
    )
    rules.push(...(out.Rules ?? []))
    nextToken = out.NextToken
  } while (nextToken)
  return rules.map(toRule)
}

/**
 * Every rule in the account, on every bus, with its targets attached.
 *
 * Rules are the unit of work in EventBridge — a bus is just a namespace — but
 * ListRules is per-bus, and a rule's targets are a second call again. Doing that
 * fan-out here means the overview loads from one request instead of the browser
 * firing 1 + buses + rules requests and rendering in waves.
 *
 * A rule whose targets cannot be read (a permission gap on one bus, say) keeps
 * its place in the list with targets: null, so the UI can say "unknown" rather
 * than showing it as a rule with no targets — which is a real and different fault.
 */
export async function listAllRules() {
  const buses = await listEventBuses()

  const perBus = await mapWithConcurrency(buses, 6, async (bus) => {
    try {
      return await listRules(bus.name)
    } catch {
      return []
    }
  })

  const rules = perBus.flat()

  const withTargets = await mapWithConcurrency(rules, 6, async (rule) => {
    try {
      const targets = await listTargets(rule.name, rule.eventBusName)
      return { ...rule, targets, targetCount: targets.length }
    } catch {
      return { ...rule, targets: null, targetCount: null }
    }
  })

  return { rules: withTargets, buses }
}

export async function describeRule(ruleName, eventBusName = 'default') {
  try {
    const result = await getClient().send(
      new DescribeRuleCommand({ Name: ruleName, EventBusName: eventBusName })
    )
    return result ? toRule(result) : null
  } catch (e) {
    if (e.name === 'ResourceNotFoundException') return null
    throw e
  }
}

export async function listTargets(ruleName, eventBusName = 'default') {
  const targets = []
  let nextToken
  do {
    const out = await getClient().send(
      new ListTargetsByRuleCommand({
        Rule: ruleName,
        EventBusName: eventBusName,
        NextToken: nextToken,
        Limit: 100,
      })
    )
    targets.push(...(out.Targets ?? []))
    nextToken = out.NextToken
  } while (nextToken)
  return targets.map(toTarget)
}

/**
 * Enabling and disabling are the only writes this module makes. Both are
 * reversible and both take effect on the next matching event, which is why the
 * updated rule is read back and returned: the caller shows the state AWS
 * actually holds rather than the state it assumed.
 */
export async function setRuleState(ruleName, eventBusName = 'default', enabled) {
  const Command = enabled ? EnableRuleCommand : DisableRuleCommand
  await getClient().send(new Command({ Name: ruleName, EventBusName: eventBusName }))
  return describeRule(ruleName, eventBusName)
}
