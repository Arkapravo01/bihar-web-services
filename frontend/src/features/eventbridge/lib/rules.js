/**
 * What an EventBridge rule actually is, from an operator's point of view.
 *
 * A rule is a wire: something triggers it, and it delivers to targets. Every
 * question worth asking on this page is about one end of that wire or the other —
 * when does this fire, where does it go, and is anything falling off the end.
 *
 * The interesting part is that EventBridge fails silently by design. A rule with
 * no targets matches its events and discards them, reporting success. A target
 * with no dead-letter queue drops a failed delivery after its retries with no
 * record anywhere. Neither shows up as an error in any console, so both are
 * computed here and stated in words on the row.
 */

/* ── rule state ─────────────────────────────────────────────────────────── */

export const RULE_STATES = {
  deadEnd: {
    id: 'deadEnd',
    label: 'Dead end',
    icon: 'alert',
    fill: 'bg-destructive',
    text: 'text-destructive',
  },
  disabled: {
    id: 'disabled',
    label: 'Disabled',
    icon: 'pause',
    fill: 'bg-warning',
    text: 'text-warning',
  },
  managed: {
    id: 'managed',
    label: 'AWS-managed',
    icon: 'lock',
    fill: 'bg-muted-foreground/40',
    text: 'text-muted-foreground',
  },
  live: {
    id: 'live',
    label: 'Live',
    icon: 'check',
    fill: 'bg-positive',
    text: 'text-positive',
  },
}

/** Worst first, and the order the posture bar and the ledger both read in. */
export const STATE_ORDER = ['deadEnd', 'disabled', 'managed', 'live']

/**
 * One state per rule, decided worst-first.
 *
 * A dead end outranks being disabled because a disabled rule is someone's
 * decision, while a rule that is switched on and throwing its events away is
 * nobody's decision. Ownership is deliberately the last thing checked: a rule
 * another service owns still deserves to be reported as broken, it just cannot be
 * fixed from here — which the row says separately, as a flag.
 */
export function ruleState(rule) {
  const enabled = rule.state === 'ENABLED'
  if (enabled && rule.targetCount === 0) return 'deadEnd'
  if (!enabled) return 'disabled'
  if (rule.managedBy) return 'managed'
  return 'live'
}

/**
 * Reasons a rule deserves a second look, as short phrases. Rows state their own
 * case in words so the meaning never rests on a colour — the positive and
 * destructive steps in the light palette are close to identical under red-green
 * colour blindness.
 */
export function ruleFlags(rule) {
  const flags = []
  const enabled = rule.state === 'ENABLED'
  const targets = rule.targets ?? []

  if (enabled && rule.targetCount === 0) {
    flags.push('no targets — matching events are discarded')
  }
  if (!enabled) {
    flags.push('switched off — matching events are not delivered anywhere')
  }
  if (rule.targetCount == null) {
    flags.push('targets could not be read')
  }
  if (enabled && targets.length > 0) {
    const unprotected = targets.filter((t) => !t.deadLetterArn).length
    if (unprotected === targets.length) {
      flags.push(
        targets.length === 1
          ? 'no dead-letter queue — a failed delivery is dropped without a record'
          : `no dead-letter queue on any of its ${targets.length} targets`,
      )
    } else if (unprotected > 0) {
      flags.push(`${unprotected} of ${targets.length} targets have no dead-letter queue`)
    }
  }
  if (rule.managedBy) {
    flags.push(`managed by ${rule.managedBy} — change it through that service`)
  }
  if (enabled && !rule.scheduleExpression && !rule.eventPattern) {
    flags.push('no schedule and no event pattern — nothing can trigger it')
  }
  return flags
}

/**
 * The one thing wrong with a rule that a person would act on, or null.
 *
 * A dense list can afford one line of explanation per row, so it has to be the
 * right line. A missing dead-letter queue is deliberately not it: it is worth
 * knowing and it is on most targets in most accounts, so putting it on the row
 * would give nearly every rule the same alarming subtitle and teach the operator
 * to read past all of them. The shield icon in the targets column carries it
 * instead, and the rule's own page spells it out.
 */
export function ruleConcern(rule) {
  if (rule.targetCount == null) return 'targets could not be read'
  if (rule.state === 'ENABLED' && rule.targetCount === 0) return 'no targets — matching events are discarded'
  if (rule.state !== 'ENABLED') return 'switched off — matching events are not delivered anywhere'
  if (!rule.scheduleExpression && !rule.eventPattern) return 'no schedule and no event pattern'
  if (rule.managedBy) return `managed by ${rule.managedBy}`
  return null
}

