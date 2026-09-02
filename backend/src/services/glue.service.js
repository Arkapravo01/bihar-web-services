import { GetDatabaseCommand, GetDatabasesCommand, GetTablesCommand, GetJobsCommand, GetJobRunsCommand, GetConnectionsCommand, GetCrawlersCommand } from '@aws-sdk/client-glue'
import { getGlueClientForEnv } from '../clients/index.js'
import { toDatabase, toTable, toJob, toJobRun, toConnection, toCrawler } from '../models/Glue.js'
import { AWS_REGION, GLUE_PROFILE } from '../config/aws.js'

let contextClient = null

function setContextClient(c) { contextClient = c }
function getClient() {
  if (!contextClient) throw new Error('Glue client not initialized')
  return contextClient
}

export function setClientForEnv(env) {
  setContextClient(getGlueClientForEnv(env))
  return { env, profile: GLUE_PROFILE, region: AWS_REGION }
}

export async function listDatabases() {
  const client = getClient()
  const databases = []
  let NextToken

  do {
    const res = await client.send(new GetDatabasesCommand({ NextToken }))
    if (res.DatabaseList) databases.push(...res.DatabaseList.map(toDatabase))
    NextToken = res.NextToken
  } while (NextToken)

  return databases
}

export async function getDatabase(name) {
  const client = getClient()
  const res = await client.send(new GetDatabaseCommand({ Name: name }))
  return toDatabase(res.Database)
}

export async function listTables(databaseName) {
  const client = getClient()
  const tables = []
  let NextToken

  do {
    const res = await client.send(new GetTablesCommand({ DatabaseName: databaseName, NextToken }))
    if (res.TableList) tables.push(...res.TableList.map(toTable))
    NextToken = res.NextToken
  } while (NextToken)

  return tables
}

export async function listJobs() {
  const client = getClient()
  const jobs = []
  let NextToken

  do {
    const res = await client.send(new GetJobsCommand({ NextToken }))
    if (res.Jobs) jobs.push(...res.Jobs.map(toJob))
    NextToken = res.NextToken
  } while (NextToken)

  return jobs
}

export async function getJobRuns(jobName) {
  const client = getClient()
  const runs = []
  let NextToken

  do {
    const res = await client.send(new GetJobRunsCommand({ JobName: jobName, NextToken }))
    if (res.JobRuns) runs.push(...res.JobRuns.map(toJobRun))
    NextToken = res.NextToken
  } while (NextToken)

  return runs
}

export async function listConnections() {
  const client = getClient()
  const connections = []
  let NextToken

  do {
    const res = await client.send(new GetConnectionsCommand({ NextToken }))
    if (res.ConnectionList) connections.push(...res.ConnectionList.map(toConnection))
    NextToken = res.NextToken
  } while (NextToken)

  return connections
}

export async function listCrawlers() {
  const client = getClient()
  const crawlers = []
  let NextToken

  do {
    const res = await client.send(new GetCrawlersCommand({ NextToken }))
    if (res.Crawlers) crawlers.push(...res.Crawlers.map(toCrawler))
    NextToken = res.NextToken
  } while (NextToken)

  return crawlers
}
