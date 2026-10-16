const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('./AppError');
const { isAccessTokenRevoked } = require('../utils/token');

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
};

const protect = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError('Not authorized. Please sign in.', 401));
  }

  const token = header.slice(7);

  try {
    if (await isAccessTokenRevoked(token)) {
      return next(new AppError('Invalid or expired session. Please sign in again.', 401));
    }

    const decoded = jwt.verify(token, getJwtSecret());
    const user = await User.findById(decoded.sub).select('-password');
    if (!user) {
      return next(new AppError('User no longer exists. Please sign in again.', 401));
    }
    req.user = user;
    next();
  } catch {
    next(new AppError('Invalid or expired session. Please sign in again.', 401));
  }
};

module.exports = protect;
