const request = require('supertest');
const app = require('../app');
const Category = require('../models/Category');
const { connectTestDB, disconnectTestDB, clearDatabase } = require('./helpers/testDb');
const { createAuthenticatedUser } = require('./helpers/auth');

let auth;
let categoryId;

beforeAll(async () => {
  await connectTestDB();
});

beforeEach(async () => {
  auth = await createAuthenticatedUser(app);
  const category = await Category.create({ name: 'General', owner: auth.user._id });
  categoryId = category._id.toString();
});

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await disconnectTestDB();
});

describe('Required field validation', () => {
  test('rejects product without categoryId', async () => {
    const res = await request(app).post('/api/products').set(auth.auth).send({
      name: 'Test',
      price: 10,
      stock: 1,
      status: 'Active',
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/category/i);
  });

  test('rejects category without name', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set(auth.auth)
      .send({ description: 'No name' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/name is required/i);
  });

  test('rejects customer without email', async () => {
    const res = await request(app).post('/api/customers').set(auth.auth).send({ name: 'Jane' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/email is required/i);
  });

  test('rejects customer with invalid email', async () => {
    const res = await request(app)
      .post('/api/customers')
      .set(auth.auth)
      .send({ name: 'Jane', email: 'not-valid' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/valid email/i);
  });
});
