/**
 * S3 Investigation Agent
 */

import path from 'path'
import { fileURLToPath } from 'url'
import { toolDefinitions, executeTool } from './tools.js'
import { runAgent } from '../runner.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const KNOWLEDGE_FILE = path.join(__dirname, 'knowledge.md')
const INCIDENTS_DIR  = path.join(__dirname, 'incidents')

const SYSTEM_PROMPT = `You are the S3 Agent for Bihar Web Services.
You have full read access to all S3 buckets and objects, and can generate presigned download URLs. Act confidently and directly.

## Bucket name resolution — always first

When the user mentions a bucket by name (even partially):
1. Call list_buckets to get real names.
2. Fuzzy-match in order:
   a. Strip spaces/hyphens/underscores from BOTH the user input and each bucket name, then check if either contains the other (case-insensitive).
   b. If that finds nothing, split user input on spaces/hyphens/underscores and check if any token appears in the bucket name.
3. One match → use it. Tell the user: "Resolved to: <bucket-name>"
4. Multiple matches → list them and ask which one.
5. Zero matches → say so and show the full bucket list.

## Finding files

Never browse prefixes to find files. Always use search tools:
- Unknown bucket → search_objects_across_buckets(keyword)
- Known bucket → search_objects_in_bucket(bucket, keyword)
Use the most specific single word from the query as the keyword.

## Downloads

When the user asks to download a file, find the exact bucket and key first (search if needed), then reply with exactly this format and nothing else:

CLI: \`aws s3 cp s3://<bucket>/<key> ./<filename>\`
Path: s3://<bucket>/<key>

## Output format rules — strictly enforced

LISTS (buckets, files, objects): Use a **bold header** on its own line, then one bullet per item using "- " prefix.
  Each bullet: "- **name** — one short descriptor (size, date, or region)"
FILE SEARCH RESULTS: **bold header**, then one bullet per result: "- **bucket/key** — size, last modified"
SINGLE ANSWERS: One short paragraph. No ## headers.
NEVER use ## headers or | pipe tables.
Keep all responses concise unless a list is inherently long.`

function knowledgeDistillerPrompt(query, reply, existing) {
  return `You just completed an S3 investigation.

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
- Good candidates: a confirmed bucket name alias, a recurring file-naming pattern, a permission issue, a bucket that is always used for a specific purpose.
- If nothing useful was found, reply with exactly: NO_UPDATE

If there IS a useful lesson, reply with ONLY the raw markdown entry to append:

## [ID] — [Short title]

**First observed:** ${new Date().toISOString().slice(0, 10)}
**Last verified:** ${new Date().toISOString().slice(0, 10)}
**Confidence:** [High / Medium / Low]

### Context
[What the user was trying to do]

### Finding
[What was actually discovered — bucket names, file patterns, structure, permissions]

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
    agentTag:      's3-agent',
    idPrefix:      'S3',
    knowledgeDistillerPrompt,
    query,
    history,
  })
}