/** A rule needs action if it is on and losing events, or unreadable. */
export function needsAttention(rule) {
  if (rule.targetCount == null) return true
  return rule.state === 'ENABLED' && rule.targetCount === 0
}

export function summarize(rules) {
  const counts = { deadEnd: 0, disabled: 0, managed: 0, live: 0 }
  for (const r of rules) counts[ruleState(r)] += 1
  return {
    counts,
    total: rules.length,
    buses: new Set(rules.map((r) => r.eventBusName)).size,
    attention: rules.filter(needsAttention).length,
    scheduled: rules.filter((r) => r.scheduleExpression).length,
    targets: rules.reduce((n, r) => n + (r.targetCount ?? 0), 0),
  }
}

/* ── triggers ───────────────────────────────────────────────────────────── */

export function triggerKind(rule) {
  if (rule.scheduleExpression) return 'schedule'
  if (rule.eventPattern) return 'pattern'
  return 'none'
}

/**
 * The one-line answer to "what sets this off".
 *
 * An event pattern is JSON and can run to fifty lines, but the two fields that
 * identify it — which service emitted the event and what happened — are almost
 * always the first two keys. Those are pulled out for the row; the full pattern
 * stays one click away on the rule's own page.
 */
export function patternSummary(eventPattern) {
  if (!eventPattern) return null
  let parsed
  try {
    parsed = JSON.parse(eventPattern)
  } catch {
    return { source: null, detailType: null, label: 'custom pattern', keys: [] }
  }

  const asList = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : typeof v === 'string' ? [v] : [])
  const sources = asList(parsed.source)
  const detailTypes = asList(parsed['detail-type'])
  const keys = Object.keys(parsed)

  const source = sources.length === 1 ? sources[0] : sources.length > 1 ? `${sources.length} sources` : null
  const detailType = detailTypes.length === 1 ? detailTypes[0] : detailTypes.length > 1 ? `${detailTypes.length} event types` : null

  return {
    source,
    detailType,
    label: [source, detailType].filter(Boolean).join(' · ') || 'custom pattern',
    keys,
  }
}

/* ── schedules ──────────────────────────────────────────────────────────── */

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
/** AWS numbers the week 1–7 from Sunday, which is JS's 0–6 shifted by one. */
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

