/**
 * Report Agent tools — conversational interface to the report pipeline.
 *
 * Every tool returns a COMPACT projection. `get_latest_report` used to return
 * the whole run object: 69 collector records plus every finding with five
 * 500-character evidence samples each. Stored runs reached 5 MB, so the model
 * was handed far more than it could attend to and answered from whichever
 * fragment it happened to focus on. Findings are now summarised, capped, and
 * fetched in detail only when asked for by id or log group.
 */

import { createReportRun, getRun, getLatestRunForRange, listRunSummaries } from './store.js'
import { executeReportRun } from './engine/reportRunner.js'
import { discoverAllLogGroups } from './engine/cwGateway.js'

const MAX_FINDINGS_IN_SUMMARY = 15

export const toolDefinitions = [
  {
    type: 'function',
    function: {
      name: 'start_report_run',
      description:
        'Start a new log intelligence report run that discovers all CloudWatch log groups, analyzes real events, and produces findings. Returns immediately with a run id — the run takes a minute or more, so poll get_report_run_status before claiming any result.',
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
      description: 'Get the current stage and progress of a report run. Does not include findings.',
      parameters: {
        type: 'object',
        properties: { run_id: { type: 'string', description: 'The run ID returned by start_report_run' } },
        required: ['run_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_latest_report',
      description:
        'Get the most recent completed report for a time range: KPIs, coverage accounting, the ranked finding summaries, and the report narrative. Use this to answer questions about current state.',
      parameters: {
        type: 'object',
        properties: { time_range: { type: 'string', enum: ['24h', '7d'], description: 'Time range to look up' } },
        required: ['time_range'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_finding_detail',
      description:
        'Get the full detail of one finding — every evidence sample with its message, timestamp, log stream and CloudWatch link. Use after get_latest_report when the user asks what a specific finding actually says.',
      parameters: {
        type: 'object',
        properties: {
          time_range: { type: 'string', enum: ['24h', '7d'] },
          finding_id: { type: 'string', description: 'Finding id from get_latest_report' },
        },
        required: ['time_range', 'finding_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_log_group_report',
      description:
        'Get the findings and collection outcome for ONE log group from the latest report. Use when the user asks about a specific log group or service.',
      parameters: {
        type: 'object',
        properties: {
          time_range: { type: 'string', enum: ['24h', '7d'] },
          log_group_name: { type: 'string', description: 'Exact log group name, e.g. /aws/lambda/my-function' },
        },
        required: ['time_range', 'log_group_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_report_runs',
      description: 'List recent report runs with their status and finding counts. Use to compare a previous run with the latest one.',
      parameters: {
        type: 'object',
        properties: {
          time_range: { type: 'string', enum: ['24h', '7d'] },
          limit: { type: 'number', description: 'How many runs to list (default 10)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_log_groups',
      description: 'List CloudWatch log groups that exist in this environment.',
      parameters: {
        type: 'object',
        properties: { prefix: { type: 'string', description: 'Optional log group name prefix filter' } },
        required: [],
      },
    },
  },
]

function summarizeFinding(f) {
  return {
    id: f.id,
    category: f.category,
    severity: f.severity,
    confidence: f.confidence,
    occurrences: f.count,
    occurrencesPerHour: f.occurrencesPerHour,
    logGroupName: f.logGroupName,
    firstSeen: f.firstSeen,
    lastSeen: f.lastSeen,
    affectedStreamCount: f.affectedStreamCount,
    isRecurring: f.isRecurring,
    recurrenceDescription: f.recurrenceDescription,
    isRollup: f.isRollup ?? false,
    sampleMessage: f.evidence?.[f.evidence.length - 1]?.message?.slice(0, 300) ?? null,
  }
}

function reportSummary(run) {
  const findings = run.findings ?? []
  return {
    runId: run.id,
    status: run.status,
    timeRange: run.timeRange,
    env: run.env,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    kpis: run.kpis,
    // How the numbers were reached — lets the agent explain a quiet report
    // instead of guessing at one.
    coverage: run.coverage ?? null,
    findingsReturned: Math.min(findings.length, MAX_FINDINGS_IN_SUMMARY),
    findingsTotal: findings.length,
    findings: findings.slice(0, MAX_FINDINGS_IN_SUMMARY).map(summarizeFinding),
    correlations: (run.correlations ?? []).slice(0, 10),
    rootCause: run.rootCause,
    executiveSummary: run.executiveSummary,
    error: run.error ?? null,
  }
}

export function makeExecuteTool(env) {
  return async function executeTool(name, args) {
    switch (name) {
      case 'start_report_run': {
        const run = createReportRun({ timeRange: args.time_range, env })
        // Fire and forget — do not await
        executeReportRun({ runId: run.id, env, timeRange: args.time_range }).catch((err) =>
          console.error(`[report-agent] run ${run.id} error:`, err),
        )
        return {
          runId: run.id,
          status: run.status,
          note: 'Run started. It is not finished — poll get_report_run_status with this runId before reporting any findings.',
        }
      }

      case 'get_report_run_status': {
        const run = getRun(args.run_id)
        if (!run) return { error: `Run not found: ${args.run_id}` }
        return {
          runId: run.id,
          status: run.status,
          timeRange: run.timeRange,
          startedAt: run.startedAt,
          completedAt: run.completedAt,
          logGroupsDiscovered: run.logGroupsDiscovered,
          collectorsSpawned: run.workersSpawned,
          collectorsCompleted: run.workersCompleted,
          collectorsFailed: run.workersFailed,
          specialists: (run.specialists ?? []).map((s) => ({ name: s.name, status: s.status, findingsCount: s.findingsCount })),
          findingCount: run.findings?.length ?? 0,
          isFinished: ['complete', 'partial', 'failed'].includes(run.status),
          error: run.error ?? null,
        }
      }

      case 'get_latest_report': {
        const run = getLatestRunForRange(args.time_range)
        if (!run) return { error: `No report runs found for time range: ${args.time_range}. Use start_report_run first.` }
        if (!['complete', 'partial', 'failed'].includes(run.status)) {
          return { runId: run.id, status: run.status, isFinished: false, note: 'The most recent run is still in progress. Poll get_report_run_status.' }
        }
        return reportSummary(run)
      }

      case 'get_finding_detail': {
        const run = getLatestRunForRange(args.time_range)
        if (!run) return { error: `No report runs found for time range: ${args.time_range}` }
        const finding = (run.findings ?? []).find((f) => f.id === args.finding_id)
        if (!finding) return { error: `Finding not found in the latest ${args.time_range} report: ${args.finding_id}` }
        return { runId: run.id, timeRange: run.timeRange, finding }
      }

      case 'get_log_group_report': {
        const run = getLatestRunForRange(args.time_range)
        if (!run) return { error: `No report runs found for time range: ${args.time_range}` }
        const name = args.log_group_name
        const analysis = (run.logGroupAnalyses ?? []).find((a) => a.logGroupName === name)
        if (!analysis) {
          return {
            error: `Log group "${name}" was not part of the latest ${args.time_range} report.`,
            availableLogGroups: (run.logGroupAnalyses ?? []).map((a) => a.logGroupName).slice(0, 60),
          }
        }
        const collector = (run.workers ?? []).find((w) => w.logGroupName === name)
        return {
          runId: run.id,
          timeRange: run.timeRange,
          logGroupName: name,
          analysis,
          collection: collector
            ? {
                status: collector.status,
                candidateEvents: collector.rawEventCount,
                suppressedAsBenign: collector.suppressedCount,
                suppressedByRule: collector.suppressedByRule,
                unclassified: collector.unclassifiedCount,
                truncated: collector.truncated,
                error: collector.error,
              }
            : null,
          findings: (run.findings ?? []).filter((f) => f.logGroupName === name).map(summarizeFinding),
        }
      }

      case 'list_report_runs': {
        return { runs: listRunSummaries({ timeRange: args.time_range, limit: args.limit ?? 10 }) }
      }

      case 'list_log_groups': {
        const result = await discoverAllLogGroups({ env, prefix: args.prefix })
        return { count: result.logGroups.length, logGroups: result.logGroups.map((lg) => lg.name) }
      }

      default:
        return { error: `Unknown tool: ${name}` }
    }
  }
}
