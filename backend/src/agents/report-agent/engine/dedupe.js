/**
 * Deduplication: normalize messages and group findings by signature.
 * Scope: one finding per (logGroupName, category, normalizedMessage) triple.
 */

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi
const HEX_RE = /\b[0-9a-f]{8,}\b/gi
const TS_RE = /\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?/gi
const NUM_RE = /\b\d+(\.\d+)?\b/g

export function normalizeMessage(message) {
  if (!message) return ''
  return message
    .replace(UUID_RE, '<UUID>')
    .replace(TS_RE, '<TS>')
    .replace(HEX_RE, '<HEX>')
    .replace(NUM_RE, '<N>')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300)
}

export function findingSignature({ category, logGroupName, normalizedMessage }) {
  return `${logGroupName}|${category}|${normalizedMessage}`
}

export function groupBySignature(events) {
  const groups = new Map()
  for (const event of events) {
    const normalized = normalizeMessage(event.message)
    const sig = findingSignature({ category: event.category, logGroupName: event.logGroupName, normalizedMessage: normalized })
    if (!groups.has(sig)) groups.set(sig, { events: [], signature: sig, normalizedMessage: normalized })
    groups.get(sig).events.push(event)
  }
  return groups
}
