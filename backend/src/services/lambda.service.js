import {
  ListFunctionsCommand,
  GetFunctionCommand,
  GetFunctionConfigurationCommand,
  InvokeCommand,
  UpdateFunctionConfigurationCommand,
} from '@aws-sdk/client-lambda'
import { getLambdaClientForEnv } from '../clients/index.js'
import { AWS_REGION, LAMBDA_PROFILE } from '../config/aws.js'
import { toFunction, toFunctionConfig, toInvocation } from '../models/Lambda.js'
import JSZip from 'jszip'

let contextClient = null

function setContextClient(client) {
  contextClient = client
}

function getClient() {
  if (!contextClient) throw new Error('Lambda client not initialized')
  return contextClient
}

export function setClientForEnv(env) {
  const client = getLambdaClientForEnv(env)
  setContextClient(client)
  return { env, profile: LAMBDA_PROFILE, region: AWS_REGION }
}

export async function listFunctions() {
  const functions = []
  let marker
  do {
    const out = await getClient().send(new ListFunctionsCommand({ Marker: marker, MaxItems: 50 }))
    functions.push(...(out.Functions ?? []))
    marker = out.NextMarker
  } while (marker)
  return functions.map(toFunction)
}

export async function getFunctionConfig(functionName) {
  try {
    const config = await getClient().send(new GetFunctionConfigurationCommand({ FunctionName: functionName }))
    return toFunctionConfig(config)
  } catch (e) {
    if (e.name === 'ResourceNotFoundException') return null
    throw e
  }
}

export async function getFunction(functionName) {
  try {
    const [configCmd, codeCmd] = await Promise.all([
      getClient().send(new GetFunctionConfigurationCommand({ FunctionName: functionName })),
      getClient().send(new GetFunctionCommand({ FunctionName: functionName })),
    ])
    return {
      config: toFunctionConfig(configCmd),
      codeLocation: codeCmd.Code?.Location || null,
      codeRepository: codeCmd.Code?.RepositoryType || null,
    }
  } catch (e) {
    if (e.name === 'ResourceNotFoundException') return null
    throw e
  }
}

export async function invokeFunction(functionName, payload = null, invocationType = 'RequestResponse') {
  const params = {
    FunctionName: functionName,
    InvocationType: invocationType,
  }
  if (payload) {
    params.Payload = JSON.stringify(payload)
  }
  const result = await getClient().send(new InvokeCommand(params))
  return toInvocation(result)
}

export async function getFunctionCode(functionName) {
  try {
    const result = await getClient().send(new GetFunctionCommand({ FunctionName: functionName }))
    if (!result.Code?.Location) return null
    const codeRes = await fetch(result.Code.Location)
    if (!codeRes.ok) throw new Error(`Failed to fetch code: ${codeRes.status}`)
    const buffer = await codeRes.arrayBuffer()
    const code = await extractCodeFromZip(Buffer.from(buffer))
    return code
  } catch (e) {
    if (e.name === 'ResourceNotFoundException') return null
    throw e
  }
}

export async function updateFunctionConfig(functionName, updates) {
  const params = { FunctionName: functionName }
  if (updates.timeout !== undefined) params.Timeout = updates.timeout
  if (updates.memorySize !== undefined) params.MemorySize = updates.memorySize
  if (updates.description !== undefined) params.Description = updates.description
  if (updates.environment !== undefined) params.Environment = { Variables: updates.environment }

  const result = await getClient().send(new UpdateFunctionConfigurationCommand(params))
  return toFunctionConfig(result)
}

async function extractCodeFromZip(zipBuffer) {
  try {
    const zip = new JSZip()
    await zip.loadAsync(zipBuffer)

    const files = {}
    for (const [filename, file] of Object.entries(zip.files)) {
      if (!file.dir) {
        files[filename] = await file.async('text')
      }
    }

    const pythonFile = Object.keys(files).find((f) => f.endsWith('.py'))
    const jsFile = Object.keys(files).find((f) => f.endsWith('.js'))
    const mainFile = pythonFile || jsFile || Object.keys(files)[0]

    return files[mainFile] || 'Unable to extract code'
  } catch (e) {
    console.error('ZIP extraction error:', e.message)
    return 'Unable to extract code from ZIP'
  }
}
