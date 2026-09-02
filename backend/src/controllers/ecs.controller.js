import * as ecsService from '../services/ecs.service.js'
import { assertClusterName, assertServiceName, assertTaskArn, assertDesiredCount } from '../validators/ecs.validator.js'

function resolveEnv(req) {
  const env = req.query.env || 'qa'
  return env === 'prod' ? 'prod' : 'qa'
}

export function getEnv(req, res) {
  const env = resolveEnv(req)
  const envInfo = ecsService.setClientForEnv(env)
  res.json({ success: true, data: envInfo })
}

export async function listClusters(req, res) {
  try {
    const env = resolveEnv(req)
    ecsService.setClientForEnv(env)
    const clusters = await ecsService.listClusters()
    res.json({ success: true, data: { clusters } })
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } })
  }
}

export async function describeCluster(req, res) {
  try {
    const env = resolveEnv(req)
    ecsService.setClientForEnv(env)
    const { clusterName } = req.params
    assertClusterName(clusterName)
    const cluster = await ecsService.describeCluster(clusterName)
    if (!cluster) {
      return res.status(404).json({ success: false, error: { message: 'Cluster not found' } })
    }
    res.json({ success: true, data: cluster })
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } })
  }
}

export async function listServices(req, res) {
  try {
    const env = resolveEnv(req)
    ecsService.setClientForEnv(env)
    const { clusterName } = req.params
    assertClusterName(clusterName)
    const services = await ecsService.listServices(clusterName)
    res.json({ success: true, data: { services } })
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } })
  }
}

export async function describeService(req, res) {
  try {
    const env = resolveEnv(req)
    ecsService.setClientForEnv(env)
    const { clusterName, serviceName } = req.params
    assertClusterName(clusterName)
    assertServiceName(serviceName)
    const service = await ecsService.describeService(clusterName, serviceName)
    if (!service) {
      return res.status(404).json({ success: false, error: { message: 'Service not found' } })
    }
    res.json({ success: true, data: service })
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } })
  }
}

export async function updateDesiredCount(req, res) {
  try {
    const env = resolveEnv(req)
    ecsService.setClientForEnv(env)
    const { clusterName, serviceName } = req.params
    const { desiredCount } = req.body
    assertClusterName(clusterName)
    assertServiceName(serviceName)
    assertDesiredCount(desiredCount)
    const service = await ecsService.updateServiceDesiredCount(clusterName, serviceName, desiredCount)
    res.json({ success: true, data: service })
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } })
  }
}

export async function forceNewDeployment(req, res) {
  try {
    const env = resolveEnv(req)
    ecsService.setClientForEnv(env)
    const { clusterName, serviceName } = req.params
    assertClusterName(clusterName)
    assertServiceName(serviceName)
    const service = await ecsService.forceNewDeployment(clusterName, serviceName)
    res.json({ success: true, data: service })
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } })
  }
}

export async function stopTask(req, res) {
  try {
    const env = resolveEnv(req)
    ecsService.setClientForEnv(env)
    const { clusterName } = req.params
    const { taskArn, reason } = req.body
    assertClusterName(clusterName)
    assertTaskArn(taskArn)
    const task = await ecsService.stopTask(clusterName, taskArn, reason || 'Stopped manually from Bihar Web Services console')
    res.json({ success: true, data: task })
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } })
  }
}

export async function listTasks(req, res) {
  try {
    const env = resolveEnv(req)
    ecsService.setClientForEnv(env)
    const { clusterName } = req.params
    const { serviceName } = req.query
    assertClusterName(clusterName)
    const tasks = await ecsService.listTasks(clusterName, serviceName)
    res.json({ success: true, data: { tasks } })
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } })
  }
}

export async function listTaskDefinitions(req, res) {
  try {
    const env = resolveEnv(req)
    ecsService.setClientForEnv(env)
    const taskDefinitions = await ecsService.listTaskDefinitions()
    res.json({ success: true, data: { taskDefinitions } })
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } })
  }
}

export async function listContainerInstances(req, res) {
  try {
    const env = resolveEnv(req)
    ecsService.setClientForEnv(env)
    const { clusterName } = req.params
    assertClusterName(clusterName)
    const containerInstances = await ecsService.listContainerInstances(clusterName)
    res.json({ success: true, data: { containerInstances } })
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } })
  }
}
