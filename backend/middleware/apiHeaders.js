/**
 * JSON APIs should not be cached or answered with 304 — always return a full 200 body.
 */
const apiHeaders = (req, res, next) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  });
  next();
};

module.exports = apiHeaders;
