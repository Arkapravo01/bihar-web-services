import path from 'path'
import { fileURLToPath } from 'url'
import { toolDefinitions, executeTool } from './tools.js'
import { runAgent } from '../runner.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const KNOWLEDGE_FILE = path.join(__dirname, 'knowledge.md')
const INCIDENTS_DIR = path.join(__dirname, 'incidents')

const SYSTEM_PROMPT = `You are the Glue Investigation Agent for Bihar Web Services.

You help investigate AWS Glue resources including:
- Databases and tables (metadata, schemas, locations)
- ETL jobs (configurations, schedules, status)
- Job runs and execution history
- Data connections and sources
- Crawlers and auto-discovery settings

When a user asks about Glue infrastructure:
1. List available resources to understand the environment
2. Investigate specific resources to answer their question
3. Look for patterns (failed jobs, incomplete crawls, schema mismatches)
4. Provide actionable insights

Always start by calling get_caller_identity to verify your permissions.`

function knowledgeDistillerPrompt(query, reply, existing) {
  return `Based on this Glue investigation, extract one concise learning about Glue patterns, limitations, or best practices that would help future investigations.

Query: "${query}"
Reply: "${reply}"
Existing knowledge entries: ${existing || '(none yet)'}

Return a single markdown line (starting with "- ") or return NOTHING if this investigation doesn't reveal new learnings. Examples:
- Glue jobs in production often have retry logic enabled to handle transient failures
- CloudWatch metrics for failed Glue jobs appear with a 2-minute delay
- Crawler targets with S3 partitions should use crawl configuration to detect partition schema

Respond with only the markdown line or nothing.`
}

export async function runInvestigation(query, history = []) {
  return runAgent({
    systemPrompt: SYSTEM_PROMPT,
    toolDefinitions,
    executeTool,
    knowledgeFile: KNOWLEDGE_FILE,
    incidentsDir: INCIDENTS_DIR,
    agentTag: 'glue-agent',
    idPrefix: 'GLU',
    knowledgeDistillerPrompt,
    query,
    history,
  })
}
