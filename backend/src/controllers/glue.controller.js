import * as glueService from '../services/glue.service.js'
import { assertDatabaseName, assertJobName, assertCrawlerName, assertWorkflowName } from '../validators/glue.validator.js'

function resolveEnv(req) {
  const env = req.query.env || 'qa'
  return env === 'prod' ? 'prod' : 'qa'
}

export async function listDatabases(req, res) {
  const env = resolveEnv(req)
  glueService.setClientForEnv(env)
  const databases = await glueService.listDatabases()
  res.json({ success: true, data: { databases } })
}

export async function getDatabase(req, res) {
  const env = resolveEnv(req)
  const { name } = req.params
  assertDatabaseName(name)
  glueService.setClientForEnv(env)
  const database = await glueService.getDatabase(name)
  res.json({ success: true, data: { database } })
}

export async function listTables(req, res) {
  const env = resolveEnv(req)
  const { databaseName } = req.params
  assertDatabaseName(databaseName)
  glueService.setClientForEnv(env)
  const tables = await glueService.listTables(databaseName)
  res.json({ success: true, data: { tables } })
}

export async function getTable(req, res) {
  const env = resolveEnv(req)
  const { databaseName, tableName } = req.params
  assertDatabaseName(databaseName)
  glueService.setClientForEnv(env)
  const table = await glueService.getTable(databaseName, tableName)
  if (!table) return res.status(404).json({ success: false, error: { message: 'Table not found' } })
  res.json({ success: true, data: { table } })
}

export async function listJobs(req, res) {
  const env = resolveEnv(req)
  glueService.setClientForEnv(env)
  const jobs = await glueService.listJobs()
  res.json({ success: true, data: { jobs } })
}

export async function getJob(req, res) {
  const env = resolveEnv(req)
  const { jobName } = req.params
  assertJobName(jobName)
  glueService.setClientForEnv(env)
  const job = await glueService.getJob(jobName)
  if (!job) return res.status(404).json({ success: false, error: { message: 'Job not found' } })
  res.json({ success: true, data: { job } })
}

export async function getJobRuns(req, res) {
  const env = resolveEnv(req)
  const { jobName } = req.params
  assertJobName(jobName)
  glueService.setClientForEnv(env)
  const runs = await glueService.getJobRuns(jobName)
  res.json({ success: true, data: { runs } })
}

export async function startJobRun(req, res) {
  const env = resolveEnv(req)
  const { jobName } = req.params
  assertJobName(jobName)
  glueService.setClientForEnv(env)
  const result = await glueService.startJobRun(jobName, req.body?.args ?? {})
  res.json({ success: true, data: result })
}

export async function listConnections(req, res) {
  const env = resolveEnv(req)
  glueService.setClientForEnv(env)
  const connections = await glueService.listConnections()
  res.json({ success: true, data: { connections } })
}

export async function listCrawlers(req, res) {
  const env = resolveEnv(req)
  glueService.setClientForEnv(env)
  const crawlers = await glueService.listCrawlers()
  res.json({ success: true, data: { crawlers } })
}

export async function getCrawler(req, res) {
  const env = resolveEnv(req)
  const { crawlerName } = req.params
  assertCrawlerName(crawlerName)
  glueService.setClientForEnv(env)
  const crawler = await glueService.getCrawler(crawlerName)
  if (!crawler) return res.status(404).json({ success: false, error: { message: 'Crawler not found' } })
  res.json({ success: true, data: { crawler } })
}

export async function listCrawlHistory(req, res) {
  const env = resolveEnv(req)
  const { crawlerName } = req.params
  assertCrawlerName(crawlerName)
  glueService.setClientForEnv(env)
  const crawls = await glueService.listCrawlHistory(crawlerName)
  res.json({ success: true, data: { crawls } })
}

export async function listWorkflows(req, res) {
  const env = resolveEnv(req)
  glueService.setClientForEnv(env)
  const workflows = await glueService.listWorkflows()
  res.json({ success: true, data: { workflows } })
}

export async function startWorkflowRun(req, res) {
  const env = resolveEnv(req)
  const { workflowName } = req.params
  assertWorkflowName(workflowName)
  glueService.setClientForEnv(env)
  const result = await glueService.startWorkflowRun(workflowName)
  res.json({ success: true, data: result })
}

export async function getWorkflowRuns(req, res) {
  const env = resolveEnv(req)
  const { workflowName } = req.params
  assertWorkflowName(workflowName)
  glueService.setClientForEnv(env)
  const runs = await glueService.getWorkflowRuns(workflowName)
  res.json({ success: true, data: { runs } })
}

export async function getWorkflowRunDetail(req, res) {
  const env = resolveEnv(req)
  const { workflowName, runId } = req.params
  assertWorkflowName(workflowName)
  if (!runId) return res.status(400).json({ success: false, error: { message: 'runId is required' } })
  glueService.setClientForEnv(env)
  const run = await glueService.getWorkflowRunDetail(workflowName, runId)
  if (!run) return res.status(404).json({ success: false, error: { message: 'Run not found' } })
  res.json({ success: true, data: { run } })
}
