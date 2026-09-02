/**
 * Statistical recurrence detection.
 * CV ≤ 0.5 means intervals cluster within ±50% of mean — "roughly regular".
 */

export function computeRecurrence(timestampsMs) {
  if (!timestampsMs || timestampsMs.length < 3) return { isRecurring: false, description: null }

  const sorted = [...timestampsMs].sort((a, b) => a - b)
  const intervals = []
  for (let i = 1; i < sorted.length; i++) {
    intervals.push(sorted[i] - sorted[i - 1])
  }

  const mean = intervals.reduce((s, v) => s + v, 0) / intervals.length
  if (mean <= 0) return { isRecurring: false, description: null }

  const variance = intervals.reduce((s, v) => s + (v - mean) ** 2, 0) / intervals.length
  const stddev = Math.sqrt(variance)
  const cv = stddev / mean

  if (cv > 0.5) return { isRecurring: false, description: null, meanIntervalMs: mean, coefficientOfVariation: cv }

  // Describe interval
  let description
  const meanSec = mean / 1000
  if (meanSec < 60) {
    description = `roughly every ${Math.round(meanSec)} seconds`
  } else {
    const meanMin = meanSec / 60
    const stdMin = (stddev / 1000) / 60
    const lo = Math.max(1, Math.round(meanMin - stdMin))
    const hi = Math.round(meanMin + stdMin)
    description = lo === hi ? `roughly every ${lo} minutes` : `roughly every ${lo}–${hi} minutes`
  }

  return { isRecurring: true, description, meanIntervalMs: mean, coefficientOfVariation: cv }
}
