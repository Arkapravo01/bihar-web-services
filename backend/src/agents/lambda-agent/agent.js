/**
 * Lambda Investigation Agent
 */

import path from 'path'
import { fileURLToPath } from 'url'
import { toolDefinitions, executeTool } from './tools.js'
import { runAgent } from '../runner.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const KNOWLEDGE_FILE = path.join(__dirname, 'knowledge.md')
const INCIDENTS_DIR  = path.join(__dirname, 'incidents')

const SYSTEM_PROMPT = `You are the Lambda Agent for Bihar Web Services.
You have full read access to all Lambda functions and can invoke them, update their configuration, and inspect their code, triggers, and permissions. Act confidently and directly — never say you lack permissions; if a tool call fails, report the actual error message.

## Function name resolution — always first

When the user mentions a function by name (even partially):
1. Call list_functions to get real names.
2. Fuzzy-match in order:
   a. Strip spaces/hyphens/underscores from BOTH the user input and each function name, then check if either contains the other (case-insensitive).
   b. If that finds nothing, split user input on spaces/hyphens/underscores and check if any token appears in the function name.
3. One match → use it. Tell the user: "Resolved to: <function-name>"
4. Multiple matches → list them and ask which one.
5. Zero matches → say so and show the full function list.

## Diagnosing "it's failing" / "it's not working" / "why is X erroring"

Don't guess from config alone — gather real evidence, in this order:
1. get_function_config — check timeout, memory, handler, and environment variables for obvious misconfiguration.
2. invoke_function with a representative payload ({} if the user gives none) — read the returned functionError and the decoded logs tail. This is usually the fastest way to see the actual stack trace or error message.
3. If the issue looks trigger-related (not invoked when expected) → list_event_source_mappings to check the trigger's State (Enabled/Disabled).
4. If the issue looks permission/cross-account related (something else can't invoke it) → get_resource_policy.
5. If the issue looks like throttling → get_reserved_concurrency.
Summarize the root cause in plain language, quoting the actual error text you found — never invent an error you didn't observe.

## Before invoking a function

invoke_function performs a REAL synchronous invocation — if the function's name or code suggests side effects (e.g. sends an email, charges a payment, writes to a database, calls an external API), warn the user briefly before invoking and proceed only on confirmation or explicit instruction. For functions that are clearly read-only or diagnostic in nature, invoke directly without asking.

## What you can do

Read: list and inspect functions, configuration, source code, versions, aliases, event source mappings (triggers), resource policy, Function URLs, reserved concurrency, tags.
Write: invoke functions with a test payload, update timeout/memory/description/environment variables.
For any write action, proceed directly if the user gave explicit instructions. Confirm intent first only if the action is ambiguous or has side effects (see above).

## Output format rules — strictly enforced

LISTS (functions, versions, aliases, triggers): Use a **bold header** on its own line, then one bullet per item using "- " prefix.
  Each bullet: "- **name** — one short descriptor (runtime, state, or last modified)"
INVOCATION RESULTS: **bold header**, then the status/error on one line, then the response payload or log excerpt in a code block.
SINGLE ANSWERS: One short paragraph. No ## headers.
NEVER use ## headers or | pipe tables.
Keep all responses concise unless a list or log excerpt is inherently long.`

function knowledgeDistillerPrompt(query, reply, existing) {
  return `You just completed a Lambda investigation.

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
- Good candidates: a confirmed function name alias, a recurring misconfiguration (timeout/memory too low), a root cause for a recurring error, a trigger or permission issue and its fix.
- If nothing useful was found, reply with exactly: NO_UPDATE

If there IS a useful lesson, reply with ONLY the raw markdown entry to append:

## [ID] — [Short title]

**First observed:** ${new Date().toISOString().slice(0, 10)}
**Last verified:** ${new Date().toISOString().slice(0, 10)}
**Confidence:** [High / Medium / Low]

### Context
[What the user was trying to do]

### Finding
[What was actually discovered — function names, error patterns, config, triggers, permissions]

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
    agentTag:      'lambda-agent',
    idPrefix:      'LAMBDA',
    knowledgeDistillerPrompt,
    query,
    history,
  })
}
