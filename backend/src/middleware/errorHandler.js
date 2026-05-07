// ─────────────────────────────────────────
//  middleware/errorHandler.js
// ─────────────────────────────────────────

function errorHandler(err, req, res, next) {
  console.error('[Global Error]', err.message);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal server error.',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
}

module.exports = { errorHandler };
