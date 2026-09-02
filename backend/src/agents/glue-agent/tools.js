import { GlueClient, GetDatabasesCommand, GetTablesCommand, GetJobsCommand, GetJobRunsCommand, GetConnectionsCommand, GetCrawlersCommand } from '@aws-sdk/client-glue'
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts'
import { fromIni } from '@aws-sdk/credential-providers'
import { AWS_REGION, GLUE_PROFILE } from '../../config/aws.js'

const credentials = fromIni({ profile: GLUE_PROFILE })
const glueClient = new GlueClient({ region: AWS_REGION, credentials })
const stsClient = new STSClient({ region: AWS_REGION, credentials })

export const toolDefinitions = [
  {
    type: 'function',
    function: {
      name: 'get_caller_identity',
      description: 'Returns the AWS identity currently in use. Call first when hitting permission errors.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_databases',
      description: 'List all Glue databases in the current AWS account.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_tables',
      description: 'List all tables in a specific Glue database.',
      parameters: {
        type: 'object',
        properties: {
          database_name: { type: 'string', description: 'The Glue database name' },
        },
        required: ['database_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_jobs',
      description: 'List all Glue ETL jobs in the current AWS account.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_job_runs',
      description: 'List all run history for a specific Glue job.',
      parameters: {
        type: 'object',
        properties: {
          job_name: { type: 'string', description: 'The Glue job name' },
        },
        required: ['job_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_connections',
      description: 'List all Glue database connections.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_crawlers',
      description: 'List all Glue crawlers in the current AWS account.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
]

async function getCallerIdentity() {
  try {
    const r = await stsClient.send(new GetCallerIdentityCommand({}))
    return { accountId: r.Account, userId: r.UserId, arn: r.Arn }
  } catch (e) { return { error: e.message } }
}

async function listDatabases() {
  try {
    const databases = []
    let NextToken
    do {
      const r = await glueClient.send(new GetDatabasesCommand({ NextToken }))
      if (r.DatabaseList) databases.push(...r.DatabaseList.map(db => ({ name: db.Name, description: db.Description })))
      NextToken = r.NextToken
    } while (NextToken)
    return { databases: databases.slice(0, 50) }
  } catch (e) { return { error: e.message } }
}

async function listTables(databaseName) {
  try {
    const tables = []
    let NextToken
    do {
      const r = await glueClient.send(new GetTablesCommand({ DatabaseName: databaseName, NextToken }))
      if (r.TableList) tables.push(...r.TableList.map(t => ({ name: t.Name, owner: t.Owner, location: t.StorageDescriptor?.Location })))
      NextToken = r.NextToken
    } while (NextToken)
    return { tables: tables.slice(0, 50) }
  } catch (e) { return { error: e.message } }
}

async function listJobs() {
  try {
    const jobs = []
    let NextToken
    do {
      const r = await glueClient.send(new GetJobsCommand({ NextToken }))
      if (r.Jobs) jobs.push(...r.Jobs.map(j => ({ name: j.Name, status: j.Status, role: j.Role })))
      NextToken = r.NextToken
    } while (NextToken)
    return { jobs: jobs.slice(0, 50) }
  } catch (e) { return { error: e.message } }
}

async function listJobRuns(jobName) {
  try {
    const runs = []
    let NextToken
    do {
      const r = await glueClient.send(new GetJobRunsCommand({ JobName: jobName, NextToken }))
      if (r.JobRuns) runs.push(...r.JobRuns.map(run => ({ id: run.Id, status: run.JobRunState, startedOn: run.StartedOn?.toISOString(), completedOn: run.CompletedOn?.toISOString() })))
      NextToken = r.NextToken
    } while (NextToken)
    return { runs: runs.slice(0, 50) }
  } catch (e) { return { error: e.message } }
}

async function listConnections() {
  try {
    const connections = []
    let NextToken
    do {
      const r = await glueClient.send(new GetConnectionsCommand({ NextToken }))
      if (r.ConnectionList) connections.push(...r.ConnectionList.map(c => ({ name: c.Name, type: c.ConnectionType, description: c.Description })))
      NextToken = r.NextToken
    } while (NextToken)
    return { connections: connections.slice(0, 50) }
  } catch (e) { return { error: e.message } }
}

async function listCrawlers() {
  try {
    const crawlers = []
    let NextToken
    do {
      const r = await glueClient.send(new GetCrawlersCommand({ NextToken }))
      if (r.Crawlers) crawlers.push(...r.Crawlers.map(c => ({ name: c.Name, status: c.State, role: c.Role, database: c.DatabaseName })))
      NextToken = r.NextToken
    } while (NextToken)
    return { crawlers: crawlers.slice(0, 50) }
  } catch (e) { return { error: e.message } }
}

export async function executeTool(name, args) {
  switch (name) {
    case 'get_caller_identity': return getCallerIdentity()
    case 'list_databases': return listDatabases()
    case 'list_tables': return listTables(args.database_name)
    case 'list_jobs': return listJobs()
    case 'list_job_runs': return listJobRuns(args.job_name)
    case 'list_connections': return listConnections()
    case 'list_crawlers': return listCrawlers()
    default: return { error: `Unknown tool: ${name}` }
  }
}
