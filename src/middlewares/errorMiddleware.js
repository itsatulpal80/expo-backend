function notFoundHandler(req, res) {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";

  res.status(statusCode).json({
    message,
    ...(process.env.NODE_ENV !== "production" ? { stack: err.stack } : {}),
  });
}

module.exports = { notFoundHandler, errorHandler };
