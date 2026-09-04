import { runInvestigation as runOrchestratorInvestigation } from '../agents/orchestrator-agent/agent.js'
import { runInvestigation as runCloudwatchInvestigation } from '../agents/cloudwatch-agent/agent.js'
import { runInvestigation as runS3Investigation } from '../agents/s3-agent/agent.js'
import { runInvestigation as runIAMInvestigation } from '../agents/iam-agent/agent.js'
import { runInvestigation as runLambdaInvestigation } from '../agents/lambda-agent/agent.js'
import { runInvestigation as runSecretsInvestigation } from '../agents/secrets-agent/agent.js'
import { runInvestigation as runRdsInvestigation } from '../agents/rds-agent/agent.js'
import { runInvestigation as runEcsInvestigation } from '../agents/ecs-agent/agent.js'
import { runInvestigation as runEventBridgeInvestigation } from '../agents/eventbridge-agent/agent.js'
import { runInvestigation as runGlueInvestigation } from '../agents/glue-agent/agent.js'
import { runInvestigation as runReportInvestigation } from '../agents/report-agent/agent.js'
import { runInvestigation as runApiGatewayInvestigation } from '../agents/apigateway-agent/agent.js'
import * as s3Service from '../services/s3.service.js'

function resolveEnv(req) {
  const env = req.query.env || 'qa'
  return env === 'prod' ? 'prod' : 'qa'
}

function agentHandler(fn) {
  return async (req, res) => {
    try {
      await fn(req, res)
    } catch (err) {
      console.error('[agent.controller]', err)
      res.status(500).json({ success: false, error: { message: err.message ?? 'Agent failed' } })
    }
  }
}

export const investigateOrchestrator = agentHandler(async (req, res) => {
  const { query, history } = req.body
  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ success: false, error: { message: 'query is required' } })
  }
  const result = await runOrchestratorInvestigation(query.trim(), history ?? [])
  res.json({ success: true, data: result })
})

export const investigate = agentHandler(async (req, res) => {
  const { query, history } = req.body
  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ success: false, error: { message: 'query is required' } })
  }
  const result = await runCloudwatchInvestigation(query.trim(), history ?? [])
  res.json({ success: true, data: result })
})

export const investigateS3 = agentHandler(async (req, res) => {
  const env = resolveEnv(req)
  s3Service.setClientForEnv(env)
  const { query, history } = req.body
  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ success: false, error: { message: 'query is required' } })
  }
  const result = await runS3Investigation(query.trim(), history ?? [])
  res.json({ success: true, data: result })
})

export const investigateIAM = agentHandler(async (req, res) => {
  const { query, history } = req.body
  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ success: false, error: { message: 'query is required' } })
  }
  const result = await runIAMInvestigation(query.trim(), history ?? [])
  res.json({ success: true, data: result })
})

export const investigateLambda = agentHandler(async (req, res) => {
  const { query, history } = req.body
  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ success: false, error: { message: 'query is required' } })
  }
  const result = await runLambdaInvestigation(query.trim(), history ?? [])
  res.json({ success: true, data: result })
})

export const investigateSecrets = agentHandler(async (req, res) => {
  const { query, history } = req.body
  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ success: false, error: { message: 'query is required' } })
  }
  const result = await runSecretsInvestigation(query.trim(), history ?? [])
  res.json({ success: true, data: result })
})

export const investigateRds = agentHandler(async (req, res) => {
  const { query, history } = req.body
  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ success: false, error: { message: 'query is required' } })
  }
  const result = await runRdsInvestigation(query.trim(), history ?? [])
  res.json({ success: true, data: result })
})

export const investigateEcs = agentHandler(async (req, res) => {
  const { query, history } = req.body
  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ success: false, error: { message: 'query is required' } })
  }
  const result = await runEcsInvestigation(query.trim(), history ?? [])
  res.json({ success: true, data: result })
})

export const investigateEventBridge = agentHandler(async (req, res) => {
  const { query, history } = req.body
  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ success: false, error: { message: 'query is required' } })
  }
  const result = await runEventBridgeInvestigation(query.trim(), history ?? [])
  res.json({ success: true, data: result })
})

export const investigateGlue = agentHandler(async (req, res) => {
  const { query, history } = req.body
  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ success: false, error: { message: 'query is required' } })
  }
  const result = await runGlueInvestigation(query.trim(), history ?? [])
  res.json({ success: true, data: result })
})

export const investigateReport = agentHandler(async (req, res) => {
  const env = resolveEnv(req)
  const { query, history } = req.body
  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ success: false, error: { message: 'query is required' } })
  }
  const result = await runReportInvestigation(query.trim(), history ?? [], env)
  res.json({ success: true, data: result })
})

export const investigateApiGateway = agentHandler(async (req, res) => {
  const { query, history } = req.body
  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ success: false, error: { message: 'query is required' } })
  }
  const result = await runApiGatewayInvestigation(query.trim(), history ?? [])
  res.json({ success: true, data: result })
})
