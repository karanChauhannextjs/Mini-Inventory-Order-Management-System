const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', '.mongo-memory.json');

let connected = false;
let refCount = 0;

const connectTestDB = async () => {
  refCount += 1;

  if (connected) {
    return;
  }

  const { uri } = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  await mongoose.connect(uri);
  connected = true;
};

const disconnectTestDB = async () => {
  refCount -= 1;

  if (refCount > 0 || !connected) {
    return;
  }

  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }

  connected = false;
};

const clearDatabase = async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
};

module.exports = {
  connectTestDB,
  disconnectTestDB,
  clearDatabase,
};
