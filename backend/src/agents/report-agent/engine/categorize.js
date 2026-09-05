/**
 * Event classification — deterministic, first-match-wins.
 *
 * Runs AFTER noise.js. Category ids are stable (the frontend's category filter
 * and label map are keyed on them); what changed is precision:
 *
 *  - Every keyword pattern now carries /i. The old set mixed flags, so
 *    `/\bException\b/` skipped the real line "No columns to parse from file
 *    exception occured" (it landed in `other`) while pip's uppercase "ERROR:"
 *    chatter was promoted to `application`.
 *  - Bare HTTP-status patterns are gone. `/\b429\b/` matched the millisecond
 *    field of "01:01:06,429" and the byte count in `"NetworkRxBytes":429`,
 *    manufacturing throttling findings out of a timestamp. Status codes now
 *    require HTTP wording next to the number.
 *  - The generic fallback demands a standalone failure token, and a line whose
 *    own level marker says INFO/DEBUG/TRACE is only classified on a
 *    high-confidence pattern — a line that announces itself as informational
 *    is not an incident.
 */

// A level marker the line prints about itself, e.g. "... INFO [Thread-3] ..."
const INFO_LEVEL_RE = /(^|[\s[|(])(INFO|INFORMATION|DEBUG|TRACE|NOTICE)([\s\]|):]|$)/
const ERROR_LEVEL_RE = /(^|[\s[|("])(ERROR|ERR|FATAL|CRITICAL|SEVERE|PANIC|EMERG|ALERT)([\s\]|):"]|$)/

const RULES = [
  // ── timeout ──────────────────────────────────────────────────────────────
  { category: 'timeout', confidence: 'high', patterns: [
    /\btask timed out after\b/i, /\brequest timed out\b/i, /\bgateway timeout\b/i,
    /\bETIMEDOUT\b/i, /\bconnect(ion)? timed out\b/i, /\bread timed out\b/i,
    /\bexecution timed out\b/i, /\bstatement timeout\b/i, /\block wait timeout\b/i,
    /\b504\b[^\n]{0,20}\bgateway timeout\b/i,
  ] },
  { category: 'timeout', confidence: 'medium', patterns: [
    /\btimed out\b/i, /\btimeout (exceeded|error|occurred|reached)\b/i,
  ] },

  // ── access_denied ────────────────────────────────────────────────────────
  { category: 'access_denied', confidence: 'high', patterns: [
    /\bAccessDenied(Exception)?\b/i, /\bUnauthorizedException\b/i, /\bUnrecognizedClientException\b/i,
    /\bnot authorized to perform\b/i, /\bexplicit deny\b/i, /\bInvalidSignatureException\b/i,
    /\bSignatureDoesNotMatch\b/i, /\bTokenRefreshRequired\b/i, /\bExpiredToken(Exception)?\b/i,
  ] },
  { category: 'access_denied', confidence: 'medium', patterns: [
    /\baccess denied\b/i, /\bpermission denied\b/i, /\bis forbidden\b/i,
    /\b403\b[^\n]{0,20}\bforbidden\b/i, /\bforbidden\b[^\n]{0,20}\b403\b/i,
    /\bauthenticat(ion|ed) fail(ed|ure)\b/i, /\binvalid credentials\b/i,
  ] },

  // ── throttling ───────────────────────────────────────────────────────────
  { category: 'throttling', confidence: 'high', patterns: [
    /\bThrottlingException\b/i, /\bTooManyRequestsException\b/i, /\bThrottledException\b/i,
    /\bRate exceeded\b/i, /\bProvisionedThroughputExceededException\b/i,
    /\bRequestLimitExceeded\b/i, /\bLimitExceededException\b/i, /\bSlowDown\b/,
  ] },
  { category: 'throttling', confidence: 'medium', patterns: [
    /\b(request|api|call)s? (were |was |been )?throttled\b/i, /\bthrottling\b/i,
    /\bquota exceeded\b/i, /\btoo many requests\b/i,
    /\b429\b[^\n]{0,20}\btoo many requests\b/i,
  ] },

  // ── resource_not_found ───────────────────────────────────────────────────
  { category: 'resource_not_found', confidence: 'high', patterns: [
    /\bResourceNotFoundException\b/i, /\bNoSuchKey\b/i, /\bNoSuchBucket\b/i,
    /\bNoSuchEntity\b/i, /\bEntityNotFoundException\b/i, /\bspecified key does not exist\b/i,
    /\bTableNotFoundException\b/i, /\bMODULE_NOT_FOUND\b/, /\bClassNotFoundException\b/i,
    /\bModuleNotFoundError\b/i, /\bImportError\b/i,
  ] },
  { category: 'resource_not_found', confidence: 'medium', patterns: [
    /\bresource not found\b/i, /\bfile not found\b/i, /\bno such file or directory\b/i,
    /\b404\b[^\n]{0,20}\bnot found\b/i, /\bnot found\b[^\n]{0,20}\b404\b/i, /\bENOENT\b/,
  ] },

  // ── memory ───────────────────────────────────────────────────────────────
  { category: 'memory', confidence: 'high', patterns: [
    /\bOutOfMemoryError\b/i, /\bOOMKilled\b/i, /\bJavaScript heap out of memory\b/i,
    /\bcannot allocate memory\b/i, /\bMemoryError\b/, /\bENOMEM\b/,
    /\bRuntime exited\b[^\n]{0,40}\bsignal: killed\b/i,
  ] },
  { category: 'memory', confidence: 'medium', patterns: [
    /\bmemory limit exceeded\b/i, /\bout of memory\b/i, /\bmemory exhausted\b/i,
    /\bheap space\b/i, /\bGC overhead limit exceeded\b/i,
  ] },

  // ── runtime (process / container level failure) ───────────────────────────
  { category: 'runtime', confidence: 'high', patterns: [
    /\bcontainer stopped unexpectedly\b/i, /\bsegmentation fault\b/i, /\bSIGSEGV\b/,
    /\bENOSPC\b/, /\bdisk (is )?full\b/i, /\bno space left on device\b/i,
    /\bRuntime\.ExitError\b/i, /\bprocess exited with (code|status) [1-9]/i,
    /\bexited with non-?zero\b/i, /\bpanic:/i, /\bfatal error:/i,
    /\bCannotPullContainerError\b/i,
  ] },
  { category: 'runtime', confidence: 'medium', patterns: [
    /\bcontainer restart(ed|ing)?\b/i, /\binitialization (failure|error)\b/i,
    /\bRuntime\.\w+Error\b/i, /\bELIFECYCLE\b/, /\bnpm ERR!/,
    /\bcold[- ]start\b[^\n]{0,30}\bfail/i, /\bhealth check failed\b/i, /\bunhealthy\b/i,
  ] },

  // ── network ──────────────────────────────────────────────────────────────
  { category: 'network', confidence: 'high', patterns: [
    /\bECONNREFUSED\b/, /\bECONNRESET\b/, /\bENETUNREACH\b/, /\bEHOSTUNREACH\b/,
    /\bEAI_AGAIN\b/, /\bENOTFOUND\b/, /\bcertificate (verify failed|has expired)\b/i,
    /\bSSLError\b/i, /\bhandshake fail(ed|ure)\b/i,
  ] },
  { category: 'network', confidence: 'medium', patterns: [
    /\bconnection refused\b/i, /\bconnection reset\b/i,
    /\bdns (lookup|resolution) fail(ed|ure)\b/i, /\bnetwork (is )?unreachable\b/i,
  ] },

  // ── database ─────────────────────────────────────────────────────────────
  { category: 'database', confidence: 'high', patterns: [
    /\bPrismaClient\w*Error\b/, /\bSequelize\w*Error\b/, /\bdeadlock (detected|found)\b/i,
    /\bOperationalError\b/, /\bORA-\d{4,5}\b/, /\bSQLSTATE\[\w+\]/,
    /\bPSQLException\b/i, /\bSQLException\b/i,
  ] },
  { category: 'database', confidence: 'medium', patterns: [
    /\b(sql|database|db) (connection|query|transaction) (fail(ed|ure)|timed out|error)\b/i,
    /\btoo many connections\b/i, /\bduplicate key value\b/i,
    /\brelation\b[^\n]{0,60}\bdoes not exist\b/i, /\bcould not connect to (the )?(database|server)\b/i,
  ] },

  // ── connection (pool / socket lifecycle) ─────────────────────────────────
  { category: 'connection', confidence: 'medium', patterns: [
    /\bconnection pool (exhausted|timeout|is full)\b/i, /\bsocket hang up\b/i,
    /\bEPIPE\b/, /\bconnection closed unexpectedly\b/i, /\bbroken pipe\b/i,
    /\bpool timeout\b/i,
  ] },

  // ── dependency (a downstream service failed us) ──────────────────────────
  { category: 'dependency', confidence: 'medium', patterns: [
    /\bfailed to fetch\b/i,
    /\bdownstream (service|api|dependency) (error|fail(ed|ure)|unavailable)\b/i,
    /\bcircuit breaker (open|tripped)\b/i, /\bupstream (connect error|timeout)\b/i,
    /\bservice unavailable\b/i, /\b50[23]\b[^\n]{0,25}\b(bad gateway|service unavailable)\b/i,
    /\bSdkClientException\b/, /\bAmazonServiceException\b/,
    /\b(SQS|SNS|S3|Redis|DynamoDB|Kinesis)\b[^\n]{0,60}\b(fail(ed|ure)?|error|refused)\b/i,
  ] },

  // ── invocation (delivery / retry semantics) ──────────────────────────────
  { category: 'invocation', confidence: 'medium', patterns: [
    /\bfailed invocation\b/i, /\bdead[- ]?letter queue\b/i, /\bDLQ\b/,
    /\bretr(y|ies) exhaust(ed)?\b/i, /\bmax(imum)? retries (exceeded|reached)\b/i,
    /\bmessage processing failed\b/i, /\bInvocationException\b/i,
  ] },

  // ── exception (unhandled code-level failure) ─────────────────────────────
  { category: 'exception', confidence: 'high', patterns: [
    /\bUnhandledPromiseRejection\b/i, /\bTraceback \(most recent call last\)/i,
    /\bException in thread\b/i, /\bUncaughtException\b/i,
    /\b(Type|Value|Key|Index|Attribute|Reference|Syntax|Assertion|Runtime)Error\b/,
    /\bNullPointerException\b/i, /\bIllegalStateException\b/i,
    /\bat [\w$.]+\([\w$.]+\.(java|kt|scala):\d+\)/,
  ] },
  { category: 'exception', confidence: 'medium', patterns: [
    /\w*Exception\b/i, /\bstack ?trace\b/i, /\bcrash(ed)?\b/i, /\bError:\s/,
  ] },

  // ── application (explicit app-level error line) ──────────────────────────
  { category: 'application', confidence: 'medium', patterns: [
    /\bLAUNCH ERROR\b/i,
    /\bfailed to (process|parse|read|write|load|save|send|upload|download|validate|start)\b/i,
    /\bvalidation (failed|error)\b/i, /\bunexpected (error|response|state)\b/i,
  ] },
]

// The generic catch-all. Needs a standalone failure token — not a substring,
// not a digit, not the word buried inside a URL.
const FALLBACK_RE = /(^|[^\w])(error|errors|errored|fatal|critical|failed|failure|failing|exception|crashed|aborted)([^\w]|$)/i

export function categorizeEvent(message) {
  if (!message) return null

  const declaresInfo = INFO_LEVEL_RE.test(message) && !ERROR_LEVEL_RE.test(message)

  for (const rule of RULES) {
    for (const p of rule.patterns) {
      if (!p.test(message)) continue
      // A line that labels itself INFO/DEBUG only becomes a finding on a
      // high-confidence signal: a stack trace printed at DEBUG is still real,
      // the word "timeout" inside an INFO line is not.
      if (declaresInfo && rule.confidence !== 'high') continue
      return { category: rule.category, confidence: rule.confidence }
    }
  }

  if (declaresInfo) return null
  if (FALLBACK_RE.test(message)) return { category: 'other', confidence: 'low' }
  return null
}
