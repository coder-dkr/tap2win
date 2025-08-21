const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
  // Database validation errors
  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map(error => error.message);
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors
    });
  }
  
  // Database unique constraint errors
  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors[0].path;
    return res.status(400).json({
      success: false,
      message: `${field} already exists`
    });
  }
  
  // Database foreign key constraint errors
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid reference to related resource'
    });
  }
  
  // Database connection errors
  if (err.name === 'SequelizeConnectionError' || err.name === 'SequelizeConnectionTimedOutError') {
    console.error('Database connection error:', err);
    return res.status(503).json({
      success: false,
      message: 'Database service temporarily unavailable. Please try again.'
    });
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }
  
  // Redis connection errors
  if (err.message && err.message.includes('Redis')) {
    console.error('Redis error:', err);
    return res.status(503).json({
      success: false,
      message: 'Cache service temporarily unavailable. Please try again.'
    });
  }
  
  // Custom status errors
  if (err.status) {
    return res.status(err.status).json({
      success: false,
      message: err.message
    });
  }
  
  // Generic server error
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
};
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
module.exports = {
  errorHandler,
  notFound,
  asyncHandler
};
