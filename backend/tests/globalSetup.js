const { MongoMemoryReplSet } = require('mongodb-memory-server');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '.mongo-memory.json');

module.exports = async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key';
  const replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
  });

  fs.writeFileSync(
    CONFIG_PATH,
    JSON.stringify({ uri: replSet.getUri() }),
    'utf8'
  );

  globalThis.__MONGO_REPL_SET__ = replSet;
};

module.exports.CONFIG_PATH = CONFIG_PATH;
