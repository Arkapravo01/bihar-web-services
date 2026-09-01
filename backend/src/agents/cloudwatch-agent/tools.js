/**
 * CloudWatch Agent — Tool definitions
 *
 * Each entry is an Anthropic tool definition (name/description/input_schema)
 * plus a matching `execute` function the agent loop calls.
 */

import * as cwService from '../../services/cloudwatch.service.js'

// ─── tool definitions — OpenAI function-calling format ──────────────────────

export const toolDefinitions = [
  {
    type: 'function',
    function: {
      name: 'list_log_groups',
      description: 'List available CloudWatch log groups. Use to discover which log groups exist before investigating.',
      parameters: {
        type: 'object',
        properties: {
          prefix: { type: 'string', description: 'Optional name prefix to filter log groups.' },
          limit:  { type: 'number', description: 'Max results to return (default 50).' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'filter_log_events',
      description: 'Search log events in a log group by time range and/or filter pattern. Use for targeted searches (errors, keywords, service names).',
      parameters: {
        type: 'object',
        properties: {
          log_group_name: { type: 'string', description: 'Full log group name (e.g. /aws/lambda/my-service).' },
          filter_pattern: { type: 'string', description: 'CloudWatch filter pattern (e.g. "ERROR", "Exception", "timeout").' },
          start_time:     { type: 'number', description: 'Start of search window as Unix epoch milliseconds.' },
          end_time:       { type: 'number', description: 'End of search window as Unix epoch milliseconds.' },
          limit:          { type: 'number', description: 'Max events to return (default 100).' },
        },
        required: ['log_group_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_insights_query',
      description: 'Run a CloudWatch Logs Insights query across one or more log groups. Prefer this for aggregation, correlation, or multi-group investigations. Returns results directly (polls until complete).',
      parameters: {
        type: 'object',
        properties: {
          log_group_names: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of log group names to query.',
          },
          query_string: {
            type: 'string',
            description: 'CloudWatch Logs Insights query (fields, filter, sort, limit).',
          },
          start_time: { type: 'number', description: 'Query start as Unix epoch milliseconds.' },
          end_time:   { type: 'number', description: 'Query end as Unix epoch milliseconds.' },
        },
        required: ['log_group_names', 'query_string', 'start_time', 'end_time'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_log_events',
      description: 'Retrieve raw log events from a specific log stream. Use when you already know the log group and stream and want surrounding context.',
      parameters: {
        type: 'object',
        properties: {
          log_group_name:  { type: 'string', description: 'Full log group name.' },
          log_stream_name: { type: 'string', description: 'Log stream name.' },
          start_time:      { type: 'number', description: 'Start of window as Unix epoch milliseconds.' },
          end_time:        { type: 'number', description: 'End of window as Unix epoch milliseconds.' },
          limit:           { type: 'number', description: 'Max events to return (default 100).' },
        },
        required: ['log_group_name', 'log_stream_name'],
      },
    },
  },
]

// ─── tool execution ─────────────────────────────────────────────────────────

export async function executeTool(name, input) {
  switch (name) {
    case 'list_log_groups': {
      const result = await cwService.listLogGroups({
        logGroupNamePrefix: input.prefix,
        limit: input.limit ?? 50,
      })
      return result
    }

    case 'filter_log_events': {
      const result = await cwService.filterLogEvents(input.log_group_name, {
        filterPattern: input.filter_pattern,
        startTime: input.start_time,
        endTime: input.end_time,
        limit: Math.min(input.limit ?? 20, 20),  // hard cap at 20 events
      })
      // Truncate each message to 300 chars to save context
      result.events = result.events.map((e) => ({ ...e, message: e.message?.slice(0, 300) }))
      return result
    }

    case 'run_insights_query': {
      const { queryId } = await cwService.startInsightsQuery(
        input.log_group_names,
        input.query_string,
        Math.floor(input.start_time / 1000),
        Math.floor(input.end_time   / 1000),
      )
      const deadline = Date.now() + 30_000
      while (Date.now() < deadline) {
        const res = await cwService.getInsightsQueryResults(queryId)
        if (res.status === 'Complete' || res.status === 'Failed' || res.status === 'Cancelled') {
          // Limit to 15 results, truncate messages
          res.results = (res.results ?? []).slice(0, 15).map((row) =>
            row.map((field) => ({ ...field, value: field.value?.slice(0, 300) }))
          )
          return res
        }
        await new Promise((r) => setTimeout(r, 1500))
      }
      return { status: 'Timeout', results: [], statistics: null }
    }

    case 'get_log_events': {
      const result = await cwService.getLogEvents(input.log_group_name, input.log_stream_name, {
        startTime: input.start_time,
        endTime: input.end_time,
        limit: Math.min(input.limit ?? 20, 20),  // hard cap at 20 events
        startFromHead: true,
      })
      result.events = result.events.map((e) => ({ ...e, message: e.message?.slice(0, 300) }))
      return result
    }

    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}
