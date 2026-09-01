import {
  LambdaClient,
  ListFunctionsCommand,
  GetFunctionCommand,
  GetFunctionConfigurationCommand,
  InvokeCommand,
  UpdateFunctionConfigurationCommand,
  GetPolicyCommand,
  ListVersionsByFunctionCommand,
  ListAliasesCommand,
  ListEventSourceMappingsCommand,
  GetFunctionUrlConfigCommand,
  GetFunctionConcurrencyCommand,
  ListTagsCommand,
} from '@aws-sdk/client-lambda'
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts'
import { fromIni } from '@aws-sdk/credential-providers'
import { AWS_REGION, LAMBDA_PROFILE } from '../../config/aws.js'
import JSZip from 'jszip'

const credentials = fromIni({ profile: LAMBDA_PROFILE })
const lambdaClient = new LambdaClient({ region: AWS_REGION, credentials })
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
      name: 'list_functions',
      description: 'List all Lambda functions in the account with their runtime, memory, timeout, and state. Always call this first when the user mentions a function by name — use the returned names to fuzzy-match what they probably meant.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },

  // ── inspect ──
  {
    type: 'function',
    function: {
      name: 'get_function_config',
      description: 'Get the configuration for a single function: runtime, handler, timeout, memory, environment variables, layers, VPC config.',
      parameters: {
        type: 'object',
        properties: { functionName: { type: 'string', description: 'Exact function name from list_functions.' } },
        required: ['functionName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_function_code',
      description: 'Download and extract the source code of a function\'s main handler file. Use this to inspect what the function actually does.',
      parameters: {
        type: 'object',
        properties: { functionName: { type: 'string', description: 'Exact function name from list_functions.' } },
        required: ['functionName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_resource_policy',
      description: 'Get the resource-based policy for a function — shows which AWS accounts, services, or principals are allowed to invoke it. Use this to diagnose cross-account or trigger permission issues. Returns no policy if none is attached.',
      parameters: {
        type: 'object',
        properties: { functionName: { type: 'string', description: 'Exact function name from list_functions.' } },
        required: ['functionName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_versions',
      description: 'List all published versions of a function, including $LATEST.',
      parameters: {
        type: 'object',
        properties: { functionName: { type: 'string', description: 'Exact function name from list_functions.' } },
        required: ['functionName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_aliases',
      description: 'List aliases for a function (e.g. prod, staging) and which version each points to.',
      parameters: {
        type: 'object',
        properties: { functionName: { type: 'string', description: 'Exact function name from list_functions.' } },
        required: ['functionName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_event_source_mappings',
      description: 'List event source mappings (SQS, DynamoDB Streams, Kinesis, etc.) that trigger this function. Use this when the user asks why a function isn\'t being triggered, or what triggers it.',
      parameters: {
        type: 'object',
        properties: { functionName: { type: 'string', description: 'Exact function name from list_functions.' } },
        required: ['functionName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_function_url',
      description: 'Get the public Function URL (HTTP endpoint) configured for a function, if any.',
      parameters: {
        type: 'object',
        properties: { functionName: { type: 'string', description: 'Exact function name from list_functions.' } },
        required: ['functionName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_reserved_concurrency',
      description: 'Get the reserved concurrency setting for a function. Use this when the user reports throttling.',
      parameters: {
        type: 'object',
        properties: { functionName: { type: 'string', description: 'Exact function name from list_functions.' } },
        required: ['functionName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_tags',
      description: 'List the resource tags on a function.',
      parameters: {
        type: 'object',
        properties: { functionName: { type: 'string', description: 'Exact function name from list_functions.' } },
        required: ['functionName'],
      },
    },
  },

  // ── act ──
  {
    type: 'function',
    function: {
      name: 'invoke_function',
      description: 'Synchronously invoke a function with a JSON payload and return its response, status code, error (if any), and the tail of its CloudWatch logs from that invocation. This is the primary way to test a function or diagnose why it is failing — call it with a representative or empty payload rather than guessing from config alone.',
      parameters: {
        type: 'object',
        properties: {
          functionName: { type: 'string', description: 'Exact function name from list_functions.' },
          payload: { type: 'object', description: 'JSON payload to send as the event. Omit or send {} if unsure.' },
        },
        required: ['functionName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_function_config',
      description: 'Update a function\'s timeout, memory size, description, or environment variables.',
      parameters: {
        type: 'object',
        properties: {
          functionName: { type: 'string', description: 'Exact function name from list_functions.' },
          timeout: { type: 'number', description: 'New timeout in seconds.' },
          memorySize: { type: 'number', description: 'New memory size in MB.' },
          description: { type: 'string', description: 'New description.' },
          environment: { type: 'object', description: 'Full replacement map of environment variables (Lambda replaces the whole set, not a merge).' },
        },
        required: ['functionName'],
      },
    },
  },
]

// ─── helpers ─────────────────────────────────────────────────────────────────

async function paginateLambda(sendFn, resultKey) {
  const items = []
  let marker
  do {
    const res = await sendFn(marker)
    items.push(...(res[resultKey] ?? []))
    marker = res.NextMarker
  } while (marker)
  return items
}

async function extractCodeFromZip(zipBuffer) {
  try {
    const zip = new JSZip()
    await zip.loadAsync(zipBuffer)

    const files = {}
    for (const [filename, file] of Object.entries(zip.files)) {
      if (!file.dir) files[filename] = await file.async('text')
    }

    const pythonFile = Object.keys(files).find((f) => f.endsWith('.py'))
    const jsFile = Object.keys(files).find((f) => f.endsWith('.js'))
    const mainFile = pythonFile || jsFile || Object.keys(files)[0]

    return files[mainFile] || 'Unable to extract code'
  } catch (e) {
    return `Unable to extract code from ZIP: ${e.message}`
  }
}

// ─── tool implementations ────────────────────────────────────────────────────

async function getCallerIdentity() {
  try {
    const res = await stsClient.send(new GetCallerIdentityCommand({}))
    return { accountId: res.Account, userId: res.UserId, arn: res.Arn }
  } catch (e) { return { error: e.message } }
}

async function listFunctions() {
  const functions = await paginateLambda(
    (marker) => lambdaClient.send(new ListFunctionsCommand({ Marker: marker, MaxItems: 50 })),
    'Functions'
  )
  return functions.map((f) => ({
    name: f.FunctionName,
    runtime: f.Runtime,
    memorySize: f.MemorySize,
    timeout: f.Timeout,
    state: f.State,
    lastModified: f.LastModified,
    description: f.Description || '',
  }))
}

async function getFunctionConfig(functionName) {
  try {
    const c = await lambdaClient.send(new GetFunctionConfigurationCommand({ FunctionName: functionName }))
    return {
      functionName: c.FunctionName,
      description: c.Description || '',
      runtime: c.Runtime,
      handler: c.Handler,
      role: c.Role,
      timeout: c.Timeout,
      memorySize: c.MemorySize,
      environment: c.Environment?.Variables || {},
      layers: c.Layers?.map((l) => l.Arn) || [],
      vpcConfig: c.VpcConfig?.VpcId ? { vpcId: c.VpcConfig.VpcId, subnetIds: c.VpcConfig.SubnetIds, securityGroupIds: c.VpcConfig.SecurityGroupIds } : null,
    }
  } catch (e) { return { error: e.message } }
}

async function getFunctionCode(functionName) {
  try {
    const result = await lambdaClient.send(new GetFunctionCommand({ FunctionName: functionName }))
    if (!result.Code?.Location) return { error: 'No code location returned' }
    const codeRes = await fetch(result.Code.Location)
    if (!codeRes.ok) return { error: `Failed to download code: ${codeRes.status}` }
    const buffer = await codeRes.arrayBuffer()
    const code = await extractCodeFromZip(Buffer.from(buffer))
    return { code: code.slice(0, 8000) }
  } catch (e) { return { error: e.message } }
}

async function getResourcePolicy(functionName) {
  try {
    const res = await lambdaClient.send(new GetPolicyCommand({ FunctionName: functionName }))
    return { policy: JSON.parse(res.Policy) }
  } catch (e) {
    if (e.name === 'ResourceNotFoundException') return { policy: null, note: 'No resource-based policy attached.' }
    return { error: e.message }
  }
}

async function listVersions(functionName) {
  try {
    const versions = await paginateLambda(
      (marker) => lambdaClient.send(new ListVersionsByFunctionCommand({ FunctionName: functionName, Marker: marker })),
      'Versions'
    )
    return versions.map((v) => ({ version: v.Version, lastModified: v.LastModified, description: v.Description || '' }))
  } catch (e) { return { error: e.message } }
}

async function listAliases(functionName) {
  try {
    const aliases = await paginateLambda(
      (marker) => lambdaClient.send(new ListAliasesCommand({ FunctionName: functionName, Marker: marker })),
      'Aliases'
    )
    return aliases.map((a) => ({ name: a.Name, functionVersion: a.FunctionVersion, description: a.Description || '' }))
  } catch (e) { return { error: e.message } }
}

async function listEventSourceMappings(functionName) {
  try {
    const mappings = await paginateLambda(
      (marker) => lambdaClient.send(new ListEventSourceMappingsCommand({ FunctionName: functionName, Marker: marker })),
      'EventSourceMappings'
    )
    return mappings.map((m) => ({
      uuid: m.UUID,
      eventSourceArn: m.EventSourceArn,
      state: m.State,
      lastModified: m.LastModified,
      batchSize: m.BatchSize,
    }))
  } catch (e) { return { error: e.message } }
}

async function getFunctionUrl(functionName) {
  try {
    const res = await lambdaClient.send(new GetFunctionUrlConfigCommand({ FunctionName: functionName }))
    return { url: res.FunctionUrl, authType: res.AuthType, createdAt: res.CreationTime }
  } catch (e) {
    if (e.name === 'ResourceNotFoundException') return { url: null, note: 'No Function URL configured.' }
    return { error: e.message }
  }
}

async function getReservedConcurrency(functionName) {
  try {
    const res = await lambdaClient.send(new GetFunctionConcurrencyCommand({ FunctionName: functionName }))
    return { reservedConcurrentExecutions: res.ReservedConcurrentExecutions ?? null }
  } catch (e) { return { error: e.message } }
}

async function listTags(functionName) {
  try {
    const cfg = await lambdaClient.send(new GetFunctionConfigurationCommand({ FunctionName: functionName }))
    const res = await lambdaClient.send(new ListTagsCommand({ Resource: cfg.FunctionArn }))
    return { tags: res.Tags || {} }
  } catch (e) { return { error: e.message } }
}

async function invokeFunction(functionName, payload) {
  try {
    const params = {
      FunctionName: functionName,
      InvocationType: 'RequestResponse',
      LogType: 'Tail',
      Payload: JSON.stringify(payload ?? {}),
    }
    const result = await lambdaClient.send(new InvokeCommand(params))
    const decodedLogs = result.LogResult ? Buffer.from(result.LogResult, 'base64').toString('utf8') : null
    return {
      statusCode: result.StatusCode,
      functionError: result.FunctionError || null,
      payload: result.Payload ? JSON.parse(Buffer.from(result.Payload).toString('utf8')) : null,
      logs: decodedLogs ? decodedLogs.slice(-4000) : null,
    }
  } catch (e) { return { error: e.message } }
}

async function updateFunctionConfig(functionName, updates) {
  try {
    const params = { FunctionName: functionName }
    if (updates.timeout !== undefined) params.Timeout = updates.timeout
    if (updates.memorySize !== undefined) params.MemorySize = updates.memorySize
    if (updates.description !== undefined) params.Description = updates.description
    if (updates.environment !== undefined) params.Environment = { Variables: updates.environment }

    const result = await lambdaClient.send(new UpdateFunctionConfigurationCommand(params))
    return {
      updated: true,
      functionName: result.FunctionName,
      timeout: result.Timeout,
      memorySize: result.MemorySize,
      description: result.Description || '',
      environment: result.Environment?.Variables || {},
    }
  } catch (e) { return { error: e.message } }
}

export async function executeTool(name, args) {
  switch (name) {
    case 'get_caller_identity':          return getCallerIdentity()
    case 'list_functions':                return listFunctions()
    case 'get_function_config':           return getFunctionConfig(args.functionName)
    case 'get_function_code':             return getFunctionCode(args.functionName)
    case 'get_resource_policy':           return getResourcePolicy(args.functionName)
    case 'list_versions':                 return listVersions(args.functionName)
    case 'list_aliases':                  return listAliases(args.functionName)
    case 'list_event_source_mappings':    return listEventSourceMappings(args.functionName)
    case 'get_function_url':              return getFunctionUrl(args.functionName)
    case 'get_reserved_concurrency':      return getReservedConcurrency(args.functionName)
    case 'list_tags':                     return listTags(args.functionName)
    case 'invoke_function':               return invokeFunction(args.functionName, args.payload)
    case 'update_function_config':        return updateFunctionConfig(args.functionName, args)
    default:
      return { error: `Unknown tool: ${name}` }
  }
}
