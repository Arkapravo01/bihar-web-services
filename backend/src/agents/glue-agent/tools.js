import {
  GlueClient,
  GetDatabasesCommand, GetTablesCommand,
  GetJobsCommand, GetJobCommand, GetJobRunsCommand, StartJobRunCommand,
  GetCrawlersCommand, GetCrawlerCommand, ListCrawlsCommand,
  GetConnectionsCommand,
} from '@aws-sdk/client-glue'
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts'
import { fromIni } from '@aws-sdk/credential-providers'
import { AWS_REGION, GLUE_PROFILE } from '../../config/aws.js'

const credentials = fromIni({ profile: GLUE_PROFILE })
const glueClient = new GlueClient({ region: AWS_REGION, credentials })
const stsClient  = new STSClient({ region: AWS_REGION, credentials })

// ─── tool definitions ────────────────────────────────────────────────────────

export const toolDefinitions = [
  {
    type: 'function',
    function: {
      name: 'get_caller_identity',
      description: 'Returns the AWS account ID and ARN of the credentials the agent is using. Call this first if a permission error occurs.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },

  // ── databases / tables ──
  {
    type: 'function',
    function: {
      name: 'list_databases',
      description: 'List all Glue Data Catalog databases.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_tables',
      description: 'List all tables in a Glue database.',
      parameters: {
        type: 'object',
        properties: { database_name: { type: 'string', description: 'Glue database name.' } },
        required: ['database_name'],
      },
    },
  },

  // ── jobs ──
  {
    type: 'function',
    function: {
      name: 'list_jobs',
      description: 'List all Glue ETL jobs with their type, role, and Glue version. Always call this first when resolving a job name.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_job_detail',
      description: 'Get full configuration for a single Glue job: script location, worker type, capacity, timeout, default args, max retries.',
      parameters: {
        type: 'object',
        properties: { job_name: { type: 'string', description: 'Exact job name from list_jobs.' } },
        required: ['job_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_job_runs',
      description: 'List the run history for a job — use this to diagnose failures, check duration, or find the latest run status.',
      parameters: {
        type: 'object',
        properties: { job_name: { type: 'string', description: 'Exact job name from list_jobs.' } },
        required: ['job_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'start_job_run',
      description: 'Start a new run of a Glue job. Only call this on clear, explicit instruction from the user.',
      parameters: {
        type: 'object',
        properties: {
          job_name: { type: 'string', description: 'Exact job name from list_jobs.' },
          args: { type: 'object', description: 'Optional job arguments override (key/value pairs).' },
        },
        required: ['job_name'],
      },
    },
  },

  // ── crawlers ──
  {
    type: 'function',
    function: {
      name: 'list_crawlers',
      description: 'List all Glue crawlers with their state, target database, and schedule. Always call this first when resolving a crawler name.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_crawler_detail',
      description: 'Get full configuration for a single crawler: targets (S3/JDBC), database, schedule, classifiers, last crawl info.',
      parameters: {
        type: 'object',
        properties: { crawler_name: { type: 'string', description: 'Exact crawler name from list_crawlers.' } },
        required: ['crawler_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_crawl_history',
      description: 'List recent crawl runs for a crawler — use to diagnose failures or check when it last ran successfully.',
      parameters: {
        type: 'object',
        properties: { crawler_name: { type: 'string', description: 'Exact crawler name from list_crawlers.' } },
        required: ['crawler_name'],
      },
    },
  },

  // ── connections ──
  {
    type: 'function',
    function: {
      name: 'list_connections',
      description: 'List all Glue connections (JDBC, network, etc.) and their type and status.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
]

// ─── helpers ─────────────────────────────────────────────────────────────────

async function paginate(sendFn, resultKey) {
  const items = []
  let NextToken
  do {
    const res = await sendFn(NextToken)
    items.push(...(res[resultKey] ?? []))
    NextToken = res.NextToken
  } while (NextToken)
  return items
}

// ─── tool implementations ─────────────────────────────────────────────────────

async function getCallerIdentity() {
  try {
    const r = await stsClient.send(new GetCallerIdentityCommand({}))
    return { accountId: r.Account, userId: r.UserId, arn: r.Arn }
  } catch (e) { return { error: e.message } }
}

async function listDatabases() {
  try {
    const dbs = await paginate((tok) => glueClient.send(new GetDatabasesCommand({ NextToken: tok })), 'DatabaseList')
    return { databases: dbs.map(d => ({ name: d.Name, description: d.Description || null, created: d.CreateTime?.toISOString() })) }
  } catch (e) { return { error: e.message } }
}

async function listTables(databaseName) {
  try {
    const tables = await paginate((tok) => glueClient.send(new GetTablesCommand({ DatabaseName: databaseName, NextToken: tok })), 'TableList')
    return { tables: tables.map(t => ({ name: t.Name, tableType: t.TableType, location: t.StorageDescriptor?.Location, columns: t.StorageDescriptor?.Columns?.length ?? 0, updated: t.UpdateTime?.toISOString() })) }
  } catch (e) { return { error: e.message } }
}

async function listJobs() {
  try {
    const jobs = await paginate((tok) => glueClient.send(new GetJobsCommand({ NextToken: tok })), 'Jobs')
    return {
      jobs: jobs.map(j => ({
        name: j.Name,
        jobType: j.Command?.Name,
        glueVersion: j.GlueVersion,
        role: j.Role?.split('/').pop(),
        timeout: j.Timeout,
        maxRetries: j.MaxRetries,
      })),
    }
  } catch (e) { return { error: e.message } }
}

async function getJobDetail(jobName) {
  try {
    const r = await glueClient.send(new GetJobCommand({ JobName: jobName }))
    const j = r.Job
    return {
      name: j.Name,
      jobType: j.Command?.Name,
      scriptLocation: j.Command?.ScriptLocation,
      glueVersion: j.GlueVersion,
      role: j.Role,
      workerType: j.WorkerType,
      numberOfWorkers: j.NumberOfWorkers,
      maxCapacity: j.MaxCapacity,
      timeout: j.Timeout,
      maxRetries: j.MaxRetries,
      defaultArgs: j.DefaultArguments,
      description: j.Description || null,
      created: j.CreatedOn?.toISOString(),
      updated: j.LastModifiedOn?.toISOString(),
    }
  } catch (e) { return { error: e.message } }
}

async function listJobRuns(jobName) {
  try {
    const runs = await paginate((tok) => glueClient.send(new GetJobRunsCommand({ JobName: jobName, NextToken: tok })), 'JobRuns')
    return {
      runs: runs.slice(0, 20).map(r => ({
        id: r.Id,
        state: r.JobRunState,
        startedOn: r.StartedOn?.toISOString(),
        completedOn: r.CompletedOn?.toISOString(),
        durationSeconds: r.ExecutionTime,
        errorMessage: r.ErrorMessage || null,
        attempt: r.Attempt,
      })),
    }
  } catch (e) { return { error: e.message } }
}

async function startJobRun(jobName, args) {
  try {
    const r = await glueClient.send(new StartJobRunCommand({ JobName: jobName, Arguments: args ?? {} }))
    return { started: true, jobRunId: r.JobRunId }
  } catch (e) { return { error: e.message } }
}

async function listCrawlers() {
  try {
    const crawlers = await paginate((tok) => glueClient.send(new GetCrawlersCommand({ NextToken: tok })), 'Crawlers')
    return {
      crawlers: crawlers.map(c => ({
        name: c.Name,
        state: c.State,
        database: c.DatabaseName,
        schedule: c.Schedule?.ScheduleExpression || null,
        lastCrawl: c.LastCrawl?.StartTime?.toISOString() || null,
      })),
    }
  } catch (e) { return { error: e.message } }
}

async function getCrawlerDetail(crawlerName) {
  try {
    const r = await glueClient.send(new GetCrawlerCommand({ CrawlerName: crawlerName }))
    const c = r.Crawler
    return {
      name: c.Name,
      state: c.State,
      role: c.Role,
      database: c.DatabaseName,
      tablePrefix: c.TablePrefix || null,
      schedule: c.Schedule?.ScheduleExpression || null,
      targets: c.Targets,
      lastCrawl: c.LastCrawl ? { status: c.LastCrawl.Status, startTime: c.LastCrawl.StartTime?.toISOString(), errorMessage: c.LastCrawl.ErrorMessage || null } : null,
      created: c.CreationTime?.toISOString(),
    }
  } catch (e) { return { error: e.message } }
}

async function listCrawlHistory(crawlerName) {
  try {
    const crawls = []
    let NextToken
    do {
      const r = await glueClient.send(new ListCrawlsCommand({ CrawlerName: crawlerName, MaxResults: 20, NextToken }))
      crawls.push(...(r.Crawls ?? []))
      NextToken = r.NextToken
    } while (NextToken && crawls.length < 20)
    return {
      crawls: crawls.map(cl => ({
        crawlId: cl.CrawlId,
        state: cl.State,
        startTime: cl.StartTime ? new Date(cl.StartTime).toISOString() : null,
        endTime: cl.EndTime ? new Date(cl.EndTime).toISOString() : null,
        errorMessage: cl.ErrorMessage || null,
      })),
    }
  } catch (e) { return { error: e.message } }
}

async function listConnections() {
  try {
    const conns = await paginate((tok) => glueClient.send(new GetConnectionsCommand({ NextToken: tok })), 'ConnectionList')
    return {
      connections: conns.map(c => ({
        name: c.Name,
        type: c.ConnectionType,
        description: c.Description || null,
        status: c.LastUpdatedStatus || null,
        updated: c.LastUpdatedTime?.toISOString(),
      })),
    }
  } catch (e) { return { error: e.message } }
}

export async function executeTool(name, args) {
  switch (name) {
    case 'get_caller_identity':  return getCallerIdentity()
    case 'list_databases':        return listDatabases()
    case 'list_tables':           return listTables(args.database_name)
    case 'list_jobs':             return listJobs()
    case 'get_job_detail':        return getJobDetail(args.job_name)
    case 'list_job_runs':         return listJobRuns(args.job_name)
    case 'start_job_run':         return startJobRun(args.job_name, args.args)
    case 'list_crawlers':         return listCrawlers()
    case 'get_crawler_detail':    return getCrawlerDetail(args.crawler_name)
    case 'list_crawl_history':    return listCrawlHistory(args.crawler_name)
    case 'list_connections':      return listConnections()
    default:
      return { error: `Unknown tool: ${name}` }
  }
}
