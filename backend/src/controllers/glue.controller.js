import * as glueService from '../services/glue.service.js'
import { assertDatabaseName, assertTableName, assertJobName, assertCrawlerName } from '../validators/glue.validator.js'

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

export async function listJobs(req, res) {
  const env = resolveEnv(req)
  glueService.setClientForEnv(env)
  const jobs = await glueService.listJobs()
  res.json({ success: true, data: { jobs } })
}

export async function getJobRuns(req, res) {
  const env = resolveEnv(req)
  const { jobName } = req.params
  assertJobName(jobName)
  glueService.setClientForEnv(env)
  const runs = await glueService.getJobRuns(jobName)
  res.json({ success: true, data: { runs } })
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
