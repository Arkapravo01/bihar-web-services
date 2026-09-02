/**
 * Shared agent runner used by all investigation agents.
 *
 * Handles:
 *  - Injecting knowledge.md into the system prompt
 *  - The tool-call agentic loop
 *  - Saving incidents to the incidents/ directory
 *  - Optionally updating knowledge.md after each investigation
 *
 * Each agent only needs to supply:
 *  - systemPrompt    — the agent's base system prompt string
 *  - toolDefinitions — array of tool schema objects
 *  - executeTool     — async (name, args) => result
 *  - knowledgeFile   — absolute path to knowledge.md
 *  - incidentsDir    — absolute path to incidents/
 *  - agentTag        — short name used in console logs e.g. 'cloudwatch-agent'
 *  - idPrefix        — prefix for knowledge entry IDs e.g. 'CW', 'S3', 'IAM'
 *  - knowledgeDistillerPrompt — function(query, reply, existing) => string
 */

import fs from 'fs/promises'
import path from 'path'
import { icaChat } from './icaClient.js'

const MAX_TOOL_CALLS = 12

async function readKnowledge(knowledgeFile) {
  try { return await fs.readFile(knowledgeFile, 'utf8') } catch { return '' }
}

async function saveIncident(incidentsDir, agentTag, query, reply) {
  try {
    const now  = new Date()
    const y    = now.getUTCFullYear()
    const m    = String(now.getUTCMonth() + 1).padStart(2, '0')
    const d    = String(now.getUTCDate()).padStart(2, '0')
    const ts   = now.toISOString().replace(/[-:T]/g, '').slice(0, 15)
    const slug = query.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40).replace(/-$/, '')
    const dir  = path.join(incidentsDir, String(y), m, d)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(
      path.join(dir, `${ts}-${slug}.md`),
      `# Investigation\n\n**Time:** ${now.toISOString()}\n\n## Query\n\n${query}\n\n## Response\n\n${reply}\n`,
      'utf8'
    )
  } catch (e) {
    console.warn(`[${agentTag}] Failed to save incident:`, e.message)
  }
}

async function maybeUpdateKnowledge({ knowledgeFile, agentTag, idPrefix, knowledgeDistillerPrompt, query, reply, existingKnowledge }) {
  try {
    const prompt = knowledgeDistillerPrompt(query, reply, existingKnowledge)
    const res  = await icaChat(
      [{ role: 'system', content: `You are a knowledge distiller for a ${agentTag}.` },
       { role: 'user',   content: prompt }],
    )
    const text = res.choices[0]?.message?.content?.trim() ?? ''
    if (!text || text === 'NO_UPDATE') return

    const idMatches = [...(existingKnowledge ?? '').matchAll(new RegExp(`^## ${idPrefix}-(\\d+)`, 'gm'))]
    const nextNum   = idMatches.length + 1
    const entry     = text.replace(/^## \[ID\]/, `## ${idPrefix}-${String(nextNum).padStart(3, '0')}`)

    await fs.appendFile(knowledgeFile, `\n---\n\n${entry}\n`, 'utf8')
    console.log(`[${agentTag}] Knowledge updated with new entry.`)
  } catch (e) {
    console.warn(`[${agentTag}] Failed to update knowledge:`, e.message)
  }
}

export async function runAgent({ systemPrompt, toolDefinitions, executeTool, knowledgeFile, incidentsDir, agentTag, idPrefix, knowledgeDistillerPrompt, query, history = [] }) {
  const existingKnowledge = await readKnowledge(knowledgeFile)
  const systemWithKnowledge = existingKnowledge.trim()
    ? `${systemPrompt}\n\nPREVIOUS KNOWLEDGE (hints only — verify against live data):\n${existingKnowledge.trim()}`
    : systemPrompt

  const messages = [
    { role: 'system', content: systemWithKnowledge },
    ...history,
    { role: 'user', content: query },
  ]

  let toolCallCount = 0
  let finalText = ''
  const orchestrationTrace = []

  while (true) {
    const response = await icaChat(messages, toolDefinitions)
    const choice   = response.choices[0]
    const msg      = choice.message
    if (msg.content) finalText = msg.content
    messages.push(msg)

    if (choice.finish_reason === 'stop' || !msg.tool_calls?.length) break

    for (const tc of msg.tool_calls) {
      toolCallCount++
      const startTime = Date.now()
      let toolResult
      let toolStatus = 'success'
      let toolError = null

      if (toolCallCount > MAX_TOOL_CALLS) {
        toolResult = { error: 'Tool call limit reached — summarise findings so far.' }
        toolStatus = 'error'
        toolError = 'Tool call limit'
      } else {
        let args
        try { args = JSON.parse(tc.function.arguments) } catch { args = {} }
        console.log(`[${agentTag}] tool: ${tc.function.name}`, JSON.stringify(args).slice(0, 120))
        try { toolResult = await executeTool(tc.function.name, args) }
        catch (err) {
          toolResult = { error: err.message }
          toolStatus = 'error'
          toolError = err.message
        }
      }

      const duration = Date.now() - startTime
      const outputSummary = JSON.stringify(toolResult).slice(0, 200)

      orchestrationTrace.push({
        id: `${toolCallCount}`,
        tool_name: tc.function.name,
        agent: toolResult.agent || null,
        input: tc.function.arguments,
        output_summary: outputSummary,
        timestamp: new Date().toISOString(),
        duration_ms: duration,
        status: toolStatus,
        error: toolError,
      })

      messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(toolResult) })
    }

    if (toolCallCount > MAX_TOOL_CALLS) break
  }

  await Promise.all([
    saveIncident(incidentsDir, agentTag, query, finalText),
    maybeUpdateKnowledge({ knowledgeFile, agentTag, idPrefix, knowledgeDistillerPrompt, query, reply: finalText, existingKnowledge }),
  ])

  return {
    reply: finalText,
    tool_calls_made: toolCallCount,
    history: messages.filter((m) => m.role !== 'system'),
    orchestration_trace: orchestrationTrace,
  }
}
