import * as iamService from '../services/iam.service.js'
import {
  assertCreateUserInput,
  assertUserName,
  assertAccessKeyId,
  assertAccessKeyStatus,
} from '../validators/iam.validator.js'

export async function listAccessKeys(req, res) {
  try {
    const env = resolveEnv(req)
    iamService.setClientForEnv(env)
    const accessKeys = await iamService.listAccessKeys()
    res.json({ success: true, data: { accessKeys } })
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } })
  }
}

function resolveEnv(req) {
  const env = req.query.env || 'qa'
  return env === 'prod' ? 'prod' : 'qa'
}

export function getEnv(req, res) {
  const env = resolveEnv(req)
  const envInfo = iamService.setClientForEnv(env)
  res.json({ success: true, data: envInfo })
}

export async function listUsers(req, res) {
  try {
    const env = resolveEnv(req)
    iamService.setClientForEnv(env)
    const users = await iamService.listUsers()
    res.json({ success: true, data: { users } })
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } })
  }
}

export async function listRoles(req, res) {
  try {
    const env = resolveEnv(req)
    iamService.setClientForEnv(env)
    const roles = await iamService.listRoles()
    res.json({ success: true, data: { roles } })
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } })
  }
}

export async function listPolicies(req, res) {
  try {
    const env = resolveEnv(req)
    iamService.setClientForEnv(env)
    const policies = await iamService.listPolicies()
    res.json({ success: true, data: { policies } })
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } })
  }
}

export async function getUser(req, res) {
  try {
    const env = resolveEnv(req)
    iamService.setClientForEnv(env)
    const { userName } = req.params
    const result = await iamService.getUser(userName)
    if (!result) {
      return res.status(404).json({ success: false, error: { message: 'User not found' } })
    }
    res.json({ success: true, data: result })
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } })
  }
}

export async function getRole(req, res) {
  try {
    const env = resolveEnv(req)
    iamService.setClientForEnv(env)
    const { roleName } = req.params
    const result = await iamService.getRole(roleName)
    if (!result) {
      return res.status(404).json({ success: false, error: { message: 'Role not found' } })
    }
    res.json({ success: true, data: result })
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } })
  }
}

export async function createUser(req, res) {
  const env = resolveEnv(req)
  iamService.setClientForEnv(env)
  const { userName } = req.body
  assertCreateUserInput(userName)
  const user = await iamService.createUser(userName)
  res.json({ success: true, data: { user } })
}

export async function deleteUser(req, res) {
  const env = resolveEnv(req)
  iamService.setClientForEnv(env)
  const { userName } = req.params
  const result = await iamService.deleteUser(userName)
  res.json({ success: true, data: result })
}

export async function createAccessKey(req, res) {
  const env = resolveEnv(req)
  iamService.setClientForEnv(env)
  const { userName } = req.params
  assertUserName(userName)
  // Carries the one and only copy of the secret.
  const accessKey = await iamService.createAccessKey(userName)
  res.json({ success: true, data: { accessKey } })
}

export async function updateAccessKeyStatus(req, res) {
  const env = resolveEnv(req)
  iamService.setClientForEnv(env)
  const { userName, accessKeyId } = req.params
  const { status } = req.body ?? {}
  assertUserName(userName)
  assertAccessKeyId(accessKeyId)
  assertAccessKeyStatus(status)
  const result = await iamService.updateAccessKeyStatus(userName, accessKeyId, status)
  res.json({ success: true, data: result })
}

export async function deleteAccessKey(req, res) {
  const env = resolveEnv(req)
  iamService.setClientForEnv(env)
  const { userName, accessKeyId } = req.params
  assertUserName(userName)
  assertAccessKeyId(accessKeyId)
  const result = await iamService.deleteAccessKey(userName, accessKeyId)
  res.json({ success: true, data: result })
}
