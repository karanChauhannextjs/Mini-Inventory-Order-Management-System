module.exports = async () => {
  if (globalThis.__MONGO_REPL_SET__) {
    await globalThis.__MONGO_REPL_SET__.stop({ force: true });
    globalThis.__MONGO_REPL_SET__ = undefined;
  }
};
