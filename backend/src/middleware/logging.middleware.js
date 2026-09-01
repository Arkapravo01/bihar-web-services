export function loggingMiddleware(req, res, next) {
  const start = Date.now()
  const env   = req.query.env || 'qa'
  res.on('finish', () => {
    console.log(
      `[${new Date().toISOString()}] ${req.requestId} env=${env} ${req.method} ${req.path} -> ${res.statusCode} (${Date.now() - start}ms)`
    )
  })
  next()
}
