import {
  ListClustersCommand,
  DescribeClustersCommand,
  ListServicesCommand,
  DescribeServicesCommand,
  UpdateServiceCommand,
  ListTasksCommand,
  DescribeTasksCommand,
  StopTaskCommand,
  ListTaskDefinitionsCommand,
  DescribeTaskDefinitionCommand,
  ListContainerInstancesCommand,
  DescribeContainerInstancesCommand,
} from '@aws-sdk/client-ecs'
import { getEcsClientForEnv } from '../clients/index.js'
import { AWS_REGION, ECS_PROFILE } from '../config/aws.js'
import { toCluster, toService, toTask, toTaskDefinition, toContainerInstance } from '../models/Ecs.js'

let contextClient = null

function setContextClient(client) {
  contextClient = client
}

function getClient() {
  if (!contextClient) throw new Error('ECS client not initialized')
  return contextClient
}

export function setClientForEnv(env) {
  const client = getEcsClientForEnv(env)
  setContextClient(client)
  return { env, profile: ECS_PROFILE, region: AWS_REGION }
}

export async function listClusters() {
  const clusters = []
  let nextToken
  do {
    const out = await getClient().send(new ListClustersCommand({ nextToken, maxResults: 100 }))
    clusters.push(...(out.clusterArns ?? []))
    nextToken = out.nextToken
  } while (nextToken)

  if (clusters.length === 0) return []

  const described = await getClient().send(new DescribeClustersCommand({ clusters }))
  return (described.clusters ?? []).map(toCluster)
}

export async function describeCluster(clusterName) {
  try {
    const result = await getClient().send(new DescribeClustersCommand({ clusters: [clusterName] }))
    const cluster = result.clusters?.[0]
    return cluster ? toCluster(cluster) : null
  } catch (e) {
    if (e.name === 'ClusterNotFoundException') return null
    throw e
  }
}

export async function listServices(clusterName) {
  const services = []
  let nextToken
  do {
    const out = await getClient().send(new ListServicesCommand({ cluster: clusterName, nextToken, maxResults: 100 }))
    services.push(...(out.serviceArns ?? []))
    nextToken = out.nextToken
  } while (nextToken)

  if (services.length === 0) return []

  const described = await getClient().send(new DescribeServicesCommand({ cluster: clusterName, services }))
  return (described.services ?? []).map(toService)
}

export async function describeService(clusterName, serviceName) {
  const result = await getClient().send(new DescribeServicesCommand({ cluster: clusterName, services: [serviceName] }))
  const service = result.services?.[0]
  return service ? toService(service) : null
}

export async function updateServiceDesiredCount(clusterName, serviceName, desiredCount) {
  const out = await getClient().send(new UpdateServiceCommand({ cluster: clusterName, service: serviceName, desiredCount }))
  return toService(out.service)
}

export async function forceNewDeployment(clusterName, serviceName) {
  const out = await getClient().send(new UpdateServiceCommand({ cluster: clusterName, service: serviceName, forceNewDeployment: true }))
  return toService(out.service)
}

export async function listTasks(clusterName, serviceName = null) {
  const tasks = []
  let nextToken
  do {
    const params = { cluster: clusterName, nextToken, maxResults: 100 }
    if (serviceName) params.serviceName = serviceName
    const out = await getClient().send(new ListTasksCommand(params))
    tasks.push(...(out.taskArns ?? []))
    nextToken = out.nextToken
  } while (nextToken)

  if (tasks.length === 0) return []

  const described = await getClient().send(new DescribeTasksCommand({ cluster: clusterName, tasks }))
  return (described.tasks ?? []).map(toTask)
}

export async function stopTask(clusterName, taskArn, reason) {
  const out = await getClient().send(new StopTaskCommand({ cluster: clusterName, task: taskArn, reason }))
  return out.task ? toTask(out.task) : null
}

export async function listTaskDefinitions() {
  const taskDefs = []
  let nextToken
  do {
    const out = await getClient().send(new ListTaskDefinitionsCommand({ nextToken, maxResults: 100, sort: 'DESC' }))
    taskDefs.push(...(out.taskDefinitionArns ?? []))
    nextToken = out.nextToken
  } while (nextToken)

  if (taskDefs.length === 0) return []

  const described = await Promise.all(
    taskDefs.map((arn) => getClient().send(new DescribeTaskDefinitionCommand({ taskDefinition: arn })))
  )
  return described.map((d) => d.taskDefinition).filter(Boolean).map(toTaskDefinition)
}

export async function describeTaskDefinition(taskDefinitionArn) {
  try {
    const result = await getClient().send(new DescribeTaskDefinitionCommand({ taskDefinition: taskDefinitionArn }))
    return result.taskDefinition ? toTaskDefinition(result.taskDefinition) : null
  } catch (e) {
    if (e.name === 'ClientException') return null
    throw e
  }
}

export async function listContainerInstances(clusterName) {
  const instances = []
  let nextToken
  do {
    const out = await getClient().send(new ListContainerInstancesCommand({ cluster: clusterName, nextToken, maxResults: 100 }))
    instances.push(...(out.containerInstanceArns ?? []))
    nextToken = out.nextToken
  } while (nextToken)

  if (instances.length === 0) return []

  const described = await getClient().send(new DescribeContainerInstancesCommand({ cluster: clusterName, containerInstances: instances }))
  return (described.containerInstances ?? []).map(toContainerInstance)
}
