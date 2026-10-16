const request = require('supertest');

async function createAuthenticatedUser(app, overrides = {}) {
  const payload = {
    name: 'Test User',
    email: `user${Date.now()}${Math.random().toString(36).slice(2)}@test.com`,
    password: 'password123',
    ...overrides,
  };

  const res = await request(app).post('/api/auth/register').send(payload);
  if (res.status !== 201) {
    throw new Error(res.body?.message || 'Failed to register test user');
  }

  const token = res.body.data.token;
  return {
    user: res.body.data.user,
    token,
    auth: { Authorization: `Bearer ${token}` },
  };
}

module.exports = { createAuthenticatedUser };
