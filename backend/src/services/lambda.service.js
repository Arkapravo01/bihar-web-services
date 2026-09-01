import {
  ListFunctionsCommand,
  GetFunctionCommand,
  GetFunctionConfigurationCommand,
  InvokeCommand,
  UpdateFunctionConfigurationCommand,
  UpdateFunctionCodeCommand,
  ListLayersCommand,
  PublishLayerVersionCommand,
} from '@aws-sdk/client-lambda'
import { getLambdaClientForEnv } from '../clients/index.js'
import { AWS_REGION, LAMBDA_PROFILE } from '../config/aws.js'
import { toFunction, toFunctionConfig, toInvocation, toLayer } from '../models/Lambda.js'
import JSZip from 'jszip'

const MAX_INLINE_FILE_SIZE = 300 * 1024

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
    LogType: invocationType === 'RequestResponse' ? 'Tail' : undefined,
  }
  if (payload) {
    params.Payload = JSON.stringify(payload)
  }
  const result = await getClient().send(new InvokeCommand(params))
  return toInvocation(result)
}

export async function getFunctionCode(functionName) {
  try {
    const buffer = await downloadFunctionZip(functionName)
    if (!buffer) return null
    const code = await extractCodeFromZip(buffer)
    return code
  } catch (e) {
    if (e.name === 'ResourceNotFoundException') return null
    throw e
  }
}

export async function getFunctionFiles(functionName) {
  try {
    const buffer = await downloadFunctionZip(functionName)
    if (!buffer) return { files: [] }
    const zip = new JSZip()
    await zip.loadAsync(buffer)

    const files = []
    for (const [path, entry] of Object.entries(zip.files)) {
      if (entry.dir) continue
      const buf = await entry.async('nodebuffer')
      const size = buf.length
      const isBinary = size > MAX_INLINE_FILE_SIZE || isLikelyBinaryPath(path)
      const content = isBinary ? null : buf.toString('utf8')
      files.push({ path, size, isBinary, content })
    }
    files.sort((a, b) => a.path.localeCompare(b.path))
    return { files }
  } catch (e) {
    if (e.name === 'ResourceNotFoundException') return null
    console.error(`[lambda] getFunctionFiles error for ${functionName}:`, e.message)
    throw e
  }
}

export async function deployFunctionCode(functionName, edits) {
  const buffer = await downloadFunctionZip(functionName)
  if (!buffer) throw new Error('Could not download current function code')

  const zip = new JSZip()
  await zip.loadAsync(buffer)
  for (const [path, content] of Object.entries(edits)) {
    zip.file(path, content)
  }
  const newZipBuffer = await zip.generateAsync({ type: 'nodebuffer' })

  const result = await getClient().send(new UpdateFunctionCodeCommand({
    FunctionName: functionName,
    ZipFile: newZipBuffer,
  }))
  return {
    functionName: result.FunctionName,
    codeSize: result.CodeSize,
    lastModified: result.LastModified,
    state: result.State,
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

export async function setFunctionLayers(functionName, layerArns) {
  const result = await getClient().send(new UpdateFunctionConfigurationCommand({
    FunctionName: functionName,
    Layers: layerArns,
  }))
  return toFunctionConfig(result)
}

export async function listAvailableLayers() {
  const layers = []
  let marker
  do {
    const out = await getClient().send(new ListLayersCommand({ Marker: marker, MaxItems: 50 }))
    layers.push(...(out.Layers ?? []))
    marker = out.NextMarker
  } while (marker)
  return layers.map(toLayer)
}

export async function publishLayer({ layerName, description, compatibleRuntimes, zipBuffer }) {
  const result = await getClient().send(new PublishLayerVersionCommand({
    LayerName: layerName,
    Description: description || undefined,
    CompatibleRuntimes: compatibleRuntimes?.length ? compatibleRuntimes : undefined,
    Content: { ZipFile: zipBuffer },
  }))
  return {
    layerName,
    versionArn: result.LayerVersionArn,
    version: result.Version,
    createdDate: result.CreatedDate,
  }
}

async function downloadFunctionZip(functionName) {
  const result = await getClient().send(new GetFunctionCommand({ FunctionName: functionName }))
  if (!result.Code?.Location) return null
  const codeRes = await fetch(result.Code.Location)
  if (!codeRes.ok) throw new Error(`Failed to fetch code: ${codeRes.status}`)
  const buffer = await codeRes.arrayBuffer()
  return Buffer.from(buffer)
}

const BINARY_EXTENSIONS = new Set(['.pyc', '.so', '.zip', '.whl', '.png', '.jpg', '.jpeg', '.gif', '.woff', '.woff2', '.ttf', '.node'])

function isLikelyBinaryPath(path) {
  if (path.includes('__pycache__/') || path.includes('/node_modules/')) return true
  const dot = path.lastIndexOf('.')
  if (dot === -1) return false
  return BINARY_EXTENSIONS.has(path.slice(dot).toLowerCase())
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
