import * as rdsService from '../services/rds.service.js'
import {
  assertInstanceId,
  assertSnapshotIdentifier,
  assertDeleteOptions,
  assertRestoreOptions,
} from '../validators/rds.validator.js'

function resolveEnv(req) {
  const env = req.query.env || 'qa'
  return env === 'prod' ? 'prod' : 'qa'
}

export function getEnv(req, res) {
  const env = resolveEnv(req)
  const envInfo = rdsService.setClientForEnv(env)
  res.json({ success: true, data: envInfo })
}

export async function listInstances(req, res) {
  try {
    const env = resolveEnv(req)
    rdsService.setClientForEnv(env)
    const instances = await rdsService.listInstances()
    res.json({ success: true, data: { instances } })
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } })
  }
}

export async function getInstanceDetail(req, res) {
  try {
    const env = resolveEnv(req)
    rdsService.setClientForEnv(env)
    const { instanceId } = req.params
    const detail = await rdsService.getInstanceDetail(instanceId)
    if (!detail) {
      return res.status(404).json({ success: false, error: { message: 'DB instance not found' } })
    }
    res.json({ success: true, data: detail })
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } })
  }
}

export async function listSnapshots(req, res) {
  try {
    const env = resolveEnv(req)
    rdsService.setClientForEnv(env)
    const { instanceId } = req.params
    const snapshots = await rdsService.listSnapshots(instanceId)
    res.json({ success: true, data: { snapshots } })
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } })
  }
}

export async function startInstance(req, res) {
  try {
    const env = resolveEnv(req)
    rdsService.setClientForEnv(env)
    const { instanceId } = req.params
    assertInstanceId(instanceId)
    const result = await rdsService.startInstance(instanceId)
    res.json({ success: true, data: result })
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } })
  }
}

export async function stopInstance(req, res) {
  try {
    const env = resolveEnv(req)
    rdsService.setClientForEnv(env)
    const { instanceId } = req.params
    assertInstanceId(instanceId)
    const result = await rdsService.stopInstance(instanceId)
    res.json({ success: true, data: result })
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } })
  }
}

export async function rebootInstance(req, res) {
  try {
    const env = resolveEnv(req)
    rdsService.setClientForEnv(env)
    const { instanceId } = req.params
    assertInstanceId(instanceId)
    const result = await rdsService.rebootInstance(instanceId)
    res.json({ success: true, data: result })
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } })
  }
}

export async function createSnapshot(req, res) {
  try {
    const env = resolveEnv(req)
    rdsService.setClientForEnv(env)
    const { instanceId } = req.params
    const { snapshotId } = req.body
    assertInstanceId(instanceId)
    assertSnapshotIdentifier(snapshotId)
    const result = await rdsService.createSnapshot(instanceId, snapshotId)
    res.json({ success: true, data: result })
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } })
  }
}

export async function deleteInstance(req, res) {
  try {
    const env = resolveEnv(req)
    rdsService.setClientForEnv(env)
    const { instanceId } = req.params
    const { skipFinalSnapshot, finalSnapshotIdentifier } = req.body
    assertInstanceId(instanceId)
    assertDeleteOptions({ skipFinalSnapshot, finalSnapshotIdentifier })
    const result = await rdsService.deleteInstance(instanceId, { skipFinalSnapshot, finalSnapshotIdentifier })
    res.json({ success: true, data: result })
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } })
  }
}

export async function restoreFromSnapshot(req, res) {
  try {
    const env = resolveEnv(req)
    rdsService.setClientForEnv(env)
    const { snapshotId, newInstanceId } = req.body
    assertRestoreOptions({ snapshotId, newInstanceId })
    const result = await rdsService.restoreFromSnapshot(snapshotId, newInstanceId)
    res.json({ success: true, data: result })
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } })
  }
}
