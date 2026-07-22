const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error to console for development debugs
  console.error(err.stack || err);

  // Mongoose Bad ObjectId Error
  if (err.name === 'CastError') {
    const message = `Resource not found with id of ${err.value}`;
    error = new Error(message);
    error.statusCode = 404;
  }

  // Mongoose Duplicate Key Error (e.g. unique email duplication)
  if (err.code === 11000) {
    const message = 'Duplicate field value entered. A user with this email already exists.';
    error = new Error(message);
    error.statusCode = 400;
  }

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((val) => val.message).join(', ');
    error = new Error(message);
    error.statusCode = 400;
  }

  const statusCode = error.statusCode || 500;
  const responseMessage = error.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    error: responseMessage,
    // Include stack trace in development mode only
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

module.exports = errorHandler;
