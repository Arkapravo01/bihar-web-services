/**
 * Report narrative.
 *
 * Previously both narratives were written entirely by the model from a JSON
 * dump, which is why two runs over the same window read like reports on two
 * different systems — and why claims drifted from the data. A real example from
 * a stored run: "25 critical and 34 combined high-severity findings", when the
 * run had exactly ONE critical finding and 25 was the occurrence count inside
 * it; and "peak Aug 30 with 63 findings", where 63 was a trend bucket of
 * events, not findings.
 *
 * So the facts are no longer the model's job. Every number, ranking, severity
 * and confidence value below is computed here from the findings. The model is
 * asked for exactly two things — one sentence naming the likely cause, and one
 * recommendation sentence — at temperature 0, and if it is unavailable or
 * returns something unusable the deterministic fallback is used instead. The
 * report is therefore fully reproducible apart from the phrasing of two
 * sentences.
 */

import { icaChat } from '../../icaClient.js'
import { SEVERITY_RANK } from './severity.js'

const CATEGORY_PHRASE = {
  timeout: 'operations timing out',
  throttling: 'requests being throttled',
  access_denied: 'permission denials',
  resource_not_found: 'missing resources',
  invocation: 'failed or dropped invocations',
  memory: 'memory exhaustion',
  runtime: 'process or container failures',
  exception: 'unhandled exceptions',
  application: 'application-level errors',
  other: 'unclassified error lines',
  network: 'network failures',
  database: 'database failures',
  connection: 'connection failures',
  dependency: 'downstream dependency failures',
}

function severityRank(s) {
  const i = SEVERITY_RANK.indexOf(s)
  return i === -1 ? -1 : i
}

/** Deterministic ranking: severity, then rate, then count, then id. */
export function rankFindings(findings) {
  return [...findings].sort(
    (a, b) =>
      severityRank(b.severity) - severityRank(a.severity) ||
      (b.occurrencesPerHour ?? 0) - (a.occurrencesPerHour ?? 0) ||
      b.count - a.count ||
      a.logGroupName.localeCompare(b.logGroupName) ||
      a.id.localeCompare(b.id),
  )
}

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

function describeWindow(windowHours) {
  return windowHours >= 168 ? 'the last 7 days' : windowHours >= 24 ? 'the last 24 hours' : `the last ${windowHours}h`
}

/**
 * Confidence in the root cause, from evidence strength alone.
 */
function deriveConfidence({ primary, findings }) {
  if (!primary) return 'low'
  if (primary.confidence === 'low') return 'low'

  const share = primary.count / Math.max(1, findings.reduce((s, f) => s + f.count, 0))
  const strong =
    ['critical', 'high'].includes(primary.severity) &&
    primary.confidence === 'high' &&
    (share >= 0.4 || primary.isRecurring)

  if (strong) return 'high'
  if (['critical', 'high'].includes(primary.severity) || share >= 0.3) return 'medium'
  return 'low'
}

function factSheet({ findings, kpis, coverage }) {
  const ranked = rankFindings(findings)
  return {
    window: describeWindow(coverage?.windowHours ?? 24),
    totalFindings: kpis.totalFindings,
    totalOccurrences: findings.reduce((s, f) => s + f.count, 0),
    criticalFindings: kpis.criticalCount,
    affectedLogGroups: kpis.affectedGroupsCount,
    logGroupsScanned: coverage?.logGroupsScanned ?? null,
    topFindings: ranked.slice(0, 5).map((f) => ({
      category: f.category,
      severity: f.severity,
      occurrences: f.count,
      occurrencesPerHour: f.occurrencesPerHour,
      logGroup: f.logGroupName,
      recurring: f.isRecurring ? f.recurrenceDescription : false,
      sampleMessage: f.evidence?.[0]?.message?.slice(0, 200) ?? null,
    })),
  }
}

/**
 * Ask the model for ONE sentence. Returns null on any problem — the caller
 * always has a deterministic fallback ready.
 */
