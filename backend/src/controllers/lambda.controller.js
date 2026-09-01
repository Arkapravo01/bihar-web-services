import * as lambdaService from '../services/lambda.service.js'
import {
  assertFunctionName,
  assertInvocationPayload,
  assertDeployEdits,
  assertLayerArns,
  assertLayerUpload,
} from '../validators/lambda.validator.js'

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

export async function getFunctionFiles(req, res) {
  try {
    const env = resolveEnv(req)
    lambdaService.setClientForEnv(env)
    const { functionName } = req.params
    const result = await lambdaService.getFunctionFiles(functionName)
    if (!result) {
      return res.json({ success: true, data: { files: [] } })
    }
    res.json({ success: true, data: result })
  } catch (err) {
    console.error(`[lambda] getFunctionFiles error for ${functionName}:`, err.message)
    res.status(500).json({ success: false, error: { message: err.message } })
  }
}

export async function deployFunctionCode(req, res) {
  try {
    const env = resolveEnv(req)
    lambdaService.setClientForEnv(env)
    const { functionName } = req.params
    const { edits } = req.body
    assertDeployEdits(edits)
    console.log(`[lambda] deploying ${functionName} with ${Object.keys(edits).length} edited file(s)`)
    const result = await lambdaService.deployFunctionCode(functionName, edits)
    res.json({ success: true, data: result })
  } catch (err) {
    console.error(`[lambda] deploy error:`, err.message)
    res.status(500).json({ success: false, error: { message: err.message } })
  }
}

export async function listLayers(req, res) {
  try {
    const env = resolveEnv(req)
    lambdaService.setClientForEnv(env)
    const layers = await lambdaService.listAvailableLayers()
    res.json({ success: true, data: { layers } })
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } })
  }
}

export async function publishLayer(req, res) {
  try {
    const env = resolveEnv(req)
    lambdaService.setClientForEnv(env)
    assertLayerUpload(req.body, req.file)
    const { layerName, description } = req.body
    const compatibleRuntimes = req.body.compatibleRuntimes
      ? req.body.compatibleRuntimes.split(',').map((r) => r.trim()).filter(Boolean)
      : []
    const result = await lambdaService.publishLayer({
      layerName,
      description,
      compatibleRuntimes,
      zipBuffer: req.file.buffer,
    })
    res.json({ success: true, data: result })
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } })
  }
}

export async function setFunctionLayers(req, res) {
  try {
    const env = resolveEnv(req)
    lambdaService.setClientForEnv(env)
    const { functionName } = req.params
    const { layerArns } = req.body
    assertLayerArns(layerArns)
    const config = await lambdaService.setFunctionLayers(functionName, layerArns)
    res.json({ success: true, data: config })
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } })
  }
}
