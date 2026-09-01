export function errorMiddleware(err, req, res, next) {
  const status = err.status || 500
  const code = err.code || 'INTERNAL_ERROR'
  if (status >= 500) console.error(req.requestId, err)

  res.status(status).json({
    success: false,
    error: {
      code,
      message: err.message,
      requestId: req.requestId,
    },
  })
}
