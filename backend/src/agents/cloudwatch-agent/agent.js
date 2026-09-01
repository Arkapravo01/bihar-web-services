/**
 * CloudWatch Investigation Agent
 */

import path from 'path'
import { fileURLToPath } from 'url'
import { toolDefinitions, executeTool } from './tools.js'
import { runAgent } from '../runner.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const KNOWLEDGE_FILE = path.join(__dirname, 'knowledge.md')
const INCIDENTS_DIR  = path.join(__dirname, 'incidents')

const SYSTEM_PROMPT = `You are the CloudWatch Agent for Bihar Web Services.
You investigate AWS log groups, errors, and service health. Act immediately — never ask for clarification before calling tools.

## Investigation rules

- Start with list_log_groups to discover services, then drill in with filter_log_events or run_insights_query.
- No time specified → investigate the last 24 hours. Use Unix epoch milliseconds for time parameters.
- For error counts or aggregations, prefer run_insights_query over filter_log_events.
- Never invent log data — only report what tools return.

## Output format rules — strictly enforced

LISTS (log groups, streams): Use a **bold header** on its own line, then one bullet per item using "- " prefix.
  Each bullet: "- **name** — one short descriptor (retention, size, or last event)"
ERROR SUMMARIES: **bold header**, then one bullet per error: "- **time** — log group: message (80 chars max)"
COUNTS / STATS: **bold header**, then one bullet per metric: "- **metric name** — value"
SINGLE ANSWERS: One short paragraph. No ## headers.
NEVER use ## headers or | pipe tables.
Keep all responses concise unless a list is inherently long.`

function knowledgeDistillerPrompt(query, reply, existing) {
  return `You just completed a CloudWatch investigation.

User query: ${query}

Your findings:
${reply}

Current knowledge.md contents:
${existing || '(empty)'}

TASK: Decide whether this investigation revealed a genuinely reusable pattern.

Rules:
- Only write a new entry if the finding is concrete and verified (not speculation).
- Do NOT duplicate an entry that already exists in the knowledge above.
- Do NOT write an entry for trivial or one-off queries with no reusable lesson.
- If nothing useful was found, reply with exactly: NO_UPDATE

If there IS a useful lesson, reply with ONLY the raw markdown entry to append:

## [ID] — [Short title]

**First observed:** ${new Date().toISOString().slice(0, 10)}
**Last verified:** ${new Date().toISOString().slice(0, 10)}
**Confidence:** [High / Medium / Low]

### Symptom
[What the user reported or what was observed]

### Root Cause
[What actually caused it, if determined]

### How to recognise it
[Key log patterns, error messages, or indicators]

### Investigation steps
[Numbered steps for next time]

### Lesson
[One or two sentences summarising the takeaway]`
}

export async function runInvestigation(query, history = []) {
  return runAgent({
    systemPrompt: SYSTEM_PROMPT,
    toolDefinitions,
    executeTool,
    knowledgeFile: KNOWLEDGE_FILE,
    incidentsDir:  INCIDENTS_DIR,
    agentTag:      'cloudwatch-agent',
    idPrefix:      'CW',
    knowledgeDistillerPrompt,
    query,
    history,
  })
}
