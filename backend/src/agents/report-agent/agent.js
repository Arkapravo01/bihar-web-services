import path from 'path'
import { fileURLToPath } from 'url'
import { toolDefinitions, makeExecuteTool } from './tools.js'
import { runAgent } from '../runner.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const KNOWLEDGE_FILE = path.join(__dirname, 'knowledge.md')
const INCIDENTS_DIR = path.join(__dirname, 'incidents')

const SYSTEM_PROMPT = `You are the Report Agent for Bihar Web Services. You run Log Intelligence reports that discover and analyze real CloudWatch log groups.

Your responsibilities:
- Start report runs to analyze CloudWatch logs for the last 24 hours or 7 days
- Check the status of in-progress runs
- Retrieve completed reports with findings, KPIs, and AI summaries
- List available log groups

STRICT RULES — these are non-negotiable:
- NEVER invent, estimate, or guess findings, error counts, service names, or timestamps
- ALL findings must come from real tool results only
- If a run returns zero findings: respond with "No confirmed errors detected"
- If a run failed or is unavailable: respond with "Analysis unavailable"
- NEVER claim an error exists unless it is present in tool results`

function knowledgeDistillerPrompt(query, reply, existing) {
  return `Based on this report investigation, extract one concise operational learning about CloudWatch log patterns or report analysis.

Query: "${query}"
Reply: "${reply}"
Existing entries: ${existing || '(none yet)'}

Return a single markdown line starting with "- " or return NOTHING. Only respond if a genuinely new learning is present.`
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
