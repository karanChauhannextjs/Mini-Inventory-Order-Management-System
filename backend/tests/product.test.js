const request = require('supertest');
const app = require('../app');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Customer = require('../models/Customer');
const { connectTestDB, disconnectTestDB, clearDatabase } = require('./helpers/testDb');
const { createAuthenticatedUser } = require('./helpers/auth');

let auth;
let categoryId;

beforeAll(async () => {
  await connectTestDB();
});

beforeEach(async () => {
  auth = await createAuthenticatedUser(app);
  const category = await Category.create({ name: 'Hardware', owner: auth.user._id });
  categoryId = category._id.toString();
});

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await disconnectTestDB();
});

describe('Products API', () => {
  const validProduct = () => ({
    name: 'Widget',
    price: 25.5,
    stock: 100,
    categoryId,
    status: 'Active',
  });

  test('creates a product successfully', async () => {
    const res = await request(app).post('/api/products').set(auth.auth).send(validProduct());

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sku).toBe('WDG');

    const inDb = await Product.findOne({ sku: 'WDG', owner: auth.user._id });
    expect(inDb).not.toBeNull();
  });

  test('generates unique SKU when base collides', async () => {
    await request(app).post('/api/products').set(auth.auth).send(validProduct());

    const res = await request(app).post('/api/products').set(auth.auth).send(validProduct());

    expect(res.status).toBe(201);
    expect(res.body.data.sku).toBe('WDG-002');
  });

  test('assigns different SKUs for many products with the same name', async () => {
    const skus = new Set();

    for (let i = 0; i < 5; i += 1) {
      const res = await request(app).post('/api/products').set(auth.auth).send(validProduct());
      expect(res.status).toBe(201);
      skus.add(res.body.data.sku);
    }

    expect(skus.size).toBe(5);
  });

  test('rejects negative price', async () => {
    const res = await request(app)
      .post('/api/products')
      .set(auth.auth)
      .send({ ...validProduct(), price: -1 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('rejects negative stock', async () => {
    const res = await request(app)
      .post('/api/products')
      .set(auth.auth)
      .send({ ...validProduct(), stock: -1 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('allows zero stock', async () => {
    const res = await request(app)
      .post('/api/products')
      .set(auth.auth)
      .send({ ...validProduct(), stock: 0 });

    expect(res.status).toBe(201);
    expect(res.body.data.stock).toBe(0);
  });

  test('rejects delete when product is used on an order', async () => {
    const customer = await Customer.create({
      name: 'Buyer',
      email: 'buyer@example.com',
      owner: auth.user._id,
    });

    const createRes = await request(app).post('/api/products').set(auth.auth).send(validProduct());
    const productId = createRes.body.data._id;

    await request(app)
      .post('/api/orders')
      .set(auth.auth)
      .send({
        customer: customer._id.toString(),
        items: [{ product: productId, quantity: 1 }],
      });

    const deleteRes = await request(app).delete(`/api/products/${productId}`).set(auth.auth);
    expect(deleteRes.status).toBe(409);
    expect(deleteRes.body.message).toMatch(/referenced by orders/i);
  });

  test('cannot access another users product', async () => {
    const other = await createAuthenticatedUser(app);
    const createRes = await request(app).post('/api/products').set(auth.auth).send(validProduct());
    const productId = createRes.body.data._id;

    const res = await request(app).get(`/api/products/${productId}`).set(other.auth);
    expect(res.status).toBe(404);
  });
});
