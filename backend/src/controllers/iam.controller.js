import * as iamService from '../services/iam.service.js'
import {
  assertCreateUserInput,
  assertUserName,
  assertAccessKeyId,
  assertAccessKeyStatus,
} from '../validators/iam.validator.js'
import { ApiError } from '../errors.js'

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

/**
 * IAM reports a missing user or key as NoSuchEntity, which is a 404, not a
 * server fault. Without this the UI showed "internal error" for a name that
 * simply does not exist.
 */
function rethrowAsApiError(err) {
  // AWS SDK v3 suffixes IAM error names with "Exception". The un-suffixed
  // spelling below it is kept only so an older SDK would still match.
  if (err?.name === 'NoSuchEntityException' || err?.name === 'NoSuchEntity') {
    throw new ApiError(404, 'IAM_ENTITY_NOT_FOUND', err.message)
  }
  if (err?.name === 'LimitExceededException' || err?.name === 'LimitExceeded') {
    throw new ApiError(409, 'ACCESS_KEY_LIMIT_REACHED', 'This user already has the maximum of two access keys. Delete or disable one first.')
  }
  throw err
}

export async function createAccessKey(req, res) {
  const env = resolveEnv(req)
  iamService.setClientForEnv(env)
  const { userName } = req.params
  assertUserName(userName)
  // Carries the one and only copy of the secret.
  const accessKey = await iamService.createAccessKey(userName).catch(rethrowAsApiError)
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
  const result = await iamService
    .updateAccessKeyStatus(userName, accessKeyId, status)
    .catch(rethrowAsApiError)
  res.json({ success: true, data: result })
}

export async function deleteAccessKey(req, res) {
  const env = resolveEnv(req)
  iamService.setClientForEnv(env)
  const { userName, accessKeyId } = req.params
  assertUserName(userName)
  assertAccessKeyId(accessKeyId)
  const result = await iamService.deleteAccessKey(userName, accessKeyId).catch(rethrowAsApiError)
  res.json({ success: true, data: result })
}