/** L, W and # are real cron syntax this parser does not implement. */
const UNSUPPORTED = /[LW#]/i

function fieldMatcher(spec, min, max, names = null) {
  if (spec === '*' || spec === '?') return () => true
  if (UNSUPPORTED.test(spec)) return null

  const toNumber = (token) => {
    const upper = token.toUpperCase()
    if (names) {
      const index = names.indexOf(upper)
      if (index !== -1) return index + min
    }
    const n = Number(token)
    return Number.isInteger(n) ? n : NaN
  }

  const allowed = new Set()
  for (const part of spec.split(',')) {
    const [range, stepText] = part.split('/')
    const step = stepText === undefined ? 1 : Number(stepText)
    if (!Number.isInteger(step) || step < 1) return null

    let from
    let to
    if (range === '*' || range === '?') {
      from = min
      to = max
    } else if (range.includes('-')) {
      const [a, b] = range.split('-')
      from = toNumber(a)
      to = toNumber(b)
    } else {
      from = toNumber(range)
      to = stepText === undefined ? from : max
    }
    if (Number.isNaN(from) || Number.isNaN(to) || from < min || to > max || from > to) return null
    for (let v = from; v <= to; v += step) allowed.add(v)
  }
  return (value) => allowed.has(value)
}

/**
 * A schedule, in the three forms the page needs: the expression as written, a
 * plain-English reading of it, and the actual clock times it fires at.
 *
 * Rate schedules deliberately return no times. `rate(5 minutes)` fires every five
 * minutes from whenever the rule was last created or re-enabled, and that instant
 * is not in any API response — so the phase is unknowable and inventing tick
 * marks for it would be a lie on the timeline. Rate rules are drawn as a band
 * instead of ticks, which is the honest shape for "continuously, all day".
 */
export function parseSchedule(expression) {
  if (!expression) return null
  const raw = expression.trim()

  const rate = /^rate\(\s*(\d+)\s+(minute|minutes|hour|hours|day|days)\s*\)$/i.exec(raw)
  if (rate) {
    const value = Number(rate[1])
    const unit = rate[2].toLowerCase().replace(/s$/, '')
    const perMinute = { minute: 1, hour: 60, day: 1440 }[unit]
    return {
      kind: 'rate',
      raw,
      label: value === 1 ? `every ${unit}` : `every ${value} ${unit}s`,
      everyMinutes: value * perMinute,
      fields: null,
      parsed: true,
    }
  }

  const cron = /^cron\((.+)\)$/i.exec(raw)
  if (!cron) return { kind: 'unknown', raw, label: raw, everyMinutes: null, fields: null, parsed: false }

  const parts = cron[1].trim().split(/\s+/)
  if (parts.length !== 6) {
    return { kind: 'cron', raw, label: 'custom schedule', everyMinutes: null, fields: null, parsed: false }
  }

  const [minute, hour, dom, month, dow, year] = parts
  const fields = {
    minute: fieldMatcher(minute, 0, 59),
    hour: fieldMatcher(hour, 0, 23),
    dom: fieldMatcher(dom, 1, 31),
    month: fieldMatcher(month, 1, 12, MONTHS),
    dow: fieldMatcher(dow, 1, 7, DAYS),
    year: fieldMatcher(year, 1970, 2199),
    // A `?` means "not constrained by this field", and AWS requires exactly one
    // of day-of-month / day-of-week to be `?`.
    domAny: dom === '?' || dom === '*',
    dowAny: dow === '?' || dow === '*',
  }
  const parsed = Object.values(fields).every((f) => f !== null)

  return {
    kind: 'cron',
    raw,
    label: parsed ? cronLabel({ minute, hour, dom, month, dow }) : 'custom schedule',
    everyMinutes: null,
    fields: parsed ? fields : null,
    parsed,
    text: { minute, hour, dom, month, dow, year },
  }
}

/**
 * Cron in English.
 *
 * The reading is assembled from two halves — when in the day, and which days —
 * because that is how the expressions themselves are built, and it covers the
 * shapes that actually appear in an account: a nightly job, a few times a day, a
 * weekday report, a month-end close. Anything genuinely irregular falls back to
 * "custom schedule" rather than being paraphrased into a sentence longer and
 * harder to read than the expression it replaces.
 */
function cronLabel({ minute, hour, dom, month, dow }) {
  const pad = (n) => String(n).padStart(2, '0')
  const at = (h, m) => `${pad(h)}:${pad(m)} UTC`
  const single = (spec) => (/^\d+$/.test(spec) ? Number(spec) : null)
  const numbers = (spec) =>
    spec.split(',').every((x) => /^\d+$/.test(x)) ? spec.split(',').map(Number) : null

  const m = single(minute)
  const h = single(hour)
  const stepMinute = /^\*\/(\d+)$/.exec(minute)
  const stepHour = /^\*\/(\d+)$/.exec(hour)

  // A cadence finer than a day describes itself, and no day phrase adds anything.
  if (stepMinute && hour === '*') return `every ${stepMinute[1]} minutes`
  if (m !== null && hour === '*') return `hourly at :${pad(m)}`
  if (m !== null && stepHour) return `every ${stepHour[1]} hours at :${pad(m)}`

  // Which days, as a phrase that can sit in front of a time.
  const anyDom = dom === '*' || dom === '?'
  const anyDow = dow === '*' || dow === '?'
  let days = null
  if (month === '*' && anyDom && anyDow) days = 'daily'
  else if (month === '*' && anyDom) {
    if (dow === '2-6' || dow.toUpperCase() === 'MON-FRI') days = 'weekdays'
    else {
      const named = dow.split(',').map((d) => {
        const n = single(d)
        return n ? DAYS[n - 1] : d.toUpperCase()
      })
      days = named.length <= 3 ? named.join(', ') : `${named.length} days a week`
    }
  } else if (month === '*' && anyDow && /^\d+$/.test(dom)) days = `day ${dom} of the month`

  if (days === null) return 'custom schedule'
  if (m === null) return 'custom schedule'

  if (h !== null) return `${days} at ${at(h, m)}`

  const hours = numbers(hour)
  if (hours && hours.length <= 3) {
    // The unit is stated once, at the end, however many times are listed.
    const times = hours.map((x) => `${pad(x)}:${pad(m)}`)
    const joined = `${times.slice(0, -1).join(', ')} and ${times[times.length - 1]} UTC`
    return days === 'daily' ? `at ${joined}` : `${days} at ${joined}`
  }
  if (hours) return `${hours.length} times a day at :${pad(m)}`

  return 'custom schedule'
}

/**
 * The next firing times, found by walking forward a minute at a time.
 *
 * Two days of minutes is 2,880 checks per rule, which costs nothing and — unlike
 * algebra on the fields — gets day-of-week and month restrictions right without
 * special cases. Rules that fire less often than the horizon simply return fewer
 * times than asked for, and the caller says "not in the next two days" rather
 * than guessing.
 */
export function nextFireTimes(schedule, { from = new Date(), count = 5, horizonHours = 48 } = {}) {
  if (!schedule || schedule.kind !== 'cron' || !schedule.fields) return []
  const f = schedule.fields
  const times = []

  const cursor = new Date(from)
  cursor.setUTCSeconds(0, 0)
  cursor.setUTCMinutes(cursor.getUTCMinutes() + 1)

  for (let i = 0; i < horizonHours * 60 && times.length < count; i += 1) {
    const dayOfMonthMatches = f.dom(cursor.getUTCDate())
    const dayOfWeekMatches = f.dow(cursor.getUTCDay() + 1)
    // Exactly one of the two day fields is a wildcard in a valid AWS expression,
    // so requiring both to match is the same as honouring the one that is set.
    const dayMatches = f.domAny ? dayOfWeekMatches : f.dowAny ? dayOfMonthMatches : dayOfMonthMatches && dayOfWeekMatches

    if (
      f.minute(cursor.getUTCMinutes()) &&
      f.hour(cursor.getUTCHours()) &&
      f.month(cursor.getUTCMonth() + 1) &&
      f.year(cursor.getUTCFullYear()) &&
      dayMatches
    ) {
      times.push(new Date(cursor))
    }
    cursor.setUTCMinutes(cursor.getUTCMinutes() + 1)
  }
  return times
}

/** "in 4m" / "in 3h 20m" — the useful reading of a next-fire time. */
export function untilLabel(date, from = new Date()) {
  if (!date) return null
  const minutes = Math.round((date.getTime() - from.getTime()) / 60000)
  if (minutes <= 0) return 'now'
  if (minutes < 60) return `in ${minutes}m`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours < 24) return rest === 0 ? `in ${hours}h` : `in ${hours}h ${rest}m`
  const days = Math.floor(hours / 24)
  return days === 1 ? 'in a day' : `in ${days} days`
}

