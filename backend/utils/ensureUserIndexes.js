const User = require('../models/User');

const removeUsersWithoutEmail = async () => {
  const { deletedCount } = await User.deleteMany({
    $or: [{ email: { $exists: false } }, { email: null }, { email: '' }],
  });
  if (deletedCount > 0) {
    console.warn(`Removed ${deletedCount} user document(s) with missing email`);
  }
};

const dropLegacyUserIndexes = async () => {
  const indexes = await User.collection.indexes();
  const legacyNames = indexes
    .map((idx) => idx.name)
    .filter((name) => name === 'username_1');

  for (const name of legacyNames) {
    await User.collection.dropIndex(name);
    console.log(`Dropped legacy index ${name} on users`);
  }
};

const isEmailIndexDuplicateError = (err) =>
  err?.code === 11000 ||
  err?.codeName === 'DuplicateKey' ||
  /index:\s*email_1/i.test(String(err?.message));

const ensureUserIndexes = async () => {
  await removeUsersWithoutEmail();
  await dropLegacyUserIndexes();

  try {
    await User.syncIndexes();
  } catch (err) {
    if (!isEmailIndexDuplicateError(err)) {
      throw err;
    }
    await removeUsersWithoutEmail();
    await User.syncIndexes();
  }
};

module.exports = { ensureUserIndexes };
