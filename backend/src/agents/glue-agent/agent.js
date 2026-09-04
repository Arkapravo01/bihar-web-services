/**
 * Glue Investigation Agent
 */

import path from 'path'
import { fileURLToPath } from 'url'
import { toolDefinitions, executeTool } from './tools.js'
import { runAgent } from '../runner.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const KNOWLEDGE_FILE = path.join(__dirname, 'knowledge.md')
const INCIDENTS_DIR  = path.join(__dirname, 'incidents')

const SYSTEM_PROMPT = `You are the Glue Agent for Bihar Web Services.
You have full access to AWS Glue — you can inspect jobs, crawlers, databases, tables, and connections, and you can start job runs. Act confidently and directly. Never say you lack permissions; if a tool call fails, report the actual error message.

## Resource name resolution — always first

When the user mentions a job, crawler, or database by name (even partially):
1. Call the relevant list tool (list_jobs / list_crawlers / list_databases).
2. Fuzzy-match: strip spaces/hyphens/underscores from both sides, check if either contains the other (case-insensitive). Then try token matching.
3. One match → use it, tell the user: "Resolved to: <name>"
4. Multiple matches → list them and ask which one.
5. Zero matches → say so and show the full list.

## Diagnosing a failed or stuck job

1. list_jobs → confirm the job exists.
2. get_job_detail → check type, Glue version, worker type, timeout, script location, default args.
3. list_job_runs → scan the most recent runs for FAILED or TIMEOUT states.
4. If a run failed, note the errorMessage — this is usually the root cause.
5. If the issue is recurrent, check whether the timeout (in minutes) is too low for the data volume.
Summarise root cause in plain language, quoting the actual error text.

## Diagnosing a crawler that isn't cataloguing data

1. list_crawlers → find it.
2. get_crawler_detail → check targets (S3/JDBC), database, schedule, state.
3. list_crawl_history → look for FAILED or CANCELLED crawls and their error messages.
4. If state is RUNNING, tell the user it's currently crawling.

## Starting a job

Only start a job run on clear, explicit instruction. Confirm the job name before calling start_job_run.

## Output format rules — strictly enforced

LISTS (jobs, crawlers, databases, tables): **bold header** on its own line, then one bullet per item: "- **name** — one short descriptor"
JOB RUNS: **bold header**, then one bullet per run: "- **runId** — state, duration/error"
SINGLE ITEMS: One short paragraph. No ## headers.
ACTIONS (start run): One sentence confirmation, then bullet list of what was triggered.
NEVER use ## headers or | pipe tables.
Keep all responses concise unless a list is inherently long.`

function knowledgeDistillerPrompt(query, reply, existing) {
  return `You just completed a Glue investigation.

User query: ${query}

Your findings:
${reply}

Current knowledge.md contents:
${existing || '(empty)'}

TASK: Decide whether this investigation revealed a genuinely reusable pattern.

Rules:
- Only write a new entry if the finding is concrete and verified (not speculation).
- Do NOT duplicate an entry that already exists.
- Do NOT write an entry for trivial or one-off queries.
- Good candidates: a confirmed job name alias, a recurring failure pattern, a script location pattern, a crawler target that maps to a known database, a timeout that's consistently too low.
- If nothing useful was found, reply with exactly: NO_UPDATE

If there IS a useful lesson, reply with ONLY the raw markdown entry to append:

## [ID] — [Short title]

**First observed:** ${new Date().toISOString().slice(0, 10)}
**Last verified:** ${new Date().toISOString().slice(0, 10)}
**Confidence:** [High / Medium / Low]

### Context
[What the user was trying to do]

### Finding
[What was actually discovered — job names, error patterns, crawler targets, timeout values]

### How to use this next time
[How this knowledge should change future investigations]

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
    agentTag:      'glue-agent',
    idPrefix:      'GLUE',
    knowledgeDistillerPrompt,
    query,
    history,
  })
}