async function askForSentence({ system, facts, maxWords }) {
  try {
    const res = await icaChat(
      [
        { role: 'system', content: system },
        { role: 'user', content: JSON.stringify(facts) },
      ],
      [],
      { max_tokens: 160, temperature: 0 },
    )
    let text = res.choices?.[0]?.message?.content?.trim() ?? ''
    if (!text) return null
    // Take the first sentence/line only, and strip any list or label prefix the
    // model may have added despite instructions.
    text = text.split(/\r?\n/)[0].replace(/^[-*•\s]+/, '').replace(/^(likely cause|recommendation)\s*:\s*/i, '').trim()
    if (!text) return null
    if (text.split(/\s+/).length > maxWords) {
      text = text.split(/\s+/).slice(0, maxWords).join(' ') + '…'
    }
    return text
  } catch (e) {
    console.warn('[narrative] model call failed:', e.message)
    return null
  }
}

export async function generateRootCauseNarrative({ findings, correlations, kpis, coverage }) {
  if (!findings.length) {
    return [
      'Likely cause: No confirmed errors were detected in the analysed window, so there is no failure to attribute.',
      'Confidence: high',
      'Supporting evidence:',
      `• ${coverage?.logGroupsScanned ?? 0} log groups were scanned and no event survived noise suppression and classification.`,
    ].join('\n')
  }

  const ranked = rankFindings(findings)
  const primary = ranked[0]
  const confidence = deriveConfidence({ primary, findings })
  const facts = factSheet({ findings, kpis, coverage })

  // ── Evidence bullets: computed, never generated ──────────────────────────
  const bullets = []
  bullets.push(
    `• Highest-ranked finding: ${CATEGORY_PHRASE[primary.category] ?? primary.category} in ${primary.logGroupName} — ` +
      `${plural(primary.count, 'occurrence')} (${primary.occurrencesPerHour}/hour), severity ${primary.severity}.`,
  )

  if (primary.isRecurring && primary.recurrenceDescription) {
    bullets.push(`• That failure repeats ${primary.recurrenceDescription}, which points to a scheduled or retried operation rather than a one-off event.`)
  }

  const others = ranked.slice(1, 3)
  if (others.length) {
    bullets.push(
      `• Also present: ${others
        .map((f) => `${CATEGORY_PHRASE[f.category] ?? f.category} in ${f.logGroupName} (${plural(f.count, 'occurrence')}, ${f.severity})`)
        .join('; ')}.`,
    )
  }

  const inferred = (correlations ?? []).filter((c) => c.relationship === 'INFERRED')
  if (inferred.length) {
    bullets.push(`• ${plural(inferred.length, 'cross-log-group correlation')} fell inside the same 5-minute window, consistent with a failure spreading between services.`)
  }

  bullets.push(
    `• Scope: ${plural(kpis.totalFindings, 'distinct finding')} across ${plural(kpis.affectedGroupsCount, 'log group')}` +
      (coverage?.logGroupsScanned ? ` of ${coverage.logGroupsScanned} scanned` : '') +
      ` in ${facts.window}.`,
  )

  if (coverage?.groupsTruncated > 0) {
    bullets.push(`• ${plural(coverage.groupsTruncated, 'log group')} produced more matching events than the per-slice budget, so their occurrence counts are lower bounds.`)
  }

  // ── The one generated sentence ───────────────────────────────────────────
  const fallbackCause =
    `${(CATEGORY_PHRASE[primary.category] ?? primary.category).replace(/^./, (c) => c.toUpperCase())} in ${primary.logGroupName} ` +
    `account for the largest share of failures in ${facts.window}.`

  const generated = await askForSentence({
    system:
      'You are a cloud operations analyst. Given a factual summary of a CloudWatch log analysis, ' +
      'state the single most likely root cause in ONE sentence of at most 35 words.\n\n' +
      'RULES:\n' +
      '- Use only log groups, categories and numbers present in the JSON.\n' +
      '- Never invent counts, service names, timestamps or severities.\n' +
      '- A number from `occurrences` counts log events, not findings, and not findings of a severity. ' +
      'Write "67 occurrences" or "67 events", never "67 high-severity errors".\n' +
      '- Output the sentence only: no label, no bullet, no preamble, no trailing commentary.\n' +
      '- If the data does not support a single cause, say the failures appear unrelated.',
    facts,
    maxWords: 40,
  })

  return [
    `Likely cause: ${generated ?? fallbackCause}`,
    `Confidence: ${confidence}`,
    'Supporting evidence:',
    ...bullets,
  ].join('\n')
}

