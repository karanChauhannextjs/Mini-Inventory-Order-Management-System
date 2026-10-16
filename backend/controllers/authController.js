const User = require('../models/User');
const AppError = require('../middleware/AppError');
const { revokeAccessToken, signAccessToken } = require('../utils/token');
const { validateEmail } = require('../utils/fieldValidators');

const toPublicUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
});

const register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name?.trim()) {
    throw new AppError('Name is required', 400);
  }
  const normalizedEmail = validateEmail(email);
  if (!password || String(password).length < 6) {
    throw new AppError('Password must be at least 6 characters', 400);
  }

  const exists = await User.findOne({ email: normalizedEmail });
  if (exists) {
    throw new AppError('An account with this email already exists', 409);
  }

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password,
  });

  const token = signAccessToken(user._id);

  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    data: {
      user: toPublicUser(user),
      token,
    },
  });
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!password) {
    throw new AppError('Password is required', 400);
  }

  const normalizedEmail = validateEmail(email);
  const user = await User.findOne({ email: normalizedEmail }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password', 401);
  }

  const token = signAccessToken(user._id);
  user.password = undefined;

  res.status(200).json({
    success: true,
    message: 'Signed in successfully',
    data: {
      user: toPublicUser(user),
      token,
    },
  });
};

const me = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Profile retrieved successfully',
    data: toPublicUser(req.user),
  });
};

const logout = async (req, res) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;

  if (token) {
    await revokeAccessToken(token, req.user._id);
  }

  res.status(200).json({
    success: true,
    message: 'Signed out successfully',
    data: null,
  });
};

module.exports = {
  register,
  login,
  me,
  logout,
};
