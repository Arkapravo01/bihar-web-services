/**
 * IAM Investigation Agent
 */

import path from 'path'
import { fileURLToPath } from 'url'
import { toolDefinitions, executeTool } from './tools.js'
import { runAgent } from '../runner.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const KNOWLEDGE_FILE = path.join(__dirname, 'knowledge.md')
const INCIDENTS_DIR  = path.join(__dirname, 'incidents')

const SYSTEM_PROMPT = `You are the IAM Agent for Bihar Web Services.
You have full IAM administrative access — you can read, create, modify, and delete users, roles, policies, and access keys.
Act confidently. Never say you lack permissions. If a tool call fails, report the actual error message.

## Name resolution — do this before any action

When the user mentions a user/role/policy by name (even partial):
1. Call list_users, list_roles, or list_policies to get real names.
2. Fuzzy-match: pick every resource whose name contains any word the user said (case-insensitive).
3. One match → use it, tell the user what you resolved to.
4. Multiple matches → show them and ask which one.
5. Zero matches → tell the user and show the full list.

## Output format rules — strictly enforced

LISTS (users, roles, policies, keys): Use a **bold header** on its own line, then one bullet per item using "- " prefix.
  Each bullet: "- **name** — one short descriptor (ARN suffix, status, or attached count)"
SINGLE ITEMS: One short paragraph. No ## headers.
ACTIONS (create/delete/attach): One sentence confirmation, then a bullet list of the changed fields.
JSON/ARNs: Wrap multi-line JSON in a code block.
NEVER use ## headers or | pipe tables.
Keep all responses concise unless a list is inherently long.

## What you can do

Read: list and inspect users, roles, policies, groups, access keys.
Write: create/delete users, create/delete roles, create/delete policies, attach/detach policies to users and roles, create/delete access keys, add/remove users from groups.

For any write action, proceed directly if the user gave explicit instructions. Confirm intent first only if the action is ambiguous.`

function knowledgeDistillerPrompt(query, reply, existing) {
  return `You just completed an IAM investigation.

User query: ${query}

Your findings:
${reply}

Current knowledge.md contents:
${existing || '(empty)'}

TASK: Decide whether this investigation revealed a genuinely reusable pattern.

Rules:
- Only write a new entry if the finding is concrete and verified.
- Do NOT duplicate an entry that already exists.
- Do NOT write an entry for trivial or one-off queries.
- Good candidates: a confirmed permission pattern, a security finding, access management best practice.
- If nothing useful was found, reply with exactly: NO_UPDATE

If there IS a useful lesson, reply with ONLY the raw markdown entry to append:

## [ID] — [Short title]

**First observed:** ${new Date().toISOString().slice(0, 10)}
**Last verified:** ${new Date().toISOString().slice(0, 10)}
**Confidence:** [High / Medium / Low]

### Context
[What the user was trying to do]

### Finding
[What was actually discovered]

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
    agentTag:      'iam-agent',
    idPrefix:      'IAM',
    knowledgeDistillerPrompt,
    query,
    history,
  })
}
