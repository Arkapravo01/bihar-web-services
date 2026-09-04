export function toApiSummary(api) {
  return {
    id: api.id,
    name: api.name,
    description: api.description || null,
    createdDate: api.createdDate ? new Date(api.createdDate).toISOString() : null,
    endpointTypes: api.endpointConfiguration?.types ?? [],
    tags: api.tags ?? {},
  }
}

export function toStage(stage) {
  return {
    stageName: stage.stageName,
    deploymentId: stage.deploymentId || null,
    description: stage.description || null,
    createdDate: stage.createdDate ? new Date(stage.createdDate).toISOString() : null,
    lastUpdatedDate: stage.lastUpdatedDate ? new Date(stage.lastUpdatedDate).toISOString() : null,
    loggingLevel: stage.methodSettings?.['*/*']?.loggingLevel ?? null,
    metricsEnabled: stage.methodSettings?.['*/*']?.metricsEnabled ?? false,
    throttlingBurstLimit: stage.defaultRouteSettings?.throttlingBurstLimit ?? stage.methodSettings?.['*/*']?.throttlingBurstLimit ?? null,
    throttlingRateLimit: stage.defaultRouteSettings?.throttlingRateLimit ?? stage.methodSettings?.['*/*']?.throttlingRateLimit ?? null,
    cacheEnabled: stage.methodSettings?.['*/*']?.cachingEnabled ?? false,
  }
}

export function toResource(resource) {
  return {
    id: resource.id,
    path: resource.path,
    parentId: resource.parentId || null,
    methods: Object.keys(resource.resourceMethods ?? {}),
  }
}

export function toDeployment(dep) {
  return {
    id: dep.id,
    description: dep.description || null,
    createdDate: dep.createdDate ? new Date(dep.createdDate).toISOString() : null,
  }
}
