const AppError = require('./AppError');

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid id format';
  }

  if (err.name === 'ValidationError') {
    statusCode = 400;
    const messages = Object.values(err.errors).map((e) => e.message);
    message = messages.join(', ');
  }

  if (err.code === 11000) {
    statusCode = 409;
    const keyPattern = err.keyPattern || {};
    const field = Object.keys(keyPattern)[0] || 'field';
    message = `Duplicate value for ${field}`;
    if (field === 'sku') {
      message = 'A product with this SKU already exists';
    } else if (field === 'email') {
      message = 'An account with this email already exists';
    } else if (field === 'username') {
      message =
        'A legacy unique index on username is still in MongoDB. Restart the backend (indexes sync on connect) or drop index username_1 on the users collection.';
    }
  }

  if (process.env.NODE_ENV !== 'production' && statusCode === 500 && !err.isOperational) {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
};

module.exports = errorHandler;
