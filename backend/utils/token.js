const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const RevokedToken = require('../models/RevokedToken');

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
};

const signAccessToken = (userId) =>
  jwt.sign({ sub: userId.toString() }, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const revokeAccessToken = async (token, userId) => {
  const decoded = jwt.decode(token);
  if (!decoded?.exp) return;

  const expiresAt = new Date(decoded.exp * 1000);
  try {
    await RevokedToken.create({
      tokenHash: hashToken(token),
      user: userId,
      expiresAt,
    });
  } catch (err) {
    if (err.code !== 11000) throw err;
  }
};

const isAccessTokenRevoked = async (token) => {
  const found = await RevokedToken.exists({ tokenHash: hashToken(token) });
  return Boolean(found);
};

module.exports = {
  signAccessToken,
  revokeAccessToken,
  isAccessTokenRevoked,
};
