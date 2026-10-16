const request = require('supertest');
const app = require('../app');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const { connectTestDB, disconnectTestDB, clearDatabase } = require('./helpers/testDb');
const { createAuthenticatedUser } = require('./helpers/auth');

let auth;
let customer;
let product;

beforeAll(async () => {
  await connectTestDB();
});

beforeEach(async () => {
  auth = await createAuthenticatedUser(app);
  customer = await Customer.create({
    name: 'Jane Doe',
    email: 'jane@example.com',
    owner: auth.user._id,
  });

  const category = await Category.create({ name: 'Electronics', owner: auth.user._id });

  product = await Product.create({
    name: 'Gadget',
    sku: 'GAD-100',
    price: 50,
    stock: 10,
    category: category._id,
    owner: auth.user._id,
    status: 'Active',
  });
});

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await disconnectTestDB();
});

describe('Orders API', () => {
  test('merges duplicate product lines into one item', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set(auth.auth)
      .send({
        customer: customer._id.toString(),
        items: [
          { product: product._id.toString(), quantity: 3 },
          { product: product._id.toString(), quantity: 4 },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].quantity).toBe(7);
    expect(res.body.data.totalAmount).toBe(350);
  });

  test('rejects fractional or zero quantities', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set(auth.auth)
      .send({
        customer: customer._id.toString(),
        items: [{ product: product._id.toString(), quantity: 1.5 }],
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('preserves order prices when product price changes', async () => {
    const createRes = await request(app)
      .post('/api/orders')
      .set(auth.auth)
      .send({
        customer: customer._id.toString(),
        items: [{ product: product._id.toString(), quantity: 2 }],
      });

    const orderId = createRes.body.data._id;
    expect(createRes.body.data.totalAmount).toBe(100);

    await Product.findByIdAndUpdate(product._id, { price: 200 });

    const order = await Order.findById(orderId);
    expect(order.totalAmount).toBe(100);
    expect(order.items[0].unitPrice).toBe(50);
  });

  test('rejects editing a confirmed order', async () => {
    const createRes = await request(app)
      .post('/api/orders')
      .set(auth.auth)
      .send({
        customer: customer._id.toString(),
        items: [{ product: product._id.toString(), quantity: 1 }],
      });

    const orderId = createRes.body.data._id;

    await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set(auth.auth)
      .send({ status: 'Confirmed' });

    const editRes = await request(app)
      .put(`/api/orders/${orderId}`)
      .set(auth.auth)
      .send({
        customer: customer._id.toString(),
        items: [{ product: product._id.toString(), quantity: 2 }],
      });

    expect(editRes.status).toBe(409);
    expect(editRes.body.success).toBe(false);
  });

  test('rejects order quantity above available stock', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set(auth.auth)
      .send({
        customer: customer._id.toString(),
        items: [{ product: product._id.toString(), quantity: 11 }],
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/insufficient stock/i);
  });

  test('rejects merged quantity above available stock', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set(auth.auth)
      .send({
        customer: customer._id.toString(),
        items: [
          { product: product._id.toString(), quantity: 6 },
          { product: product._id.toString(), quantity: 5 },
        ],
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/insufficient stock/i);
  });

  test('pending order does not reduce stock on creation', async () => {
    await request(app)
      .post('/api/orders')
      .set(auth.auth)
      .send({
        customer: customer._id.toString(),
        items: [{ product: product._id.toString(), quantity: 5 }],
      });

    const updated = await Product.findById(product._id);
    expect(updated.stock).toBe(10);
  });
});
