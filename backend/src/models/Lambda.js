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

export function toInvocation(result) {
  return {
    statusCode: result.StatusCode,
    executedVersion: result.ExecutedVersion,
    functionError: result.FunctionError || null,
    logResult: result.LogResult || null,
    payload: result.Payload ? JSON.parse(result.Payload) : null,
  }
}
