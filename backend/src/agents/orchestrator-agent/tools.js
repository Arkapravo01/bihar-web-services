import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts'
import { fromIni } from '@aws-sdk/credential-providers'
import { AWS_REGION } from '../../config/aws.js'
import { icaChat } from '../icaClient.js'

const credentials = fromIni({ profile: 'default' })
const stsClient = new STSClient({ region: AWS_REGION, credentials })

const AGENT_REGISTRY = {
  lambda: { name: 'Lambda', description: 'Inspects Lambda functions, code, configuration, invocation, triggers, layers' },
  s3: { name: 'S3', description: 'Manages S3 buckets, objects, versioning, permissions, lifecycle, replication' },
  iam: { name: 'IAM', description: 'Manages IAM users, roles, policies, groups, access keys, MFA, permissions' },
  rds: { name: 'RDS', description: 'Manages RDS instances, databases, snapshots, backups, security, parameters' },
  cloudwatch: { name: 'CloudWatch', description: 'Analyzes CloudWatch logs, metrics, dashboards, alarms, log insights' },
  secrets: { name: 'Secrets Manager', description: 'Manages secrets, versioning, rotation, access policies' },
  report: { name: 'Report Agent', description: 'Runs Log Intelligence — analyzes real CloudWatch Logs across all discovered log groups, categorizes failures, and produces an operational report with evidence and CloudWatch deep links' },
}

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
      name: 'list_available_agents',
      description: 'List all available specialized agents and their capabilities. Call this to understand which agents are available for delegation.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },

  // ── delegation ──
  {
    type: 'function',
    function: {
      name: 'delegate_to_agent',
      description: 'Delegate an investigation query to a specialized agent. Returns the agent\'s findings, tool calls made, and history.',
      parameters: {
        type: 'object',
        properties: {
          agent_name: { type: 'string', description: 'Name of the agent to delegate to. One of: lambda, s3, iam, rds, cloudwatch, secrets' },
          query: { type: 'string', description: 'The investigation query to send to the agent' },
          context: { type: 'string', description: 'Optional context or constraints to guide the agent (e.g., "focus on production resources")' },
        },
        required: ['agent_name', 'query'],
      },
    },
  },
]

// ─── implementations ────────────────────────────────────────────────────────

async function getCallerIdentity() {
  try {
    const r = await stsClient.send(new GetCallerIdentityCommand({}))
    return { accountId: r.Account, userId: r.UserId, arn: r.Arn }
  } catch (e) {
    return { error: e.message }
  }
}

function listAvailableAgents() {
  return {
    agents: Object.entries(AGENT_REGISTRY).map(([id, info]) => ({
      id,
      name: info.name,
      description: info.description,
    })),
  }
}

async function delegateToAgent(agentName, query, context = null) {
  const agent = AGENT_REGISTRY[agentName]
  if (!agent) {
    return { error: `Unknown agent: ${agentName}. Available: ${Object.keys(AGENT_REGISTRY).join(', ')}` }
  }

  try {
    // Route query to the appropriate backend agent endpoint
    const response = await fetch(`http://localhost:${process.env.PORT || 8787}/api/agent/${agentName}/investigate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: context ? `${context}\n\n${query}` : query,
        history: [],
      }),
    })

    if (!response.ok) {
      return { error: `Agent ${agentName} failed: ${response.status} ${response.statusText}` }
    }

    const result = await response.json()
    if (!result.success) {
      return { error: result.error?.message || 'Agent returned an error' }
    }

    return {
      agent: agentName,
      reply: result.data.reply,
      tool_calls_made: result.data.tool_calls_made,
      status: 'success',
    }
  } catch (e) {
    return { error: `Failed to delegate to ${agentName}: ${e.message}` }
  }
}

// ─── dispatcher ────────────────────────────────────────────────────────

export async function executeTool(name, args) {
  switch (name) {
    case 'get_caller_identity':
      return getCallerIdentity()
    case 'list_available_agents':
      return listAvailableAgents()
    case 'delegate_to_agent':
      return delegateToAgent(args.agent_name, args.query, args.context)
    default:
      return { error: `Unknown tool: ${name}` }
  }
}
