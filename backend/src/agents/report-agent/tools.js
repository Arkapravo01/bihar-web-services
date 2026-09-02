/**
 * Report Agent tools — conversational interface to the report pipeline.
 */

import { createReportRun, getRun, getLatestRunForRange, listRunSummaries } from './store.js'
import { executeReportRun } from './engine/reportRunner.js'
import { discoverAllLogGroups } from './engine/cwGateway.js'

export const toolDefinitions = [
  {
    type: 'function',
    function: {
      name: 'start_report_run',
      description: 'Start a new log intelligence report run that discovers all CloudWatch log groups, analyzes real events, and produces findings.',
      parameters: {
        type: 'object',
        properties: {
          time_range: { type: 'string', enum: ['24h', '7d'], description: 'Time range to analyze: last 24 hours or last 7 days' },
        },
        required: ['time_range'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_report_run_status',
      description: 'Get the current status and metadata of a report run. Does not include full findings.',
      parameters: {
        type: 'object',
        properties: {
          run_id: { type: 'string', description: 'The run ID returned by start_report_run' },
        },
        required: ['run_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_latest_report',
      description: 'Get the most recent completed report run for a given time range, including findings, KPIs, and AI summary.',
      parameters: {
        type: 'object',
        properties: {
          time_range: { type: 'string', enum: ['24h', '7d'], description: 'Time range to look up' },
        },
        required: ['time_range'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_log_groups',
      description: 'List all discovered CloudWatch log groups.',
      parameters: {
        type: 'object',
        properties: {
          prefix: { type: 'string', description: 'Optional log group name prefix filter' },
        },
        required: [],
      },
    },
  },
]

export function makeExecuteTool(env) {
  return async function executeTool(name, args) {
    switch (name) {
      case 'start_report_run': {
        const run = createReportRun({ timeRange: args.time_range, env })
        // Fire and forget — do not await
        executeReportRun({ runId: run.id, env, timeRange: args.time_range }).catch(err =>
          console.error(`[report-agent] run ${run.id} error:`, err)
        )
        return { runId: run.id, status: run.status }
      }
      case 'get_report_run_status': {
        const run = getRun(args.run_id)
        if (!run) return { error: `Run not found: ${args.run_id}` }
        const { findings, workers, ...meta } = run
        return { ...meta, findingCount: findings?.length ?? 0, workerCount: workers?.length ?? 0 }
      }
      case 'get_latest_report': {
        const run = getLatestRunForRange(args.time_range)
        if (!run) return { error: `No report runs found for time range: ${args.time_range}` }
        return run
      }
      case 'list_log_groups': {
        const result = await discoverAllLogGroups({ env, prefix: args.prefix })
        return { logGroups: result.logGroups.map(lg => lg.name), truncated: result.truncated }
      }
      default:
        return { error: `Unknown tool: ${name}` }
    }
  }
}
