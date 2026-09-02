import {
  ListEventBusesCommand,
  DescribeEventBusCommand,
  ListRulesCommand,
  DescribeRuleCommand,
  ListTargetsByRuleCommand,
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
