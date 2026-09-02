export async function runPool(items, concurrency, worker) {
  const results = new Array(items.length)
  let cursor = 0
  async function lane() {
    while (true) {
      const idx = cursor++
      if (idx >= items.length) break
      try {
        results[idx] = { status: 'fulfilled', value: await worker(items[idx], idx) }
      } catch (err) {
        results[idx] = { status: 'rejected', reason: err }
      }
    }
  }
  const lanes = Array.from({ length: Math.min(concurrency, items.length) }, () => lane())
  await Promise.all(lanes)
  return results
}

export async function withTimeout(fn, ms) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    const value = await fn(controller.signal)
    return { timedOut: false, value }
  } catch (err) {
    if (controller.signal.aborted) return { timedOut: true }
    return { timedOut: false, error: err }
  } finally {
    clearTimeout(timer)
  }
}
