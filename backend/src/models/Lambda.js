export function toFunction(awsFunc) {
  return {
    name: awsFunc.FunctionName,
    arn: awsFunc.FunctionArn,
    runtime: awsFunc.Runtime,
    role: awsFunc.Role,
    handler: awsFunc.Handler,
    codeSize: awsFunc.CodeSize,
    description: awsFunc.Description || '',
    timeout: awsFunc.Timeout,
    memorySize: awsFunc.MemorySize,
    lastModified: awsFunc.LastModified,
    codeLocation: awsFunc.CodeLocation,
    state: awsFunc.State,
    lastUpdateStatus: awsFunc.LastUpdateStatus,
  }
}

export function toFunctionConfig(config) {
  return {
    functionName: config.FunctionName,
    description: config.Description || '',
    runtime: config.Runtime,
    role: config.Role,
    handler: config.Handler,
    timeout: config.Timeout,
    memorySize: config.MemorySize,
    environment: config.Environment?.Variables || {},
    layers: config.Layers?.map((l) => ({ arn: l.Arn, codeSize: l.CodeSize })) || [],
  }
}

function decodePayload(payload) {
  if (!payload) return null
  const text = Buffer.from(payload).toString('utf8')
  try { return JSON.parse(text) } catch { return text }
}

export function toInvocation(result) {
  return {
    statusCode: result.StatusCode,
    executedVersion: result.ExecutedVersion,
    functionError: result.FunctionError || null,
    logResult: result.LogResult ? Buffer.from(result.LogResult, 'base64').toString('utf8') : null,
    payload: decodePayload(result.Payload),
  }
}

export function toLayer(layer) {
  const latest = layer.LatestMatchingVersion || {}
  return {
    name: layer.LayerName,
    versionArn: latest.LayerVersionArn,
    version: latest.Version,
    compatibleRuntimes: latest.CompatibleRuntimes || [],
    description: latest.Description || '',
  }
}
