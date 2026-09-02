import {
  ECSClient,
  ListClustersCommand,
  DescribeClustersCommand,
  ListServicesCommand,
  DescribeServicesCommand,
  ListTasksCommand,
  DescribeTasksCommand,
} from '@aws-sdk/client-ecs'
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts'
import { fromIni } from '@aws-sdk/credential-providers'
import { AWS_REGION, ECS_PROFILE } from '../../config/aws.js'

const credentials = fromIni({ profile: ECS_PROFILE })
const ecsClient = new ECSClient({ region: AWS_REGION, credentials })
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
      name: 'list_clusters',
      description: 'List all ECS clusters in the account with their status and resource counts.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_services',
      description: 'List all services in a specific ECS cluster.',
      parameters: {
        type: 'object',
        properties: { clusterName: { type: 'string', description: 'Name or ARN of the cluster' } },
        required: ['clusterName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_tasks',
      description: 'List all tasks in a cluster, optionally filtered by service.',
      parameters: {
        type: 'object',
        properties: {
          clusterName: { type: 'string', description: 'Name or ARN of the cluster' },
          serviceName: { type: 'string', description: 'Optional: filter by service name' },
        },
        required: ['clusterName'],
      },
    },
  },

  // ── inspect ──
  {
    type: 'function',
    function: {
      name: 'describe_cluster',
      description: 'Get detailed information about a specific ECS cluster.',
      parameters: {
        type: 'object',
        properties: { clusterName: { type: 'string', description: 'Name or ARN of the cluster' } },
        required: ['clusterName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'describe_services',
      description: 'Get detailed information about specific ECS services.',
      parameters: {
        type: 'object',
        properties: {
          clusterName: { type: 'string', description: 'Name or ARN of the cluster' },
          serviceNames: { type: 'array', items: { type: 'string' }, description: 'Service names or ARNs' },
        },
        required: ['clusterName', 'serviceNames'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'describe_tasks',
      description: 'Get detailed information about specific ECS tasks.',
      parameters: {
        type: 'object',
        properties: {
          clusterName: { type: 'string', description: 'Name or ARN of the cluster' },
          taskArns: { type: 'array', items: { type: 'string' }, description: 'Task ARNs' },
        },
        required: ['clusterName', 'taskArns'],
      },
    },
  },
]

// ─── implementations ────────────────────────────────────────────────────────

async function getCallerIdentity() {
  try {
    const r = await stsClient.send(new GetCallerIdentityCommand({}))
    return { accountId: r.Account, userId: r.UserId, arn: r.Arn }
  } catch (e) {
    return { error: e.message }
  }
}

async function listClusters() {
  try {
    const clusters = []
    let nextToken
    do {
      const out = await ecsClient.send(new ListClustersCommand({ nextToken, maxResults: 100 }))
      clusters.push(...(out.clusterArns ?? []))
      nextToken = out.nextToken
    } while (nextToken)

    if (clusters.length === 0) return { clusters: [] }

    const described = await ecsClient.send(new DescribeClustersCommand({ clusters }))
    return {
      clusters: (described.clusters ?? []).map((c) => ({
        name: c.clusterName,
        arn: c.clusterArn,
        status: c.status,
        registeredInstancesCount: c.registeredContainerInstancesCount || 0,
        runningTasksCount: c.runningCount || 0,
        activeServicesCount: c.activeServicesCount || 0,
      })),
    }
  } catch (e) {
    return { error: e.message }
  }
}

async function listServices(clusterName) {
  try {
    const services = []
    let nextToken
    do {
      const out = await ecsClient.send(new ListServicesCommand({ cluster: clusterName, nextToken, maxResults: 100 }))
      services.push(...(out.serviceArns ?? []))
      nextToken = out.nextToken
    } while (nextToken)

    if (services.length === 0) return { services: [] }

    const described = await ecsClient.send(new DescribeServicesCommand({ cluster: clusterName, services }))
    return {
      services: (described.services ?? []).map((s) => ({
        name: s.serviceName,
        arn: s.serviceArn,
        status: s.status,
        desiredCount: s.desiredCount || 0,
        runningCount: s.runningCount || 0,
        pendingCount: s.pendingCount || 0,
        launchType: s.launchType,
      })),
    }
  } catch (e) {
    return { error: e.message }
  }
}

async function listTasks(clusterName, serviceName = null) {
  try {
    const tasks = []
    let nextToken
    do {
      const params = { cluster: clusterName, nextToken, maxResults: 100 }
      if (serviceName) params.serviceName = serviceName
      const out = await ecsClient.send(new ListTasksCommand(params))
      tasks.push(...(out.taskArns ?? []))
      nextToken = out.nextToken
    } while (nextToken)

    if (tasks.length === 0) return { tasks: [] }

    const described = await ecsClient.send(new DescribeTasksCommand({ cluster: clusterName, tasks }))
    return {
      tasks: (described.tasks ?? []).map((t) => ({
        arn: t.taskArn,
        status: t.lastStatus,
        desiredStatus: t.desiredStatus,
        launchType: t.launchType,
        createdAt: t.createdAt?.toISOString?.(),
      })),
    }
  } catch (e) {
    return { error: e.message }
  }
}

async function describeCluster(clusterName) {
  try {
    const result = await ecsClient.send(new DescribeClustersCommand({ clusters: [clusterName] }))
    const cluster = result.clusters?.[0]
    if (!cluster) return { error: 'Cluster not found' }
    return {
      cluster: {
        name: cluster.clusterName,
        arn: cluster.clusterArn,
        status: cluster.status,
        registeredInstancesCount: cluster.registeredContainerInstancesCount || 0,
        runningTasksCount: cluster.runningCount || 0,
        pendingTasksCount: cluster.pendingCount || 0,
        activeServicesCount: cluster.activeServicesCount || 0,
      },
    }
  } catch (e) {
    return { error: e.message }
  }
}

async function describeServices(clusterName, serviceNames) {
  try {
    const described = await ecsClient.send(new DescribeServicesCommand({ cluster: clusterName, services: serviceNames }))
    return {
      services: (described.services ?? []).map((s) => ({
        name: s.serviceName,
        arn: s.serviceArn,
        status: s.status,
        desiredCount: s.desiredCount || 0,
        runningCount: s.runningCount || 0,
        pendingCount: s.pendingCount || 0,
        launchType: s.launchType,
        taskDefinition: s.taskDefinition,
        createdAt: s.createdAt?.toISOString?.(),
      })),
    }
  } catch (e) {
    return { error: e.message }
  }
}

async function describeTasks(clusterName, taskArns) {
  try {
    const described = await ecsClient.send(new DescribeTasksCommand({ cluster: clusterName, tasks: taskArns }))
    return {
      tasks: (described.tasks ?? []).map((t) => ({
        arn: t.taskArn,
        status: t.lastStatus,
        desiredStatus: t.desiredStatus,
        launchType: t.launchType,
        createdAt: t.createdAt?.toISOString?.(),
        containers: (t.containers ?? []).map((c) => ({ name: c.name, status: c.lastStatus })),
      })),
    }
  } catch (e) {
    return { error: e.message }
  }
}

// ─── dispatcher ────────────────────────────────────────────────────────

export async function executeTool(name, args) {
  switch (name) {
    case 'get_caller_identity':
      return getCallerIdentity()
    case 'list_clusters':
      return listClusters()
    case 'list_services':
      return listServices(args.clusterName)
    case 'list_tasks':
      return listTasks(args.clusterName, args.serviceName)
    case 'describe_cluster':
      return describeCluster(args.clusterName)
    case 'describe_services':
      return describeServices(args.clusterName, args.serviceNames)
    case 'describe_tasks':
      return describeTasks(args.clusterName, args.taskArns)
    default:
      return { error: `Unknown tool: ${name}` }
  }
}
