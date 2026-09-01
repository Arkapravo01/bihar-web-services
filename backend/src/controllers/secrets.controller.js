import * as secretsService from '../services/secrets.service.js'
import { assertSecretName, assertSecretValue, assertSecretDescription } from '../validators/secrets.validator.js'

function resolveEnv(req) {
  const env = req.query.env || 'qa'
  return env === 'prod' ? 'prod' : 'qa'
}

export function getEnv(req, res) {
  const env = resolveEnv(req)
  const envInfo = secretsService.setClientForEnv(env)
  res.json({ success: true, data: envInfo })
}

export async function listSecrets(req, res) {
  try {
    const env = resolveEnv(req)
    secretsService.setClientForEnv(env)
    const secrets = await secretsService.listSecrets()
    res.json({ success: true, data: { secrets } })
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } })
  }
}

export async function getSecretDetail(req, res) {
  try {
    const env = resolveEnv(req)
    secretsService.setClientForEnv(env)
    const { secretName } = req.params
    const detail = await secretsService.getSecretDetail(secretName)
    if (!detail) {
      return res.status(404).json({ success: false, error: { message: 'Secret not found' } })
    }
    res.json({ success: true, data: detail })
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } })
  }
}

export async function getSecretValue(req, res) {
  try {
    const env = resolveEnv(req)
    secretsService.setClientForEnv(env)
    const { secretName } = req.params
    const value = await secretsService.getSecretValue(secretName)
    if (!value) {
      return res.status(404).json({ success: false, error: { message: 'Secret not found' } })
    }
    res.json({ success: true, data: value })
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } })
  }
}

export async function updateSecretValue(req, res) {
  try {
    const env = resolveEnv(req)
    secretsService.setClientForEnv(env)
    const { secretName } = req.params
    const { value } = req.body
    assertSecretValue(value)
    const result = await secretsService.updateSecretValue(secretName, value)
    res.json({ success: true, data: result })
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } })
  }
}

export async function createSecret(req, res) {
  try {
    const env = resolveEnv(req)
    secretsService.setClientForEnv(env)
    const { secretName, value, description } = req.body
    assertSecretName(secretName)
    assertSecretValue(value)
    assertSecretDescription(description)
    const result = await secretsService.createSecret(secretName, value, description)
    res.json({ success: true, data: result })
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } })
  }
}

export async function deleteSecret(req, res) {
  try {
    const env = resolveEnv(req)
    secretsService.setClientForEnv(env)
    const { secretName } = req.params
    const result = await secretsService.deleteSecret(secretName)
    res.json({ success: true, data: result })
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } })
  }
}
