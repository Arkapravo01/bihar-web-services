import * as lambdaService from '../services/lambda.service.js'
import { assertFunctionName, assertInvocationPayload } from '../validators/lambda.validator.js'

function resolveEnv(req) {
  const env = req.query.env || 'qa'
  return env === 'prod' ? 'prod' : 'qa'
}

export function getEnv(req, res) {
  const env = resolveEnv(req)
  const envInfo = lambdaService.setClientForEnv(env)
  res.json({ success: true, data: envInfo })
}

export async function listFunctions(req, res) {
  try {
    const env = resolveEnv(req)
    lambdaService.setClientForEnv(env)
    const functions = await lambdaService.listFunctions()
    res.json({ success: true, data: { functions } })
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } })
  }
}

export async function getFunctionConfig(req, res) {
  try {
    const env = resolveEnv(req)
    lambdaService.setClientForEnv(env)
    const { functionName } = req.params
    const config = await lambdaService.getFunctionConfig(functionName)
    if (!config) {
      return res.status(404).json({ success: false, error: { message: 'Function not found' } })
    }
    res.json({ success: true, data: config })
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } })
  }
}

export async function getFunction(req, res) {
  try {
    const env = resolveEnv(req)
    lambdaService.setClientForEnv(env)
    const { functionName } = req.params
    const result = await lambdaService.getFunction(functionName)
    if (!result) {
      return res.status(404).json({ success: false, error: { message: 'Function not found' } })
    }
    res.json({ success: true, data: result })
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } })
  }
}

export async function invokeFunction(req, res) {
  try {
    const env = resolveEnv(req)
    lambdaService.setClientForEnv(env)
    const { functionName } = req.params
    const { payload, invocationType } = req.body
    assertFunctionName(functionName)
    assertInvocationPayload(payload)
    console.log(`[lambda] invoking ${functionName} with payload:`, JSON.stringify(payload).slice(0, 200))
    const result = await lambdaService.invokeFunction(functionName, payload, invocationType || 'RequestResponse')
    console.log(`[lambda] invoke result:`, JSON.stringify(result).slice(0, 300))
    res.json({ success: true, data: result })
  } catch (err) {
    console.error(`[lambda] invoke error:`, err.message)
    res.status(500).json({ success: false, error: { message: err.message } })
  }
}

export async function getFunctionCode(req, res) {
  try {
    const env = resolveEnv(req)
    lambdaService.setClientForEnv(env)
    const { functionName } = req.params
    const code = await lambdaService.getFunctionCode(functionName)
    if (!code) {
      return res.status(404).json({ success: false, error: { message: 'Code not found' } })
    }
    res.json({ success: true, data: { code } })
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } })
  }
}

export async function updateFunctionConfig(req, res) {
  try {
    const env = resolveEnv(req)
    lambdaService.setClientForEnv(env)
    const { functionName } = req.params
    const { timeout, memorySize, description, environment } = req.body
    const config = await lambdaService.updateFunctionConfig(functionName, { timeout, memorySize, description, environment })
    res.json({ success: true, data: config })
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } })
  }
}
