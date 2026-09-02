export function toCluster(awsCluster) {
  return {
    name: awsCluster.clusterName,
    arn: awsCluster.clusterArn,
    status: awsCluster.status,
    registeredContainerInstancesCount: awsCluster.registeredContainerInstancesCount || 0,
    runningCount: awsCluster.runningCount || 0,
    pendingCount: awsCluster.pendingCount || 0,
    activeServicesCount: awsCluster.activeServicesCount || 0,
    attachments: awsCluster.attachments || [],
    tags: awsCluster.tags || [],
  }
}

export function toService(awsService) {
  return {
    name: awsService.serviceName,
    arn: awsService.serviceArn,
    status: awsService.status,
    clusterArn: awsService.clusterArn,
    taskDefinition: awsService.taskDefinition,
    desiredCount: awsService.desiredCount || 0,
    runningCount: awsService.runningCount || 0,
    pendingCount: awsService.pendingCount || 0,
    launchType: awsService.launchType,
    platformVersion: awsService.platformVersion,
    createdAt: awsService.createdAt?.toISOString?.(),
    updatedAt: awsService.updatedAt?.toISOString?.(),
  }
}

export function toTask(awsTask) {
  return {
    arn: awsTask.taskArn,
    clusterArn: awsTask.clusterArn,
    taskDefinitionArn: awsTask.taskDefinitionArn,
    status: awsTask.lastStatus,
    desiredStatus: awsTask.desiredStatus,
    launchType: awsTask.launchType,
    platformVersion: awsTask.platformVersion,
    createdAt: awsTask.createdAt?.toISOString?.(),
    startedAt: awsTask.startedAt?.toISOString?.(),
    stoppedAt: awsTask.stoppedAt?.toISOString?.(),
    containers: (awsTask.containers || []).map((c) => ({
      name: c.name,
      image: c.image,
      status: c.lastStatus,
      exitCode: c.exitCode,
      reason: c.reason,
    })),
  }
}

export function toTaskDefinition(awsTd) {
  return {
    family: awsTd.family,
    revision: awsTd.revision,
    arn: awsTd.taskDefinitionArn,
    status: awsTd.status,
    requiresCompatibilities: awsTd.requiresCompatibilities || [],
    cpu: awsTd.cpu,
    memory: awsTd.memory,
    networkMode: awsTd.networkMode,
    containerDefinitions: (awsTd.containerDefinitions || []).map((c) => ({
      name: c.name,
      image: c.image,
      memory: c.memory,
      cpu: c.cpu,
      essential: c.essential,
      portMappings: c.portMappings || [],
    })),
  }
}

export function toContainerInstance(awsCI) {
  return {
    arn: awsCI.containerInstanceArn,
    ec2InstanceId: awsCI.ec2InstanceId,
    status: awsCI.status,
    registeredResources: awsCI.registeredResources || [],
    remainingResources: awsCI.remainingResources || [],
    runningTasksCount: awsCI.runningTasksCount || 0,
    pendingTasksCount: awsCI.pendingTasksCount || 0,
  }
}
