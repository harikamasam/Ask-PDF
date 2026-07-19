export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    next(error);
    return;
  }

  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({
    error: error.message || 'Unexpected server error'
  });
}
