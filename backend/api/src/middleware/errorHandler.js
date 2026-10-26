/**
 * 404 Not Found Handler for unmatched routes
 */
export function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: `Cannot ${req.method} ${req.originalUrl}. Route does not exist.`,
  });
}

/**
 * Global Error Handling Middleware
 */
export function errorHandler(err, req, res, next) {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let errorType = 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'An unexpected error occurred';

  // Handle malformed JSON syntax error in request body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    errorType = 'MALFORMED_JSON';
    message = 'Invalid JSON payload received in request body.';
  }

  // Handle Mongoose schema validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorType = 'VALIDATION_ERROR';
    const firstKey = Object.keys(err.errors || {})[0];
    message = firstKey ? err.errors[firstKey].message : 'Database validation failed';
  }

  // Handle Mongoose invalid cast (e.g. invalid ObjectId format)
  if (err.name === 'CastError') {
    statusCode = 400;
    errorType = 'BAD_REQUEST';
    message = `Invalid value for field "${err.path}": ${err.value}`;
  }

  res.status(statusCode).json({
    success: false,
    error: errorType,
    message,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
}
