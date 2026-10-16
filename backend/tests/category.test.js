const request = require('supertest');
const app = require('../app');
const Category = require('../models/Category');
const Product = require('../models/Product');
const { connectTestDB, disconnectTestDB, clearDatabase } = require('./helpers/testDb');
const { createAuthenticatedUser } = require('./helpers/auth');

let auth;

beforeAll(async () => {
  await connectTestDB();
});

beforeEach(async () => {
  auth = await createAuthenticatedUser(app);
});

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await disconnectTestDB();
});

describe('Categories API', () => {
  test('creates and lists categories', async () => {
    const createRes = await request(app)
      .post('/api/categories')
      .set(auth.auth)
      .send({ name: 'Electronics', description: 'Gadgets' });

    expect(createRes.status).toBe(201);

    const listRes = await request(app).get('/api/categories').set(auth.auth);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);
  });

  test('rejects delete when products use category', async () => {
    const category = await Category.create({ name: 'In Use', owner: auth.user._id });
    await Product.create({
      name: 'Item',
      sku: 'SKU-1',
      price: 10,
      stock: 1,
      category: category._id,
      owner: auth.user._id,
      status: 'Active',
    });

    const res = await request(app).delete(`/api/categories/${category._id}`).set(auth.auth);
    expect(res.status).toBe(409);
  });
});
