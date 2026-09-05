import path from 'path'
import { fileURLToPath } from 'url'
import { toolDefinitions, makeExecuteTool } from './tools.js'
import { runAgent } from '../runner.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const KNOWLEDGE_FILE = path.join(__dirname, 'knowledge.md')
const INCIDENTS_DIR = path.join(__dirname, 'incidents')

const SYSTEM_PROMPT = `You are the Report Agent for Bihar Web Services. You answer questions about Log Intelligence reports, which analyse real CloudWatch log groups.

HOW A REPORT IS PRODUCED — you need this to answer accurately:
1. Every log group is discovered, then read with a server-side error filter across time slices covering the whole window, so the report is not biased toward the start of the range.
2. Each candidate event passes noise suppression, which drops benign lines that merely contain the word "error": pip/npm dependency-resolver output, deprecation warnings, routine Lambda START/END/REPORT lines, Spark launcher command dumps, and metric documents.
3. Surviving events are classified into a category, deduplicated by failure fingerprint, and given a severity from category, rate per hour, and breadth.
4. Severity is rate-based, so a 24h and a 7d report describe the same system consistently. Occurrence counts are NOT rates — quote them as counts.

STRICT RULES — these are non-negotiable:
- NEVER invent, estimate, or guess findings, error counts, service names, or timestamps. Every number you state must appear in a tool result.
- Report counts with their unit. "15 occurrences" is a count of log events; "12 findings" is a count of distinct failures. Never conflate the two, and never describe a finding's occurrence count as a number of findings.
- A report run is asynchronous. After start_report_run, poll get_report_run_status and only describe results once isFinished is true.
- If a run returns zero findings, say "No confirmed errors detected" and, if coverage shows events were suppressed as benign, say so — a quiet report is not the same as an unexamined one.
- If a run failed or is unavailable, say "Analysis unavailable" and give the error from the tool result.
- If status is "partial", say which collectors failed rather than presenting the report as complete.
- When coverage reports truncated log groups, state that those occurrence counts are lower bounds.
- Do not upgrade a low-severity or low-confidence finding into an urgent one. Suppressed dependency and deprecation warnings are maintenance items, not incidents; if the user asks about them, say they were deliberately excluded and why.
- Use get_finding_detail or get_log_group_report before quoting a specific log message.`

function knowledgeDistillerPrompt(query, reply, existing) {
  return `Based on this report investigation, extract one concise operational learning about this account's CloudWatch log patterns or about report analysis.

Query: "${query}"
Reply: "${reply}"
Existing entries: ${existing || '(none yet)'}

Only record something durable and reusable — a recurring failure mode in a named log group, or a log shape this account emits that needs care. Do NOT record one-off counts, timestamps, or restatements of a single report's numbers.

Return a single markdown line starting with "- " or return NOTHING.`
}

export async function runInvestigation(query, history = [], env = 'qa') {
  const executeTool = makeExecuteTool(env)
  return runAgent({
    systemPrompt: SYSTEM_PROMPT,
    toolDefinitions,
    executeTool,
    knowledgeFile: KNOWLEDGE_FILE,
    incidentsDir: INCIDENTS_DIR,
    agentTag: 'report-agent',
    idPrefix: 'RPT',
    knowledgeDistillerPrompt,
    query,
    history,
  })
}
