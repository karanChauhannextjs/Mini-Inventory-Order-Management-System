const request = require('supertest');
const app = require('../app');
const { connectTestDB, disconnectTestDB, clearDatabase } = require('./helpers/testDb');
const { createAuthenticatedUser } = require('./helpers/auth');

beforeAll(async () => {
  await connectTestDB();
});

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await disconnectTestDB();
});

describe('API HTTP behaviour', () => {
  test('list endpoints return 200 with JSON body, not 304', async () => {
    const { auth } = await createAuthenticatedUser(app);

    const res = await request(app)
      .get('/api/products')
      .set(auth)
      .set('If-None-Match', '"stale-etag"');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.headers['cache-control']).toMatch(/no-store/i);
  });

  test('unknown API route returns 404 with message', async () => {
    const { auth } = await createAuthenticatedUser(app);
    const res = await request(app).get('/api/does-not-exist').set(auth);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBeTruthy();
  });
});
