/**
 * Key rotation policy.
 *
 * AWS access keys do not expire. There is no expiry date to display, so the
 * useful question is not "when does this die" but "how long has this been
 * valid, and is anyone still using it". This module turns a key's age into a
 * rotation verdict against a window the operator chooses, which is why the
 * window lives in the client: changing it from a year to 30 days is a re-read
 * of data already on screen, not a round trip.
 */

export const ROTATION_WINDOWS = [30, 60, 90, 180, 365]
export const DEFAULT_ROTATION_DAYS = 365

/** Windows are chosen, not typed, so they get readable labels. */
export function rotationWindowLabel(days) {
  if (days === 365) return '1 year'
  if (days === 180) return '6 months'
  return `${days} days`
}

/** A key is flagged before it is actually overdue, at this share of the window. */
const DUE_SOON_AT = 0.75

/** Used but not for this long, and it is probably nobody's key any more. */
export const STALE_USE_DAYS = 90

export const KEY_STATES = {
  overdue: {
    id: 'overdue',
    label: 'Overdue',
    // Status colour is never the only signal — see globals.css. Every state
    // ships colour + icon + label together.
    icon: 'alert',
    fill: 'bg-destructive',
    text: 'text-destructive',
    ring: 'ring-destructive/30',
  },
  due: {
    id: 'due',
    label: 'Due soon',
    icon: 'clock',
    fill: 'bg-warning',
    text: 'text-warning',
    ring: 'ring-warning/30',
  },
  healthy: {
    id: 'healthy',
    label: 'Healthy',
    icon: 'check',
    fill: 'bg-positive',
    text: 'text-positive',
    ring: 'ring-positive/30',
  },
  inactive: {
    id: 'inactive',
    label: 'Disabled',
    icon: 'pause',
    fill: 'bg-muted-foreground/40',
    text: 'text-muted-foreground',
    ring: 'ring-border',
  },
}

/** Order the ledger and the posture bar both read in: worst first. */
export const STATE_ORDER = ['overdue', 'due', 'healthy', 'inactive']

/**
 * A disabled key cannot be used, so its age is not a risk and it is reported as
 * disabled rather than overdue — otherwise every retired key screams forever and
 * the operator learns to ignore the colour.
 */
export function keyState(key, rotationDays = DEFAULT_ROTATION_DAYS) {
  if (key.status !== 'Active') return 'inactive'
  const age = key.ageDays ?? 0
  if (age >= rotationDays) return 'overdue'
  if (age >= rotationDays * DUE_SOON_AT) return 'due'
  return 'healthy'
}

export function rotateByDate(key, rotationDays = DEFAULT_ROTATION_DAYS) {
  if (!key.createDate) return null
  return new Date(new Date(key.createDate).getTime() + rotationDays * 86_400_000)
}

export function daysUntilRotation(key, rotationDays = DEFAULT_ROTATION_DAYS) {
  if (key.ageDays == null) return null
  return rotationDays - key.ageDays
}

/**
 * Reasons a key deserves attention beyond simply being old. Returned as short
 * phrases so a row can state its own case instead of relying on a colour.
 */
export function keyFlags(key, rotationDays = DEFAULT_ROTATION_DAYS) {
  const flags = []
  const state = keyState(key, rotationDays)

  if (state === 'overdue') flags.push(`${key.ageDays}d old, past the ${rotationWindowLabel(rotationDays)} window`)
  else if (state === 'due') flags.push(`rotate within ${rotationDays - key.ageDays}d`)

  if (key.status === 'Active' && key.neverUsed) {
    flags.push(key.ageDays >= 7 ? 'never used since it was created' : 'not used yet')
  }
  if (key.status === 'Active' && !key.neverUsed && key.lastUsedDaysAgo >= STALE_USE_DAYS) {
    flags.push(`unused for ${key.lastUsedDaysAgo}d`)
  }
  return flags
}

/** A key needs action if it is active and either past due or clearly abandoned. */
export function needsAttention(key, rotationDays = DEFAULT_ROTATION_DAYS) {
  if (key.status !== 'Active') return false
  const state = keyState(key, rotationDays)
  if (state === 'overdue' || state === 'due') return true
  if (key.neverUsed && (key.ageDays ?? 0) >= 7) return true
  return (key.lastUsedDaysAgo ?? 0) >= STALE_USE_DAYS
}

export function summarize(keys, rotationDays = DEFAULT_ROTATION_DAYS) {
  const counts = { overdue: 0, due: 0, healthy: 0, inactive: 0 }
  for (const k of keys) counts[keyState(k, rotationDays)] += 1
  return {
    counts,
    total: keys.length,
    users: new Set(keys.map((k) => k.userName)).size,
    attention: keys.filter((k) => needsAttention(k, rotationDays)).length,
    oldestAge: keys.reduce((m, k) => Math.max(m, k.ageDays ?? 0), 0),
  }
}

/** "3 days ago" / "never" — short enough for a dense table cell. */
export function relativeDays(days) {
  if (days == null) return 'never'
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${(days / 365).toFixed(1)}y ago`
}
