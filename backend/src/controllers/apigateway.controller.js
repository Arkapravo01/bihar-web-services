import * as apiGatewayService from '../services/apigateway.service.js'
import { assertApiId, assertStageName } from '../validators/apigateway.validator.js'

function resolveEnv(req) {
  const env = req.query.env || 'qa'
  return env === 'prod' ? 'prod' : 'qa'
}

export function getEnv(req, res) {
  const env = resolveEnv(req)
  const envInfo = apiGatewayService.setClientForEnv(env)
  res.json({ success: true, data: envInfo })
}

export async function listApis(req, res) {
  const env = resolveEnv(req)
  apiGatewayService.setClientForEnv(env)
  const apis = await apiGatewayService.listApis()
  res.json({ success: true, data: { apis } })
}

export async function getApiDetail(req, res) {
  const env = resolveEnv(req)
  apiGatewayService.setClientForEnv(env)
  const { apiId } = req.params
  assertApiId(apiId)
  const detail = await apiGatewayService.getApiDetail(apiId)
  if (!detail) {
    return res.status(404).json({ success: false, error: { message: 'REST API not found' } })
  }
  res.json({ success: true, data: detail })
}

export async function listStages(req, res) {
  const env = resolveEnv(req)
  apiGatewayService.setClientForEnv(env)
  const { apiId } = req.params
  assertApiId(apiId)
  const stages = await apiGatewayService.listStages(apiId)
  res.json({ success: true, data: { stages } })
}

export async function listResources(req, res) {
  const env = resolveEnv(req)
  apiGatewayService.setClientForEnv(env)
  const { apiId } = req.params
  assertApiId(apiId)
  const resources = await apiGatewayService.listResources(apiId)
  res.json({ success: true, data: { resources } })
}

export async function testInvokeMethod(req, res) {
  const env = resolveEnv(req)
  apiGatewayService.setClientForEnv(env)
  const { apiId, resourceId } = req.params
  const { httpMethod, pathWithQueryString, body, headers } = req.body
  assertApiId(apiId)
  if (!resourceId) return res.status(400).json({ success: false, error: { message: 'resourceId is required' } })
  if (!httpMethod) return res.status(400).json({ success: false, error: { message: 'httpMethod is required' } })
  const result = await apiGatewayService.testInvokeMethod({ apiId, resourceId, httpMethod, pathWithQueryString, body, headers })
  res.json({ success: true, data: result })
}

export async function listDeployments(req, res) {
  const env = resolveEnv(req)
  apiGatewayService.setClientForEnv(env)
  const { apiId } = req.params
  assertApiId(apiId)
  const deployments = await apiGatewayService.listDeployments(apiId)
  res.json({ success: true, data: { deployments } })
}
