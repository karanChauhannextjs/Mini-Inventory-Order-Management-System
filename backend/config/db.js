const mongoose = require('mongoose');
const { ensureUserIndexes } = require('../utils/ensureUserIndexes');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  await mongoose.connect(uri);
  await ensureUserIndexes();
  console.log('MongoDB connected');
};

module.exports = connectDB;
