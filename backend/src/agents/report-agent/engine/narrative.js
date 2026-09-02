/**
 * AI narrative generation — exactly TWO icaChat calls per run.
 * Root cause narrative + executive summary (bullet-point format).
 * Strict guardrails: never invents numbers; references only provided JSON.
 */

import { icaChat } from '../../icaClient.js'

export async function generateRootCauseNarrative({ findings, correlations, kpis }) {
  const topFindings = [...findings]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map(f => ({
      id: f.id,
      category: f.category,
      severity: f.severity,
      count: f.count,
      logGroupName: f.logGroupName,
      firstSeen: f.firstSeen,
      lastSeen: f.lastSeen,
      isRecurring: f.isRecurring,
      recurrenceDescription: f.recurrenceDescription,
    }))

  const messages = [
    {
      role: 'system',
      content: `You are a cloud operations analyst. You will be given findings from a real CloudWatch log analysis.
Identify the most likely root cause.

STRICT RULES:
- NEVER invent numbers, counts, service names, or timestamps not present in the provided JSON.
- Cite only the data provided.
- Structure your response EXACTLY as:
Likely cause: <one sentence>
Confidence: high|medium|low
Supporting evidence:
• <evidence point 1 citing a specific finding>
• <evidence point 2 citing a specific finding>
• <evidence point 3 if warranted>

Use bullet points (•) for evidence. Do not add headings or extra text outside this structure.`,
    },
    {
      role: 'user',
      content: JSON.stringify({ findings: topFindings, correlations, kpis }),
    },
  ]

  try {
    const res = await icaChat(messages, [], { max_tokens: 400 })
    return res.choices[0]?.message?.content?.trim() ?? 'Root cause analysis unavailable.'
  } catch (e) {
    console.warn('[narrative] root cause failed:', e.message)
    return 'Root cause analysis unavailable.'
  }
}

export async function generateExecutiveSummary({ kpis, findings, specialists }) {
  if (!findings.length) {
    return '• No confirmed errors detected in the selected time range.'
  }

  const topFindings = [...findings]
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map(f => ({ category: f.category, severity: f.severity, count: f.count, logGroupName: f.logGroupName, isRecurring: f.isRecurring }))

  const specialistSummary = (specialists ?? []).map(s => ({ name: s.name, status: s.status, findingsCount: s.findingsCount }))

  const messages = [
    {
      role: 'system',
      content: `You are a cloud operations analyst writing an executive summary of a CloudWatch log analysis.

Write a concise operational summary in exactly this bullet-point format:
• <Overall health statement — is anything wrong?>
• <Biggest issue and where it is occurring>
• <Recurrence or pattern if present, otherwise state "No recurring patterns detected">
• <Which log group or service needs investigation first>
• <One actionable recommendation based solely on the data>

STRICT RULES:
- Each bullet must start with "• "
- NEVER invent numbers, names, log groups, or timestamps not in the provided JSON.
- Reference only the provided data.
- If information is unavailable, state "Unknown from available data".
- Do NOT add headings, intro text, or closing remarks outside the bullet list.`,
    },
    {
      role: 'user',
      content: JSON.stringify({ kpis, topFindings, specialistSummary }),
    },
  ]

  try {
    const res = await icaChat(messages, [], { max_tokens: 300 })
    return res.choices[0]?.message?.content?.trim() ?? '• Summary unavailable — see findings below.'
  } catch (e) {
    console.warn('[narrative] executive summary failed:', e.message)
    return '• Summary unavailable — see findings below.'
  }
}
