/**
 * Shared ICA (IBM Claude API) client used by all agents.
 * Centralises the model name, base URL, and auth header so they never
 * drift between agent files.
 */

const ICA_BASE = 'https://api.nextgen-beta.ica.ibm.com/ica/v1'
export const MODEL = 'claude-haiku-4-5'

export async function icaChat(messages, tools = [], opts = {}) {
  const ICA_KEY = process.env.ICA_API_KEY
  const body = { model: MODEL, max_tokens: opts.max_tokens ?? 1024, messages }
  if (tools.length) body.tools = tools
  const res = await fetch(`${ICA_BASE}/chat/completions`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ICA_KEY}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(opts.timeoutMs ?? 30_000),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(JSON.stringify(json))
  return json
}
