const RULES = [
  { category: 'timeout', confidence: 'high', patterns: [/\btask timed out after\b/i, /\brequest timed out\b/i, /\bgateway timeout\b/i, /\bETIMEDOUT\b/, /\b504 gateway timeout\b/i, /\bconnect timed out\b/i] },
  { category: 'timeout', confidence: 'medium', patterns: [/\btimeout\b/i, /\btimed out\b/i] },
  { category: 'access_denied', confidence: 'high', patterns: [/\bAccessDeniedException\b/, /\bUnauthorizedException\b/, /\bnot authorized to perform\b/i, /\b403 Forbidden\b/i] },
  { category: 'access_denied', confidence: 'medium', patterns: [/\baccess denied\b/i, /\bunauthorized\b/i] },
  { category: 'throttling', confidence: 'high', patterns: [/\bThrottlingException\b/, /\bTooManyRequestsException\b/, /\bRate exceeded\b/i] },
  { category: 'throttling', confidence: 'medium', patterns: [/\bthrottl(ed|ing)\b/i, /\b429\b/] },
  { category: 'resource_not_found', confidence: 'high', patterns: [/\bResourceNotFoundException\b/, /\bNoSuchKey\b/, /\bNoSuchBucket\b/] },
  { category: 'resource_not_found', confidence: 'medium', patterns: [/\b404 not found\b/i, /\bresource not found\b/i] },
  { category: 'memory', confidence: 'high', patterns: [/\bOutOfMemoryError\b/, /\bOOMKilled\b/, /\bJavaScript heap out of memory\b/i, /\bcannot allocate memory\b/i] },
  { category: 'memory', confidence: 'medium', patterns: [/\bmemory limit exceeded\b/i, /\bout of memory\b/i] },
  { category: 'runtime', confidence: 'high', patterns: [/\bcontainer stopped unexpectedly\b/i, /\bprocess exited\b/i, /\bsegmentation fault\b/i, /\bENOSPC\b/, /\bdisk full\b/i] },
  { category: 'runtime', confidence: 'medium', patterns: [/\bcontainer restart(ed)?\b/i, /\binitialization failure\b/i, /\bcold[- ]start\b.*\bfail/i, /\bpanic:/i, /\bruntime failure\b/i] },
  { category: 'network', confidence: 'high', patterns: [/\bECONNREFUSED\b/, /\bECONNRESET\b/, /\bENETUNREACH\b/, /\bEAI_AGAIN\b/, /\bcertificate verify failed\b/i] },
  { category: 'network', confidence: 'medium', patterns: [/\bconnection refused\b/i, /\bconnection reset\b/i, /\bdns (lookup|resolution) failed\b/i, /\bssl\/tls\b/i] },
  { category: 'database', confidence: 'high', patterns: [/\bPrismaClientKnownRequestError\b/, /\bSequelizeConnectionError\b/, /\bdeadlock detected\b/i] },
  { category: 'database', confidence: 'medium', patterns: [/\b(sql|database|db) (connection|query) (failed|timed out|error)\b/i, /\btoo many connections\b/i] },
  { category: 'connection', confidence: 'medium', patterns: [/\bconnection pool exhausted\b/i, /\bsocket hang up\b/i, /\bconnection closed unexpectedly\b/i] },
  { category: 'dependency', confidence: 'medium', patterns: [/\bfailed to fetch\b/i, /\bdownstream (service|api) (error|failed)\b/i, /\b5\d\d from\b/i, /\b(SQS|SNS|S3|Redis|circuit breaker)\b.*\b(fail|error|refused|open|tripped)\b/i] },
  { category: 'invocation', confidence: 'medium', patterns: [/\bfailed invocation\b/i, /\bdead[- ]?letter queue\b/i, /\bDLQ\b/, /\bretry exhaust/i, /\bmax retries exceeded\b/i, /\bmessage processing failed\b/i, /\bduplicate (message|processing)\b/i] },
  { category: 'exception', confidence: 'high', patterns: [/\bUnhandledPromiseRejection\b/, /\bTraceback \(most recent call last\)/i, /\bFATAL\b/] },
  { category: 'exception', confidence: 'medium', patterns: [/\bException\b/, /\bstack ?trace:/i, /\bcrash(ed)?\b/i, /\bError:\s/] },
  { category: 'application', confidence: 'medium', patterns: [/\bERROR\b/, /\bfailed to\b/i] },
]
const FALLBACK = /\b(error|fatal|critical|failed|failure|exception)\b/i

export function categorizeEvent(message) {
  if (!message) return null
  for (const rule of RULES) {
    for (const p of rule.patterns) {
      if (p.test(message)) return { category: rule.category, confidence: rule.confidence }
    }
  }
  if (FALLBACK.test(message)) return { category: 'other', confidence: 'low' }
  return null
}
