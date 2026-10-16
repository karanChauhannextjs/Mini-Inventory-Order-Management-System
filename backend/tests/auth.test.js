const request = require('supertest');
const app = require('../app');
const { connectTestDB, disconnectTestDB, clearDatabase } = require('./helpers/testDb');

beforeAll(async () => {
  await connectTestDB();
});

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await disconnectTestDB();
});

describe('Auth email validation', () => {
  test('register rejects invalid email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test User',
      email: 'not-an-email',
      password: 'secret12',
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/valid email/i);
  });

  test('register rejects missing email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test User',
      password: 'secret12',
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/email is required/i);
  });

  test('login rejects invalid email', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'bad@@mail',
      password: 'secret12',
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/valid email/i);
  });
});

describe('Register uniqueness', () => {
  const sharedName = 'Alex Morgan';

  test('allows multiple accounts with the same name when emails differ', async () => {
    const first = await request(app).post('/api/auth/register').send({
      name: sharedName,
      email: 'alex.one@example.com',
      password: 'secret12',
    });
    const second = await request(app).post('/api/auth/register').send({
      name: sharedName,
      email: 'alex.two@example.com',
      password: 'secret12',
    });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.data.user.name).toBe(sharedName);
    expect(second.body.data.user.name).toBe(sharedName);
    expect(first.body.data.user.email).not.toBe(second.body.data.user.email);
  });

  test('logout revokes the current access token', async () => {
    const email = `logout-${Date.now()}@example.com`;
    const registerRes = await request(app).post('/api/auth/register').send({
      name: 'Logout Test',
      email,
      password: 'secret12',
    });
    const token = registerRes.body.data.token;
    const authHeader = { Authorization: `Bearer ${token}` };

    const logoutRes = await request(app).post('/api/auth/logout').set(authHeader);
    expect(logoutRes.status).toBe(200);

    const meRes = await request(app).get('/api/auth/me').set(authHeader);
    expect(meRes.status).toBe(401);
  });

  test('rejects duplicate email', async () => {
    const email = 'duplicate@example.com';
    const first = await request(app).post('/api/auth/register').send({
      name: 'User One',
      email,
      password: 'secret12',
    });
    const second = await request(app).post('/api/auth/register').send({
      name: 'User Two',
      email,
      password: 'otherpass99',
    });

    expect(first.status).toBe(201);
    expect(second.status).toBe(409);
    expect(second.body.message).toMatch(/email already exists/i);
  });
});
