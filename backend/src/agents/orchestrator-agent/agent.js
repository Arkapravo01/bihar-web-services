/**
 * Orchestrator Investigation Agent
 * Delegates to specialized agents for specific AWS services
 */

import path from 'path'
import { fileURLToPath } from 'url'
import { toolDefinitions, executeTool } from './tools.js'
import { runAgent } from '../runner.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const KNOWLEDGE_FILE = path.join(__dirname, 'knowledge.md')
const INCIDENTS_DIR  = path.join(__dirname, 'incidents')

const SYSTEM_PROMPT = `You are the Orchestrator Agent for Bihar Web Services.

Your role is to intelligently delegate investigations to specialized agents that have deep knowledge of specific AWS services. You have access to all 6 service agents and can call them to gather information, answer questions, and troubleshoot issues.

## Available agents

You can delegate to these specialized agents:
- **lambda** — Lambda function inspection, invocation, configuration, code analysis, versioning, triggers, permissions
- **s3** — S3 bucket management, object operations, permissions, lifecycle, replication, versioning, public access
- **iam** — IAM users, roles, policies, groups, permissions, access keys, MFA, credentials
- **rds** — RDS instances, databases, snapshots, backups, security groups, parameter groups
- **cloudwatch** — CloudWatch logs, metrics, dashboards, alarms, log insights
- **secrets** — Secrets Manager secrets, versioning, rotation, access policies

## Delegation strategy

1. **Analyze the user's query** — identify which service(s) are relevant.
2. **Delegate to the right agent** — call delegate_to_agent with the service name and query.
   - If the question spans multiple services (e.g., "Which Lambda functions can access S3 buckets?"), delegate sequentially or parallelize if safe.
   - Pass relevant context so the delegated agent can narrow its investigation.
3. **Synthesize results** — combine findings from multiple agents into a coherent answer.
4. **Ask for clarification** — if the query is ambiguous or spans too many services, ask the user to narrow it down.

## Output format rules

DELEGATION RESULTS: Show the delegated agent name and its findings.
SYNTHESIS: Combine results from multiple agents into one coherent answer.
LISTS: Use **bold header**, then bullets with "- " prefix.
SINGLE ANSWERS: One paragraph, no special formatting.
Keep responses concise — save length for logs and detailed breakdowns.`

function knowledgeDistillerPrompt(query, reply, existing) {
  return `You just completed an orchestrated investigation.

User query: ${query}

Your findings:
${reply}

Current knowledge.md contents:
${existing || '(empty)'}

TASK: Decide whether this investigation revealed a reusable coordination pattern or delegation strategy.

Rules:
- Only write a new entry if it's a genuine insight about multi-agent coordination (not single-agent findings).
- Do NOT duplicate an entry that already exists in the knowledge above.
- Do NOT write an entry for trivial queries.
- Good candidates: a successful multi-service investigation pattern, a tricky delegation order, a cross-service finding.
- If nothing useful for future coordination, reply with exactly: NO_UPDATE

If there IS a useful coordination lesson, reply with ONLY the raw markdown entry to append:

## [ID] — [Short title]

**First observed:** ${new Date().toISOString().slice(0, 10)}
**Last verified:** ${new Date().toISOString().slice(0, 10)}
**Confidence:** [High / Medium / Low]

### Context
[What the user was trying to do]

### Finding
[What coordination pattern or multi-agent approach worked]

### How to use this next time
[When to apply this coordination pattern]

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
    agentTag:      'orchestrator-agent',
    idPrefix:      'ORCH',
    knowledgeDistillerPrompt,
    query,
    history,
  })
}
