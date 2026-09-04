import {
  GetDatabaseCommand, GetDatabasesCommand,
  GetTableCommand, GetTablesCommand,
  GetJobCommand, GetJobsCommand, GetJobRunsCommand, GetJobRunCommand, StartJobRunCommand,
  GetCrawlerCommand, GetCrawlersCommand, ListCrawlsCommand,
  GetConnectionsCommand,
  ListWorkflowsCommand, GetWorkflowCommand, StartWorkflowRunCommand,
  GetWorkflowRunsCommand, GetWorkflowRunCommand,
} from '@aws-sdk/client-glue'
import { getGlueClientForEnv } from '../clients/index.js'
import { toDatabase, toTable, toJob, toJobRun, toConnection, toCrawler, toWorkflow, toWorkflowRun } from '../models/Glue.js'
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

export async function getJob(jobName) {
  const res = await getClient().send(new GetJobCommand({ JobName: jobName }))
  return res.Job ? toJob(res.Job) : null
}

export async function getJobRun(jobName, runId) {
  const res = await getClient().send(new GetJobRunCommand({ JobName: jobName, RunId: runId }))
  return res.JobRun ? toJobRun(res.JobRun) : null
}

export async function startJobRun(jobName, args = {}) {
  const res = await getClient().send(new StartJobRunCommand({ JobName: jobName, Arguments: args }))
  return { jobRunId: res.JobRunId }
}

export async function getCrawler(crawlerName) {
  const res = await getClient().send(new GetCrawlerCommand({ CrawlerName: crawlerName }))
  return res.Crawler ? toCrawler(res.Crawler) : null
}

export async function listCrawlHistory(crawlerName) {
  const crawls = []
  let NextToken
  do {
    const res = await getClient().send(new ListCrawlsCommand({ CrawlerName: crawlerName, MaxResults: 50, NextToken }))
    crawls.push(...(res.Crawls ?? []))
    NextToken = res.NextToken
  } while (NextToken)
  return crawls.map(cl => ({
    crawlId: cl.CrawlId,
    state: cl.State,
    startTime: cl.StartTime ? new Date(cl.StartTime).toISOString() : null,
    endTime: cl.EndTime ? new Date(cl.EndTime).toISOString() : null,
    errorMessage: cl.ErrorMessage ?? null,
  }))
}

export async function listWorkflows() {
  const client = getClient()
  const names = []
  let NextToken
  do {
    const res = await client.send(new ListWorkflowsCommand({ MaxResults: 25, NextToken }))
    names.push(...(res.Workflows ?? []))
    NextToken = res.NextToken
  } while (NextToken)

  // Fetch each workflow to get LastRun status + statistics
  const workflows = await Promise.all(names.map(async (name) => {
    const r = await client.send(new GetWorkflowCommand({ Name: name, IncludeGraph: false }))
    return toWorkflow(r.Workflow)
  }))
  return workflows
}

export async function startWorkflowRun(workflowName) {
  const res = await getClient().send(new StartWorkflowRunCommand({ Name: workflowName }))
  return { workflowRunId: res.RunId }
}

export async function getWorkflowRuns(workflowName) {
  const client = getClient()
  const runs = []
  let NextToken
  do {
    const res = await client.send(new GetWorkflowRunsCommand({ Name: workflowName, MaxResults: 20, NextToken }))
    runs.push(...(res.Runs ?? []))
    NextToken = res.NextToken
  } while (NextToken && runs.length < 20)
  return runs.slice(0, 20).map(toWorkflowRun)
}

export async function getWorkflowRunDetail(workflowName, runId) {
  const res = await getClient().send(new GetWorkflowRunCommand({
    Name: workflowName,
    RunId: runId,
    IncludeGraph: true,
  }))
  if (!res.Run) return null
  const run = res.Run
  const nodes = (run.Graph?.Nodes ?? [])
    .filter(n => n.Type === 'JOB')
    .map(n => {
      const jr = n.JobDetails?.JobRuns?.[0]
      return {
        jobName:       n.Name,
        jobRunId:      jr?.Id ?? null,
        status:        jr?.JobRunState ?? null,
        startedOn:     jr?.StartedOn instanceof Date ? jr.StartedOn.toISOString() : (jr?.StartedOn ?? null),
        completedOn:   jr?.CompletedOn instanceof Date ? jr.CompletedOn.toISOString() : (jr?.CompletedOn ?? null),
        executionTime: jr?.ExecutionTime ?? null,
        errorMessage:  jr?.ErrorMessage ?? null,
        attempt:       jr?.Attempt ?? null,
      }
    })
    .sort((a, b) => {
      if (!a.startedOn) return 1
      if (!b.startedOn) return -1
      return new Date(a.startedOn) - new Date(b.startedOn)
    })
  return {
    runId:            run.WorkflowRunId,
    status:           run.Status,
    startedOn:        run.StartedOn instanceof Date ? run.StartedOn.toISOString() : (run.StartedOn ?? null),
    completedOn:      run.CompletedOn instanceof Date ? run.CompletedOn.toISOString() : (run.CompletedOn ?? null),
    totalActions:     run.Statistics?.TotalActions     ?? 0,
    succeededActions: run.Statistics?.SucceededActions ?? 0,
    failedActions:    run.Statistics?.FailedActions    ?? 0,
    runningActions:   run.Statistics?.RunningActions   ?? 0,
    erroredActions:   run.Statistics?.ErroredActions   ?? 0,
    nodes,
  }
}

export async function getTable(databaseName, tableName) {
  try {
    const res = await getClient().send(new GetTableCommand({ DatabaseName: databaseName, Name: tableName }))
    return res.Table ? toTable(res.Table) : null
  } catch (e) {
    if (e.name === 'EntityNotFoundException') return null
    throw e
  }
}
