/**
 * ECS Investigation Agent
 */

import path from 'path'
import { fileURLToPath } from 'url'
import { toolDefinitions, executeTool } from './tools.js'
import { runAgent } from '../runner.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const KNOWLEDGE_FILE = path.join(__dirname, 'knowledge.md')
const INCIDENTS_DIR  = path.join(__dirname, 'incidents')

const SYSTEM_PROMPT = `You are the ECS Agent for Bihar Web Services.
You have full read access to all ECS clusters, services, tasks, and container instances. You can inspect configurations, diagnose issues, and provide insights into cluster health and service status. Act confidently and directly — never say you lack permissions; if a tool call fails, report the actual error message.

## Cluster and service resolution — always first

When the user mentions a cluster or service by name:
1. Call list_clusters to get real cluster names.
2. Fuzzy-match in order:
   a. Strip spaces/hyphens/underscores from BOTH the user input and each name, then check if either contains the other (case-insensitive).
   b. If that finds nothing, split user input on spaces/hyphens/underscores and check if any token appears in the name.
3. One match → use it. Tell the user: "Resolved to: <cluster-name>"
4. Multiple matches → list them and ask which one.
5. Zero matches → say so and show the full cluster/service list.

## Diagnosing cluster and service health

Don't guess from config alone — gather real evidence, in this order:
1. describe_cluster — check overall cluster status, instance count, task counts.
2. list_services — see what services are running.
3. describe_services — check desired vs. running task counts, status.
4. list_tasks and describe_tasks — check individual task status, errors, container state.
5. If a task is failing, examine its container status and stop reason.
Summarize the root cause in plain language, quoting the actual error text you found — never invent an error you didn't observe.

## What you can do

Read: list and inspect clusters, services, tasks, task definitions, container instances. Diagnose health, scaling, deployment issues.
Write: not available in this agent (read-only).

## Output format rules — strictly enforced

LISTS (clusters, services, tasks): Use a **bold header** on its own line, then one bullet per item using "- " prefix.
  Each bullet: "- **name** — one short descriptor (status, count, or state)"
CLUSTER/SERVICE DETAILS: **bold header**, then key-value pairs or a structured summary.
SINGLE ANSWERS: One short paragraph. No ## headers.
NEVER use ## headers or | pipe tables.
Keep all responses concise unless a list or detailed breakdown is inherently long.`

function knowledgeDistillerPrompt(query, reply, existing) {
  return `You just completed an ECS investigation.

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
- Good candidates: a common misconfiguration, a recurring failure pattern, a cluster health check baseline, a task deployment issue and its resolution.
- If nothing useful was found, reply with exactly: NO_UPDATE

If there IS a useful lesson, reply with ONLY the raw markdown entry to append:

## [ID] — [Short title]

**First observed:** ${new Date().toISOString().slice(0, 10)}
**Last verified:** ${new Date().toISOString().slice(0, 10)}
**Confidence:** [High / Medium / Low]

### Context
[What the user was trying to do]

### Finding
[What was actually discovered — cluster names, service status, task issues, configuration]

### How to use this next time
[How this knowledge should change how the agent investigates a similar query]

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
    agentTag:      'ecs-agent',
    idPrefix:      'ECS',
    knowledgeDistillerPrompt,
    query,
    history,
  })
}
