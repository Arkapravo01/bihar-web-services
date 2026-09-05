/**
 * Deduplication and stable identity.
 *
 * Two jobs:
 *
 *  1. Collapse the same failure into one finding. The old normaliser kept 300
 *     characters of the raw message, so a single recurring failure split into
 *     several findings whenever an incidental part of the line changed — one
 *     pip incompatibility became three findings (the largest ranked
 *     "critical"), one crashing Lambda became two (cold starts print an extra
 *     Init Duration field), and one bulk payload became eight. Fingerprinting
 *     now works on the part of the line that names the failure.
 *
 *  2. Give each finding an id derived from its content rather than
 *     `randomUUID()`. Identical failures then carry identical ids across runs,
 *     so correlations and narrative citations stay meaningful and two runs of
 *     the same window can be compared instead of merely looking different.
 */

import { createHash } from 'crypto'

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi
const ISO_TS_RE = /\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:[.,]\d+)?(?:Z|[+-]\d{2}:?\d{2})?/gi
const CLOCK_RE = /\b\d{1,2}:\d{2}:\d{2}(?:[.,]\d+)?\b/g
const ARN_RE = /arn:aws[\w-]*:[^\s"']+/gi
const URL_RE = /\b[a-z][a-z0-9+.-]*:\/\/[^\s"'<>)]+/gi
const REQ_ID_RE = /\b(request|correlation|trace|invocation|job|task|run)[_ -]?id\b\s*[:=]?\s*\S+/gi
const PATH_RE = /(?:\/[\w.@-]+){2,}\/?/g
const IP_RE = /\b\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?\b/g
const HEX_RE = /\b[0-9a-f]{8,}\b/gi
// Tokens mixing letters and digits are usually identifiers — filenames, batch
// keys, generated ids — and leaving them in splits one recurring failure into
// a finding per file. The thresholds matter: masking must not swallow tokens
// that carry meaning. Requiring 10+ characters AND 4+ digits keeps error codes
// (ORA-01555, E11000), service names (s3transfer, ec2) and constants
// (SQLSTATE, ECONNREFUSED) intact, so two genuinely different Oracle errors
// stay two findings.
const MIXED_TOKEN_RE = /\b[\w-]{10,}\b/g
const MIN_ID_DIGITS = 4

const NUM_RE = /\b\d+(?:\.\d+)?\b/g

function maskIdentifiers(text) {
  return text.replace(MIXED_TOKEN_RE, (token) => {
    const digits = (token.match(/\d/g) ?? []).length
    const hasLetter = /[a-z]/i.test(token)
    return digits >= MIN_ID_DIGITS && hasLetter ? '<ID>' : token
  })
}

/**
 * Full-message normalisation, used for comparison rather than display.
 */
export function normalizeMessage(message) {
  if (!message) return ''
  return maskIdentifiers(String(message))
    .replace(ARN_RE, '<ARN>')
    .replace(URL_RE, '<URL>')
    .replace(REQ_ID_RE, '<REQID>')
    .replace(UUID_RE, '<UUID>')
    .replace(ISO_TS_RE, '<TS>')
    .replace(CLOCK_RE, '<TS>')
    .replace(IP_RE, '<IP>')
    .replace(PATH_RE, '<PATH>')
    .replace(HEX_RE, '<HEX>')
    .replace(NUM_RE, '<N>')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300)
}

/**
 * Some platforms report a failure as a fixed-shape record in which most fields
 * are per-invocation measurements. A Lambda REPORT line is the common case:
 *
 *   REPORT RequestId: <id>  Duration: 669.17 ms  Billed Duration: 4290 ms
 *   Memory Size: 2048 MB  Max Memory Used: 204 MB  Init Duration: 3619.87 ms
 *   Status: error  Error Type: Runtime.ExitError
 *
 * The failure is "Status: error / Runtime.ExitError"; the timings are not part
 * of its identity, and Init Duration appears only on cold starts — enough to
 * split one recurring crash into two unrelated-looking findings. Records like
 * this reduce to the fields that actually name the failure.
 */
function canonicalizeLambdaReport(message) {
  if (!/^\s*REPORT\s+RequestId:/i.test(message)) return null
  const status = message.match(/Status:[ \t]*([A-Za-z-]+)/i)
  const errorType = message.match(/Error Type:[ \t]*([\w.$-]+)/i)
  if (!status && !errorType) return null
  const s = (status ? status[1] : 'unknown').toLowerCase()
  const t = (errorType ? errorType[1] : 'none').toLowerCase()
  return `lambda invocation report status=${s} errortype=${t}`
}

/**
 * The identity of a failure: the line that names it, with everything that
 * varies between occurrences erased. Multi-line events (stack traces, SQL
 * dumps) collapse onto their first line.
 */
export function fingerprint(message) {
  if (!message) return ''
  const raw = String(message)

  const structured = canonicalizeLambdaReport(raw)
  if (structured) return structured

  const normalized = normalizeMessage(raw)
  if (!normalized) return ''

  const firstLine = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.length > 0)
  const basis = firstLine ? normalizeMessage(firstLine) : normalized

  // A very short first line ('Exception in thread "main"') carries little
  // identity by itself, so fall back to the wider normalisation.
  return (basis.length >= 16 ? basis : normalized).slice(0, 160)
}

export function findingSignature({ category, logGroupName, fingerprint: fp }) {
  return `${logGroupName}|${category}|${fp}`
}

/**
 * Content-derived finding id — stable across runs for the same failure.
 */
export function findingId(signature) {
  return createHash('sha1').update(signature).digest('hex').slice(0, 32)
}

/**
 * Signature for the `other` roll-up. Unclassified error lines are frequently
 * fragments of one bulk payload (a multi-megabyte SQL INSERT split across
 * events, for instance), each fragment starting mid-record. Fingerprinting
 * cannot merge them because they genuinely differ, so a dozen near-identical
 * low-value rows would crowd out the real findings. They collapse into one row
 * per log group instead, which states the same fact without the clutter.
 */
export function rollupSignature(logGroupName) {
  return `${logGroupName}|other|unclassified-error-lines`
}

export function groupBySignature(events) {
  const groups = new Map()
  for (const event of events) {
    const fp = fingerprint(event.message)
    const sig = findingSignature({
      category: event.category,
      logGroupName: event.logGroupName,
      fingerprint: fp,
    })
    if (!groups.has(sig)) {
      groups.set(sig, { events: [], signature: sig, fingerprint: fp, normalizedMessage: fp })
    }
    groups.get(sig).events.push(event)
  }
  return groups
}
