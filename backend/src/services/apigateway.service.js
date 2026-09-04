import {
  GetRestApisCommand,
  GetRestApiCommand,
  GetStagesCommand,
  GetResourcesCommand,
  GetDeploymentsCommand,
  GetMethodCommand,
  TestInvokeMethodCommand,
} from '@aws-sdk/client-api-gateway'
import { getApiGatewayClientForEnv } from '../clients/index.js'
import { AWS_REGION, APIGATEWAY_PROFILE } from '../config/aws.js'
import { toApiSummary, toStage, toResource, toDeployment } from '../models/ApiGateway.js'

let contextClient = null

function setContextClient(client) {
  contextClient = client
}

function getClient() {
  if (!contextClient) throw new Error('API Gateway client not initialized')
  return contextClient
}

export function setClientForEnv(env) {
  setContextClient(getApiGatewayClientForEnv(env))
  return { env, profile: APIGATEWAY_PROFILE, region: AWS_REGION }
}

export async function listApis() {
  const apis = []
  let position
  do {
    const out = await getClient().send(new GetRestApisCommand({ limit: 100, position }))
    apis.push(...(out.items ?? []))
    position = out.position
  } while (position)
  return apis.map(toApiSummary)
}

export async function getApiDetail(apiId) {
  try {
    const out = await getClient().send(new GetRestApiCommand({ restApiId: apiId }))
    return toApiSummary(out)
  } catch (e) {
    if (e.name === 'NotFoundException') return null
    throw e
  }
}

export async function listStages(apiId) {
  const out = await getClient().send(new GetStagesCommand({ restApiId: apiId }))
  return (out.item ?? []).map(toStage)
}

export async function listResources(apiId) {
  const resources = []
  let position
  do {
    const out = await getClient().send(new GetResourcesCommand({ restApiId: apiId, limit: 100, position, embed: ['methods'] }))
    resources.push(...(out.items ?? []))
    position = out.position
  } while (position)
  return resources.map((r) => ({
    ...toResource(r),
    methodDetails: Object.fromEntries(
      Object.entries(r.resourceMethods ?? {}).map(([method, m]) => [
        method,
        { authorizationType: m.authorizationType ?? null, apiKeyRequired: !!m.apiKeyRequired, requestParameters: m.requestParameters ?? {} },
      ])
    ),
  }))
}

export async function getMethod(apiId, resourceId, httpMethod) {
  try {
    const out = await getClient().send(new GetMethodCommand({ restApiId: apiId, resourceId, httpMethod: httpMethod.toUpperCase() }))
    return {
      httpMethod: out.httpMethod,
      authorizationType: out.authorizationType,
      apiKeyRequired: !!out.apiKeyRequired,
      requestParameters: out.requestParameters ?? {},
      operationName: out.operationName ?? null,
    }
  } catch (e) {
    if (e.name === 'NotFoundException') return null
    throw e
  }
}

export async function testInvokeMethod({ apiId, resourceId, httpMethod, pathWithQueryString, body, headers }) {
  const out = await getClient().send(new TestInvokeMethodCommand({
    restApiId: apiId,
    resourceId,
    httpMethod: httpMethod.toUpperCase(),
    pathWithQueryString: pathWithQueryString || '/',
    body: body || '',
    headers: headers || {},
  }))
  return {
    status: out.status,
    body: out.body ?? null,
    headers: out.headers ?? {},
    log: out.log ?? null,
    latency: out.latency ?? null,
  }
}

export async function listDeployments(apiId) {
  const deployments = []
  let position
  do {
    const out = await getClient().send(new GetDeploymentsCommand({ restApiId: apiId, limit: 100, position }))
    deployments.push(...(out.items ?? []))
    position = out.position
  } while (position)
  return deployments.map(toDeployment)
}
