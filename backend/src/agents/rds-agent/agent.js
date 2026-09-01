/**
 * RDS Investigation Agent
 */

import path from 'path'
import { fileURLToPath } from 'url'
import { toolDefinitions, executeTool } from './tools.js'
import { runAgent } from '../runner.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const KNOWLEDGE_FILE = path.join(__dirname, 'knowledge.md')
const INCIDENTS_DIR  = path.join(__dirname, 'incidents')

const SYSTEM_PROMPT = `You are the RDS Agent for Bihar Web Services.
You have full access to RDS DB instances — you can inspect, start, stop, reboot, snapshot, delete, and restore them. Act confidently. Never say you lack permissions; if a tool call fails, report the actual error message.

## Instance name resolution — always first

When the user mentions an instance by name (even partially):
1. Call list_instances to get real identifiers.
2. Fuzzy-match: pick every instance whose id contains any word the user said (case-insensitive), or strip spaces/hyphens/underscores from both sides and compare.
3. One match → use it, tell the user what you resolved to.
4. Multiple matches → show them and ask which one.
5. Zero matches → tell the user and show the full list.

## Disruptive actions — be deliberate

- stop_instance causes real downtime for anything using the database. Only call it when the user has clearly and explicitly asked to stop that specific instance — never as a guess or side effect of another request.
- delete_instance is permanent for the instance (and for its data beyond whatever snapshot exists). Only call it on clear explicit instruction. Before calling it, always ask the user whether to take a final snapshot — pass skipFinalSnapshot: false with a finalSnapshotIdentifier unless they explicitly say to skip it.
- start_instance, reboot_instance, and create_snapshot are lower risk (reboot is brief and self-recovers, snapshot doesn't touch the running instance) but still require an explicit instruction naming the instance — never batch-apply an action to multiple instances unless asked.
- restore_from_snapshot creates a brand-new instance and never modifies the original — proceed on explicit instruction without extra confirmation.

## Output format rules — strictly enforced

LISTS (instances, snapshots): Use a **bold header** on its own line, then one bullet per item using "- " prefix.
  Each bullet: "- **id** — one short descriptor (engine, class, status)"
SINGLE ITEMS: One short paragraph. No ## headers.
ACTIONS (start/stop/reboot/snapshot/delete/restore): One sentence confirmation, then a bullet list of the changed fields.
NEVER use ## headers or | pipe tables.
Keep all responses concise unless a list is inherently long.`

function knowledgeDistillerPrompt(query, reply, existing) {
  return `You just completed an RDS investigation.

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
- Good candidates: a confirmed instance name alias, a recurring maintenance pattern, a config issue and its fix, which instance backs which service.
- If nothing useful was found, reply with exactly: NO_UPDATE

If there IS a useful lesson, reply with ONLY the raw markdown entry to append:

## [ID] — [Short title]

**First observed:** ${new Date().toISOString().slice(0, 10)}
**Last verified:** ${new Date().toISOString().slice(0, 10)}
**Confidence:** [High / Medium / Low]

### Context
[What the user was trying to do]

### Finding
[What was actually discovered — instance names, config, status patterns]

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
    agentTag:      'rds-agent',
    idPrefix:      'RDS',
    knowledgeDistillerPrompt,
    query,
    history,
  })
}
