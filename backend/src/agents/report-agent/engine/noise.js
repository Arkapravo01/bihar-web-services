/**
 * Noise suppression — runs BEFORE categorisation.
 *
 * Why this layer exists: CloudWatch log groups are dominated by lines that
 * contain the word "ERROR" but describe nothing an operator can act on. Left
 * in, they drown the report — in a real 7-day run, 113 of 189 classified
 * events (60%) came from the five families below, and the single "critical"
 * finding of the whole report was pip's dependency resolver complaining that
 * a Glue job's pinned `requests` wanted an older `urllib3`.
 *
 * Rules are deliberately narrow and each one is named, because every
 * suppressed event is counted and reported back in the run's `coverage`
 * block. Suppression is visible, not silent.
 *
 * A rule belongs here only if the line is benign REGARDLESS of context.
 * Anything that could be a real failure is left for categorize.js to judge.
 */

const RULES = [
  {
    name: 'dependency_resolver',
    // pip/npm resolver chatter emitted while a Glue or Lambda bundle installs.
    // "ERROR: awscli 1.16.242 has requirement botocore==1.12.232" is a version
    // pin advisory, not a runtime failure.
    test: (m) =>
      /\bhas requirement\b/i.test(m) ||
      /\bis incompatible\b/i.test(m) ||
      /pip'?s dependency resolver/i.test(m) ||
      /\bYou are using pip version\b/i.test(m) ||
      // Scoped to the package managers on purpose. A bare /^WARN/ rule also
      // swallowed real failures that happen to be logged at warning level,
      // e.g. "Warn: Failed to download analyzer rules ... Error: AccessDenied".
      /^\s*npm\s+WARN\b/i.test(m) ||
      /^\s*WARNING: (You are using|The scripts?|Ignoring|Retrying|Skipping)\b/i.test(m),
  },
  {
    name: 'deprecation_notice',
    // Runtime/library upgrade advisories. Real operational work, but planned
    // maintenance — never an incident, and they repeat on every invocation.
    test: (m) =>
      /\bDeprecationWarning\b/i.test(m) ||
      /\bis deprecated\b/i.test(m) ||
      /\bare deprecated\b/i.test(m) ||
      /\bno longer supported\b/i.test(m) ||
      /\bwill be removed in\b/i.test(m) ||
      /\bupgrade (your|the) runtime\b/i.test(m) ||
      /\bSEQUELIZE\d+\b/.test(m),
  },
  {
    name: 'lambda_platform_line',
    // START/END/REPORT are emitted for every single invocation. Only keep one
    // when the platform itself is reporting a failure on that line.
    test: (m) =>
      /^\s*(START|END|REPORT|INIT_START|XRAY)\b/.test(m) &&
      !/\bStatus:\s*(error|timeout|failed)\b/i.test(m) &&
      !/\bTask timed out\b/i.test(m),
  },
  {
    name: 'spark_launcher_command',
    // Glue dumps the full spark-submit command line, whose --conf keys include
    // "spark.network.timeout" and friends. Matching "timeout" inside a config
    // key produced phantom timeout findings on every Glue run.
    test: (m) =>
      /\bPrepareLaunch\b/.test(m) ||
      /\/usr\/bin\/java\s+-cp\b/.test(m) ||
      /--conf\s+spark\./.test(m),
  },
  {
    name: 'metrics_blob',
    // ECS Container Insights performance events are metric documents, not logs.
    // Their numeric fields ("NetworkRxBytes":429) matched HTTP-status patterns.
    test: (m) =>
      /"Type"\s*:\s*"(Container|Task|Service|Volume|Cluster)"/.test(m) &&
      /"(CpuUtilized|MemoryUtilized|NetworkRxBytes|StorageReadBytes)"/.test(m),
  },
  {
    name: 'logging_framework_warning',
    // log4j2's own StatusLogger, emitted during startup by every Glue/Spark job:
    //   "main WARN JNDI lookup class is not available because this JRE does not
    //    support JNDI ... continuing configuration.
    //    java.lang.ClassNotFoundException: ...JndiLookup"
    // The ClassNotFoundException in that text was being read as a missing
    // resource, giving a medium finding on a group whose jobs were fine.
    test: (m) =>
      /\bJNDI lookup class is not available\b/i.test(m) ||
      /\bcontinuing configuration\b/i.test(m) ||
      (/\bmain WARN\b/.test(m) && /\b(log4j|JNDI|Advanced terminal|StatusLogger)\b/i.test(m)),
  },
  {
    name: 'informational_glue_notice',
    test: (m) =>
      /\bRetrieved no ETL connector jars\b/i.test(m) ||
      /\bGlue ETL Marketplace\b/i.test(m),
  },
  {
    name: 'zero_valued_error_field',
    // Structured logs that merely carry an error *field* set to nothing:
    // {"errors":[],"errorCount":0,"error":null}. The word is present; the
    // failure is not.
    test: (m) => {
      if (!/[{[]/.test(m)) return false
      const hasRealError = /"(error|errorMessage|errorType|exception|failureReason)"\s*:\s*"[^"]+"/i.test(m)
      if (hasRealError) return false
      return /"(errors?|errorCount|failures?|failureCount)"\s*:\s*(0|null|false|""|\[\])/i.test(m)
    },
  },
  {
    name: 'successful_request_log',
    // Access logs (API Gateway, ALB, nginx) for requests that succeeded.
    test: (m) =>
      /"?status(Code)?"?\s*[:=]\s*"?[23]\d\d\b/i.test(m) &&
      !/\b(exception|traceback|fatal)\b/i.test(m),
  },
]

/**
 * @returns {{ suppressed: boolean, rule: string|null }}
 */
export function classifyNoise(message) {
  if (!message || !message.trim()) return { suppressed: true, rule: 'empty' }
  for (const rule of RULES) {
    if (rule.test(message)) return { suppressed: true, rule: rule.name }
  }
  return { suppressed: false, rule: null }
}

export const NOISE_RULE_NAMES = ['empty', ...RULES.map((r) => r.name)]
