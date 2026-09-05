import {
  EventBridgeClient,
  ListEventBusesCommand,
  DescribeEventBusCommand,
  ListRulesCommand,
  DescribeRuleCommand,
  ListTargetsByRuleCommand,
} from '@aws-sdk/client-eventbridge'
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts'
import { fromIni } from '@aws-sdk/credential-providers'
import { AWS_REGION, EVENTBRIDGE_PROFILE } from '../../config/aws.js'

const credentials = fromIni({ profile: EVENTBRIDGE_PROFILE })
const eventbridgeClient = new EventBridgeClient({ region: AWS_REGION, credentials })
const stsClient = new STSClient({ region: AWS_REGION, credentials })

// ─── tool definitions ────────────────────────────────────────────────────────

export const toolDefinitions = [
  // ── identity ──
  {
    type: 'function',
    function: {
      name: 'get_caller_identity',
      description: 'Returns the AWS account ID and ARN of the credentials the agent is using. Call this first if a permission error occurs.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },

  // ── discovery ──
  {
    type: 'function',
    function: {
      name: 'list_event_buses',
      description: 'List all EventBridge event buses in the account.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_rules',
      description: 'List all rules on an event bus.',
      parameters: {
        type: 'object',
        properties: { eventBusName: { type: 'string', description: 'Event bus name (default: "default")' } },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_all_rules',
      description:
        'List every rule on every event bus in the account, each with its state, trigger and target count. Use this for fleet-wide questions ("which rules are disabled?", "which rules have no targets?", "what fires on a schedule?") instead of calling list_rules once per bus.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },

  // ── inspect ──
  {
    type: 'function',
    function: {
      name: 'describe_event_bus',
      description: 'Get detailed information about an event bus.',
      parameters: {
        type: 'object',
        properties: { eventBusName: { type: 'string', description: 'Event bus name (default: "default")' } },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'describe_rule',
      description: 'Get detailed information about a specific rule.',
      parameters: {
        type: 'object',
        properties: {
          ruleName: { type: 'string', description: 'Rule name' },
          eventBusName: { type: 'string', description: 'Event bus name (default: "default")' },
        },
        required: ['ruleName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_targets',
      description: 'List all targets for a specific rule.',
      parameters: {
        type: 'object',
        properties: {
          ruleName: { type: 'string', description: 'Rule name' },
          eventBusName: { type: 'string', description: 'Event bus name (default: "default")' },
        },
        required: ['ruleName'],
      },
    },
  },
]

// ─── implementations ────────────────────────────────────────────────────────

/** Bounded fan-out — EventBridge throttles low, so six requests at a time. */
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

async function getCallerIdentity() {
  try {
    const r = await stsClient.send(new GetCallerIdentityCommand({}))
    return { accountId: r.Account, userId: r.UserId, arn: r.Arn }
  } catch (e) {
    return { error: e.message }
  }
}

async function listEventBuses() {
  try {
    const buses = []
    let nextToken
    do {
      const out = await eventbridgeClient.send(new ListEventBusesCommand({ NextToken: nextToken, Limit: 100 }))
      buses.push(...(out.EventBuses ?? []))
      nextToken = out.NextToken
    } while (nextToken)

    return {
      buses: buses.map((b) => ({
        name: b.Name,
        arn: b.Arn,
        createdAt: b.CreationTime?.toISOString?.(),
      })),
    }
  } catch (e) {
    return { error: e.message }
  }
}

async function listRules(eventBusName = 'default') {
  try {
    const rules = []
    let nextToken
    do {
      const out = await eventbridgeClient.send(
        new ListRulesCommand({ EventBusName: eventBusName, NextToken: nextToken, Limit: 100 })
      )
      rules.push(...(out.Rules ?? []))
      nextToken = out.NextToken
    } while (nextToken)

    return {
      rules: rules.map((r) => ({
        name: r.Name,
        state: r.State,
        description: r.Description,
        eventPattern: r.EventPattern,
        scheduleExpression: r.ScheduleExpression,
      })),
    }
  } catch (e) {
    return { error: e.message }
  }
}

/**
 * The fleet in one call: every rule on every bus, with target counts.
 *
 * Target counts come from one ListTargetsByRule per rule, six at a time — enough
 * to answer "which rules drop the events they match" without the model having to
 * walk each rule itself and burn its tool-call budget on discovery.
 */
async function listAllRules() {
  try {
    const busList = await listEventBuses()
    if (busList.error) return busList

    const names = busList.buses.map((b) => b.name)
    const perBus = await mapWithConcurrency(names, 6, async (name) => {
      const out = await listRules(name)
      return (out.rules ?? []).map((r) => ({ ...r, eventBusName: name }))
    })
    const rules = perBus.flat()

    const withCounts = await mapWithConcurrency(rules, 6, async (rule) => {
      const out = await listTargets(rule.name, rule.eventBusName)
      return {
        ...rule,
        targetCount: out.targets ? out.targets.length : null,
        targetArns: out.targets ? out.targets.map((t) => t.arn) : null,
      }
    })

    return { ruleCount: withCounts.length, busCount: names.length, rules: withCounts }
  } catch (e) {
    return { error: e.message }
  }
}

async function describeEventBus(eventBusName = 'default') {
  try {
    const result = await eventbridgeClient.send(new DescribeEventBusCommand({ Name: eventBusName }))
    if (!result) return { error: 'Event bus not found' }

    return {
      bus: {
        name: result.Name,
        arn: result.Arn,
        createdAt: result.CreationTime?.toISOString?.(),
        policyText: result.Policy,
      },
    }
  } catch (e) {
    return { error: e.message }
  }
}

async function describeRule(ruleName, eventBusName = 'default') {
  try {
    const result = await eventbridgeClient.send(
      new DescribeRuleCommand({ Name: ruleName, EventBusName: eventBusName })
    )
    if (!result) return { error: 'Rule not found' }

    return {
      rule: {
        name: result.Name,
        arn: result.Arn,
        state: result.State,
        description: result.Description,
        eventPattern: result.EventPattern,
        scheduleExpression: result.ScheduleExpression,
        roleArn: result.RoleArn,
      },
    }
  } catch (e) {
    return { error: e.message }
  }
}

async function listTargets(ruleName, eventBusName = 'default') {
  try {
    const targets = []
    let nextToken
    do {
      const out = await eventbridgeClient.send(
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

    return {
      targets: targets.map((t) => ({
        arn: t.Arn,
        roleArn: t.RoleArn,
        retryPolicy: t.RetryPolicy,
        deadLetterConfig: t.DeadLetterConfig,
        input: t.Input,
      })),
    }
  } catch (e) {
    return { error: e.message }
  }
}

// ─── dispatcher ────────────────────────────────────────────────────────

export async function executeTool(name, args) {
  switch (name) {
    case 'get_caller_identity':
      return getCallerIdentity()
    case 'list_event_buses':
      return listEventBuses()
    case 'list_rules':
      return listRules(args.eventBusName)
    case 'list_all_rules':
      return listAllRules()
    case 'describe_event_bus':
      return describeEventBus(args.eventBusName)
    case 'describe_rule':
      return describeRule(args.ruleName, args.eventBusName)
    case 'list_targets':
      return listTargets(args.ruleName, args.eventBusName)
    default:
      return { error: `Unknown tool: ${name}` }
  }
}
