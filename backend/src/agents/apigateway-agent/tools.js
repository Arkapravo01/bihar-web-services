import {
  APIGatewayClient,
  GetRestApisCommand,
  GetRestApiCommand,
  GetStagesCommand,
  GetResourcesCommand,
  GetDeploymentsCommand,
  GetIntegrationCommand,
  GetMethodCommand,
} from '@aws-sdk/client-api-gateway'
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts'
import { fromIni } from '@aws-sdk/credential-providers'
import { AWS_REGION, APIGATEWAY_PROFILE } from '../../config/aws.js'

const credentials = fromIni({ profile: APIGATEWAY_PROFILE })
const apigwClient = new APIGatewayClient({ region: AWS_REGION, credentials })
const stsClient = new STSClient({ region: AWS_REGION, credentials })

// ─── helpers ─────────────────────────────────────────────────────────────────

async function paginateItems(sendFn) {
  const items = []
  let position
  do {
    const res = await sendFn(position)
    items.push(...(res.items ?? []))
    position = res.position
  } while (position)
  return items
}

// ─── tool definitions ────────────────────────────────────────────────────────

export const toolDefinitions = [
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
      name: 'list_apis',
      description: 'List all REST APIs in the account with their ID, name, endpoint type, and creation date. Always call this first when the user mentions an API by name — use the returned names and IDs to fuzzy-match what they probably meant.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },

  // ── inspect ──
  {
    type: 'function',
    function: {
      name: 'get_api_detail',
      description: 'Get full metadata for a single REST API: name, description, endpoint type, created date.',
      parameters: {
        type: 'object',
        properties: { apiId: { type: 'string', description: 'Exact REST API ID from list_apis.' } },
        required: ['apiId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_stages',
      description: 'List the deployment stages for an API (e.g. dev, staging, prod) including throttle settings and cache configuration.',
      parameters: {
        type: 'object',
        properties: { apiId: { type: 'string', description: 'Exact REST API ID from list_apis.' } },
        required: ['apiId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_resources',
      description: 'List all resources (paths and HTTP methods) defined in a REST API. Use this to understand the full route structure of the API.',
      parameters: {
        type: 'object',
        properties: { apiId: { type: 'string', description: 'Exact REST API ID from list_apis.' } },
        required: ['apiId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_deployments',
      description: 'List the deployments for a REST API with their creation dates and descriptions.',
      parameters: {
        type: 'object',
        properties: { apiId: { type: 'string', description: 'Exact REST API ID from list_apis.' } },
        required: ['apiId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_method_integration',
      description: 'Get the backend integration for a specific resource + HTTP method — shows the Lambda ARN, HTTP endpoint, or service proxy the method calls, plus any request/response mapping templates.',
      parameters: {
        type: 'object',
        properties: {
          apiId:      { type: 'string', description: 'Exact REST API ID.' },
          resourceId: { type: 'string', description: 'Resource ID from list_resources.' },
          httpMethod: { type: 'string', description: 'HTTP method e.g. GET, POST, DELETE, ANY.' },
        },
        required: ['apiId', 'resourceId', 'httpMethod'],
      },
    },
  },
]

// ─── tool implementations ────────────────────────────────────────────────────

async function getCallerIdentity() {
  try {
    const res = await stsClient.send(new GetCallerIdentityCommand({}))
    return { accountId: res.Account, userId: res.UserId, arn: res.Arn }
  } catch (e) { return { error: e.message } }
}

async function listApis() {
  try {
    const items = await paginateItems((pos) =>
      apigwClient.send(new GetRestApisCommand({ limit: 100, position: pos }))
    )
    return {
      apis: items.map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description || null,
        endpointTypes: a.endpointConfiguration?.types ?? [],
        createdDate: a.createdDate ? new Date(a.createdDate).toISOString() : null,
      })),
    }
  } catch (e) { return { error: e.message } }
}

async function getApiDetail(apiId) {
  try {
    const a = await apigwClient.send(new GetRestApiCommand({ restApiId: apiId }))
    return {
      id: a.id,
      name: a.name,
      description: a.description || null,
      endpointTypes: a.endpointConfiguration?.types ?? [],
      createdDate: a.createdDate ? new Date(a.createdDate).toISOString() : null,
      tags: a.tags ?? {},
    }
  } catch (e) {
    if (e.name === 'NotFoundException') return { error: 'API not found' }
    return { error: e.message }
  }
}

async function listStages(apiId) {
  try {
    const out = await apigwClient.send(new GetStagesCommand({ restApiId: apiId }))
    return {
      stages: (out.item ?? []).map((s) => ({
        stageName: s.stageName,
        deploymentId: s.deploymentId || null,
        description: s.description || null,
        loggingLevel: s.methodSettings?.['*/*']?.loggingLevel ?? null,
        metricsEnabled: s.methodSettings?.['*/*']?.metricsEnabled ?? false,
        cacheEnabled: s.methodSettings?.['*/*']?.cachingEnabled ?? false,
        lastUpdatedDate: s.lastUpdatedDate ? new Date(s.lastUpdatedDate).toISOString() : null,
      })),
    }
  } catch (e) { return { error: e.message } }
}

async function listResources(apiId) {
  try {
    const items = await paginateItems((pos) =>
      apigwClient.send(new GetResourcesCommand({ restApiId: apiId, limit: 100, position: pos }))
    )
    return {
      resources: items.map((r) => ({
        id: r.id,
        path: r.path,
        parentId: r.parentId || null,
        methods: Object.keys(r.resourceMethods ?? {}),
      })),
    }
  } catch (e) { return { error: e.message } }
}

async function listDeployments(apiId) {
  try {
    const items = await paginateItems((pos) =>
      apigwClient.send(new GetDeploymentsCommand({ restApiId: apiId, limit: 100, position: pos }))
    )
    return {
      deployments: items.map((d) => ({
        id: d.id,
        description: d.description || null,
        createdDate: d.createdDate ? new Date(d.createdDate).toISOString() : null,
      })),
    }
  } catch (e) { return { error: e.message } }
}

async function getMethodIntegration(apiId, resourceId, httpMethod) {
  try {
    const integration = await apigwClient.send(new GetIntegrationCommand({
      restApiId: apiId,
      resourceId,
      httpMethod: httpMethod.toUpperCase(),
    }))
    return {
      type: integration.type,
      uri: integration.uri || null,
      httpMethod: integration.httpMethod || null,
      requestTemplates: integration.requestTemplates || {},
      passthroughBehavior: integration.passthroughBehavior || null,
      connectionType: integration.connectionType || null,
    }
  } catch (e) {
    if (e.name === 'NotFoundException') return { error: 'No integration found for this method.' }
    return { error: e.message }
  }
}

export async function executeTool(name, args) {
  switch (name) {
    case 'get_caller_identity':    return getCallerIdentity()
    case 'list_apis':               return listApis()
    case 'get_api_detail':          return getApiDetail(args.apiId)
    case 'list_stages':             return listStages(args.apiId)
    case 'list_resources':          return listResources(args.apiId)
    case 'list_deployments':        return listDeployments(args.apiId)
    case 'get_method_integration':  return getMethodIntegration(args.apiId, args.resourceId, args.httpMethod)
    default:
      return { error: `Unknown tool: ${name}` }
  }
}
