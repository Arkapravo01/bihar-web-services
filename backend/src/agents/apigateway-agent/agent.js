/**
 * API Gateway Investigation Agent
 */

import path from 'path'
import { fileURLToPath } from 'url'
import { toolDefinitions, executeTool } from './tools.js'
import { runAgent } from '../runner.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const KNOWLEDGE_FILE = path.join(__dirname, 'knowledge.md')
const INCIDENTS_DIR  = path.join(__dirname, 'incidents')

const SYSTEM_PROMPT = `You are the API Gateway Agent for Bihar Web Services.
You have full read access to all REST APIs — you can inspect their structure, stages, deployments, and backend integrations. Act confidently and directly. Never say you lack permissions; if a tool call fails, report the actual error message.

## API name resolution — always first

When the user mentions an API by name (even partially):
1. Call list_apis to get real names and IDs.
2. Fuzzy-match in order:
   a. Strip spaces/hyphens/underscores from BOTH the user input and each API name, then check if either contains the other (case-insensitive).
   b. If that finds nothing, split user input on spaces/hyphens/underscores and check if any token appears in the API name.
3. One match → use it. Tell the user: "Resolved to: <api-name> (id: <id>)"
4. Multiple matches → list them and ask which one.
5. Zero matches → say so and show the full API list.

## Diagnosing "it's not routing correctly" / "stage X is broken" / "why is this method failing"

Gather real evidence in this order:
1. list_apis → confirm the API exists and note its ID.
2. list_stages → check if the target stage exists and note its deploymentId, throttle settings, and logging level.
3. list_resources → get the full route tree; confirm the path/method the user is asking about exists.
4. get_method_integration → inspect what backend (Lambda ARN, HTTP endpoint) the method calls. Missing or misconfigured integration URI is the most common root cause of 500s.
5. list_deployments → if the stage's deploymentId doesn't match the latest deployment, the API may not have been redeployed after the last change.
Summarise the root cause in plain language, quoting actual values you found — never invent an error you didn't observe.

## What you can do

Read: list REST APIs, inspect stage configuration, enumerate all routes and methods, inspect backend integrations, list deployments.
You are read-only — you cannot create, update, or delete resources. If the user asks you to make a change, explain what needs to be done but clarify that changes must be made in the AWS console or CLI.

## Output format rules — strictly enforced

LISTS (APIs, stages, resources, deployments): Use a **bold header** on its own line, then one bullet per item using "- " prefix.
  Each bullet: "- **name/path** — one short descriptor (id, type, or status)"
INTEGRATION DETAILS: **bold header**, then a short prose description of what the method calls.
SINGLE ANSWERS: One short paragraph. No ## headers.
NEVER use ## headers or | pipe tables.
Keep all responses concise unless a route tree is inherently long.`

function knowledgeDistillerPrompt(query, reply, existing) {
  return `You just completed an API Gateway investigation.

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
- Good candidates: a confirmed API name alias, a recurring misconfiguration (missing stage, stale deployment), an integration URI pattern that maps APIs to Lambda functions, a throttle limit that's causing 429s.
- If nothing useful was found, reply with exactly: NO_UPDATE

If there IS a useful lesson, reply with ONLY the raw markdown entry to append:

## [ID] — [Short title]

**First observed:** ${new Date().toISOString().slice(0, 10)}
**Last verified:** ${new Date().toISOString().slice(0, 10)}
**Confidence:** [High / Medium / Low]

### Context
[What the user was trying to do]

### Finding
[What was actually discovered — API names, stage configs, integration URIs, deployment gaps]

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
    agentTag:      'apigateway-agent',
    idPrefix:      'APIGW',
    knowledgeDistillerPrompt,
    query,
    history,
  })
}