export async function generateExecutiveSummary({ kpis, findings, coverage }) {
  if (!findings.length) {
    return [
      '• No confirmed errors detected in the selected time range.',
      `• ${coverage?.logGroupsScanned ?? 0} log groups were scanned; every candidate event was either benign or unclassifiable.`,
      '• No recurring patterns detected.',
      '• No log group requires investigation based on this window.',
      '• No action required — re-run the report after the next deployment to confirm.',
    ].join('\n')
  }

  const ranked = rankFindings(findings)
  const primary = ranked[0]
  const facts = factSheet({ findings, kpis, coverage })
  const worst = SEVERITY_RANK.slice().reverse().find((s) => (kpis.severityCounts?.[s] ?? 0) > 0) ?? 'low'
  const recurring = findings.filter((f) => f.isRecurring)

  // ── Four computed bullets ────────────────────────────────────────────────
  const health =
    kpis.criticalCount > 0
      ? `Degraded — ${plural(kpis.criticalCount, 'critical finding')} of ${kpis.totalFindings} total across ${plural(kpis.affectedGroupsCount, 'log group')} in ${facts.window}.`
      : worst === 'high'
        ? `Elevated — no critical findings, but ${plural(kpis.severityCounts.high ?? 0, 'high-severity finding')} across ${plural(kpis.affectedGroupsCount, 'log group')} in ${facts.window}.`
        : `Stable — ${plural(kpis.totalFindings, 'finding')} in ${facts.window}, none above ${worst} severity.`

  const biggest =
    `Biggest issue: ${CATEGORY_PHRASE[primary.category] ?? primary.category} in ${primary.logGroupName} — ` +
    `${plural(primary.count, 'occurrence')} at ${primary.occurrencesPerHour}/hour (${primary.severity}).`

  const pattern = recurring.length
    ? `Recurrence: ${plural(recurring.length, 'finding')} repeat on a regular interval — ${recurring[0].logGroupName} ${recurring[0].recurrenceDescription}.`
    : 'No recurring patterns detected.'

  const investigateFirst = `Investigate first: ${primary.logGroupName} — highest-ranked finding by severity and rate.`

  // ── The one generated bullet ─────────────────────────────────────────────
  const fallbackAction = `Review the ${plural(primary.evidence?.length ?? 0, 'evidence sample')} for ${primary.logGroupName} in CloudWatch and confirm whether the ${primary.category} failures are still occurring.`

  const generated = await askForSentence({
    system:
      'You are a cloud operations analyst. Given a factual summary of a CloudWatch log analysis, ' +
      'give ONE concrete next action for the on-call engineer, in at most 30 words.\n\n' +
      'RULES:\n' +
      '- Reference only log groups and categories present in the JSON.\n' +
      '- Never invent counts, names or timestamps.\n' +
      '- Output the recommendation sentence only: no label, no bullet, no preamble.',
    facts,
    maxWords: 35,
  })

  const bullets = [`• ${health}`, `• ${biggest}`, `• ${pattern}`, `• ${investigateFirst}`, `• ${generated ?? fallbackAction}`]

  if (coverage?.groupsTruncated > 0 || coverage?.failedCollectors > 0) {
    const caveats = []
    if (coverage.groupsTruncated > 0) caveats.push(`${plural(coverage.groupsTruncated, 'log group')} hit the event budget (counts are lower bounds)`)
    if (coverage.failedCollectors > 0) caveats.push(`${plural(coverage.failedCollectors, 'log group')} could not be read`)
    bullets.push(`• Coverage caveat: ${caveats.join('; ')}.`)
  }

  return bullets.join('\n')
}
