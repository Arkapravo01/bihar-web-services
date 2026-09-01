import { runInvestigation as runCloudwatchInvestigation } from '../agents/cloudwatch-agent/agent.js'
import { runInvestigation as runS3Investigation } from '../agents/s3-agent/agent.js'
import { runInvestigation as runIAMInvestigation } from '../agents/iam-agent/agent.js'
import { runInvestigation as runLambdaInvestigation } from '../agents/lambda-agent/agent.js'
import { runInvestigation as runSecretsInvestigation } from '../agents/secrets-agent/agent.js'
import { runInvestigation as runRdsInvestigation } from '../agents/rds-agent/agent.js'
import * as s3Service from '../services/s3.service.js'

function resolveEnv(req) {
  const env = req.query.env || 'qa'
  return env === 'prod' ? 'prod' : 'qa'
}

export async function investigate(req, res) {
  const { query, history } = req.body
  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ success: false, error: { message: 'query is required' } })
  }
  const result = await runCloudwatchInvestigation(query.trim(), history ?? [])
  res.json({ success: true, data: result })
}

export async function investigateS3(req, res) {
  const env = resolveEnv(req)
  s3Service.setClientForEnv(env)
  const { query, history } = req.body
  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ success: false, error: { message: 'query is required' } })
  }
  const result = await runS3Investigation(query.trim(), history ?? [])
  res.json({ success: true, data: result })
}

export async function investigateIAM(req, res) {
  const { query, history } = req.body
  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ success: false, error: { message: 'query is required' } })
  }
  const result = await runIAMInvestigation(query.trim(), history ?? [])
  res.json({ success: true, data: result })
}

export async function investigateLambda(req, res) {
  const { query, history } = req.body
  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ success: false, error: { message: 'query is required' } })
  }
  const result = await runLambdaInvestigation(query.trim(), history ?? [])
  res.json({ success: true, data: result })
}

export async function investigateSecrets(req, res) {
  const { query, history } = req.body
  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ success: false, error: { message: 'query is required' } })
  }
  const result = await runSecretsInvestigation(query.trim(), history ?? [])
  res.json({ success: true, data: result })
}

export async function investigateRds(req, res) {
  const { query, history } = req.body
  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ success: false, error: { message: 'query is required' } })
  }
  const result = await runRdsInvestigation(query.trim(), history ?? [])
  res.json({ success: true, data: result })
}
