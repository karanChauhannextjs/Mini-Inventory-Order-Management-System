const AppError = require('./AppError');

const notFoundHandler = (req, res, next) => {
  if (req.path.startsWith('/api')) {
    next(new AppError(`Cannot ${req.method} ${req.originalUrl}`, 404));
    return;
  }
  next();
};

module.exports = notFoundHandler;
