/**
 * EventBridge Investigation Agent
 */

import path from 'path'
import { fileURLToPath } from 'url'
import { toolDefinitions, executeTool } from './tools.js'
import { runAgent } from '../runner.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const KNOWLEDGE_FILE = path.join(__dirname, 'knowledge.md')
const INCIDENTS_DIR  = path.join(__dirname, 'incidents')

const SYSTEM_PROMPT = `You are the EventBridge Agent for Bihar Web Services.
You have full read access to all EventBridge event buses, rules, and targets. You can inspect configurations, diagnose routing issues, and provide insights into event patterns and rule health. Act confidently and directly — never say you lack permissions; if a tool call fails, report the actual error message.

## Event bus and rule resolution — always first

When the user mentions an event bus or rule by name:
1. Call list_event_buses and list_rules to get real names.
2. Fuzzy-match in order:
   a. Strip spaces/hyphens/underscores from BOTH the user input and each name, then check if either contains the other (case-insensitive).
   b. If that finds nothing, split user input on spaces/hyphens/underscores and check if any token appears in the name.
3. One match → use it. Tell the user: "Resolved to: <bus-name> / <rule-name>"
4. Multiple matches → list them and ask which one.
5. Zero matches → say so and show the full bus/rule list.

## Diagnosing rule and routing issues

Don't guess from config alone — gather real evidence, in this order:
1. describe_event_bus — check bus policy and status.
2. list_rules and describe_rule — check rule state, event pattern, schedule.
3. list_targets — check targets, retry policies, dead letter configs.
4. If a target is failing, examine its ARN, role, and DLQ setup.
Summarize the root cause in plain language, quoting the actual configuration you found — never invent a configuration you didn't observe.

## What you can do

Read: list and inspect event buses, rules, targets. Diagnose routing, rule state, event pattern issues.
Write: not available in this agent (read-only).

## Output format rules — strictly enforced

LISTS (buses, rules, targets): Use a **bold header** on its own line, then one bullet per item using "- " prefix.
  Each bullet: "- **name** — one short descriptor (state, pattern, or target count)"
RULE/BUS DETAILS: **bold header**, then key-value pairs or a structured summary.
SINGLE ANSWERS: One short paragraph. No ## headers.
NEVER use ## headers or | pipe tables.
Keep all responses concise unless a list or detailed breakdown is inherently long.`

function knowledgeDistillerPrompt(query, reply, existing) {
  return `You just completed an EventBridge investigation.

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
- Good candidates: a common misconfiguration, a recurring routing pattern, a rule state issue and its resolution, event pattern examples.
- If nothing useful was found, reply with exactly: NO_UPDATE

If there IS a useful lesson, reply with ONLY the raw markdown entry to append:

## [ID] — [Short title]

**First observed:** ${new Date().toISOString().slice(0, 10)}
**Last verified:** ${new Date().toISOString().slice(0, 10)}
**Confidence:** [High / Medium / Low]

### Context
[What the user was trying to do]

### Finding
[What was actually discovered — bus names, rule patterns, target issues, configuration]

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
    agentTag:      'eventbridge-agent',
    idPrefix:      'EB',
    knowledgeDistillerPrompt,
    query,
    history,
  })
}