export function clockUTC(date) {
  if (!date) return '—'
  return `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`
}

/* ── targets ────────────────────────────────────────────────────────────── */

/**
 * What kind of thing a target is, read from its ARN.
 *
 * The service segment of the ARN is the only reliable statement of a target's
 * type — nothing in the ListTargetsByRule response says "this is a Lambda". The
 * label is the one a person would use out loud, not the ARN's own namespace
 * ("Step Functions", not "states").
 */
const TARGET_KINDS = {
  lambda: { label: 'Lambda', icon: 'zap' },
  sqs: { label: 'SQS queue', icon: 'inbox' },
  sns: { label: 'SNS topic', icon: 'radio' },
  states: { label: 'Step Functions', icon: 'workflow' },
  ecs: { label: 'ECS task', icon: 'container' },
  events: { label: 'Event bus', icon: 'shuffle' },
  kinesis: { label: 'Kinesis stream', icon: 'waves' },
  firehose: { label: 'Firehose', icon: 'waves' },
  logs: { label: 'Log group', icon: 'scroll' },
  ssm: { label: 'Systems Manager', icon: 'terminal' },
  batch: { label: 'Batch job', icon: 'layers' },
  glue: { label: 'Glue job', icon: 'workflow' },
  codebuild: { label: 'CodeBuild', icon: 'hammer' },
  codepipeline: { label: 'CodePipeline', icon: 'gitBranch' },
  sagemaker: { label: 'SageMaker', icon: 'brain' },
  redshift: { label: 'Redshift', icon: 'database' },
  'execute-api': { label: 'API Gateway', icon: 'globe' },
  apigateway: { label: 'API Gateway', icon: 'globe' },
  scheduler: { label: 'Scheduler', icon: 'clock' },
}

export function targetKind(arn) {
  if (typeof arn !== 'string') return { service: null, label: 'Unknown target', icon: 'box', name: '—' }
  const [, , service = null, , , ...rest] = arn.split(':')
  const tail = rest.join(':')
  // Resource names appear after either a slash or a colon depending on service.
  const name = tail.split('/').pop().split(':').pop() || tail || arn
  const kind = TARGET_KINDS[service] ?? { label: service ? `${service} target` : 'Unknown target', icon: 'box' }
  return { service, label: kind.label, icon: kind.icon, name }
}

/** Targets grouped by kind, for the row's summary of where a rule delivers. */
export function targetSummary(targets) {
  if (!Array.isArray(targets)) return []
  const groups = new Map()
  for (const t of targets) {
    const kind = targetKind(t.arn)
    const existing = groups.get(kind.label)
    if (existing) existing.count += 1
    else groups.set(kind.label, { ...kind, count: 1, firstName: kind.name })
  }
  return [...groups.values()]
}
