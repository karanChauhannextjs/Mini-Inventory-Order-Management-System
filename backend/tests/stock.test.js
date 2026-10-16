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
    name: 'Stock Tester',
    email: 'stock@example.com',
    owner: auth.user._id,
  });

  const category = await Category.create({ name: 'Test', owner: auth.user._id });

  product = await Product.create({
    name: 'Limited Item',
    sku: 'LIM-001',
    price: 10,
    stock: 2,
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

const createPendingOrder = async (quantity) => {
  const res = await request(app)
    .post('/api/orders')
    .set(auth.auth)
    .send({
      customer: customer._id.toString(),
      items: [{ product: product._id.toString(), quantity }],
    });
  return res.body.data._id;
};

describe('Stock and order status', () => {
  test('rejects creating order above available stock', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set(auth.auth)
      .send({
        customer: customer._id.toString(),
        items: [{ product: product._id.toString(), quantity: 5 }],
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/insufficient stock/i);

    const unchanged = await Product.findById(product._id);
    expect(unchanged.stock).toBe(2);
  });

  test('rejects confirmation when stock is insufficient', async () => {
    const orderId = await createPendingOrder(2);

    await Product.findByIdAndUpdate(product._id, { stock: 1 });

    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set(auth.auth)
      .send({ status: 'Confirmed' });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/insufficient stock/i);

    const unchanged = await Product.findById(product._id);
    expect(unchanged.stock).toBe(1);
  });

  test('confirmation deducts stock exactly once', async () => {
    const orderId = await createPendingOrder(2);

    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set(auth.auth)
      .send({ status: 'Confirmed' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Confirmed');

    const updated = await Product.findById(product._id);
    expect(updated.stock).toBe(0);
  });

  test('cancelling confirmed order restores stock', async () => {
    const orderId = await createPendingOrder(2);

    await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set(auth.auth)
      .send({ status: 'Confirmed' });

    const afterConfirm = await Product.findById(product._id);
    expect(afterConfirm.stock).toBe(0);

    const cancelRes = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set(auth.auth)
      .send({ status: 'Cancelled' });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe('Cancelled');

    const restored = await Product.findById(product._id);
    expect(restored.stock).toBe(2);
  });

  test('second pending order cannot take stock reserved by another pending order', async () => {
    await Product.findByIdAndUpdate(product._id, { stock: 1 });

    const first = await createPendingOrder(1);
    expect(first).toBeTruthy();

    const secondRes = await request(app)
      .post('/api/orders')
      .set(auth.auth)
      .send({
        customer: customer._id.toString(),
        items: [{ product: product._id.toString(), quantity: 1 }],
      });

    expect(secondRes.status).toBe(409);
    expect(secondRes.body.message).toMatch(/insufficient stock/i);

    const unchanged = await Product.findById(product._id);
    expect(unchanged.stock).toBe(1);
  });

  test('cancelling pending order does not change stock', async () => {
    const orderId = await createPendingOrder(2);

    const cancelRes = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set(auth.auth)
      .send({ status: 'Cancelled' });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe('Cancelled');

    const unchanged = await Product.findById(product._id);
    expect(unchanged.stock).toBe(2);

    const secondCancel = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set(auth.auth)
      .send({ status: 'Cancelled' });

    expect(secondCancel.status).toBe(409);
  });

  test('concurrent confirmation attempts oversell only one unit', async () => {
    await Product.findByIdAndUpdate(product._id, { stock: 1 });

    const lineItem = {
      product: product._id,
      productName: product.name,
      sku: product.sku,
      quantity: 1,
      unitPrice: product.price,
      lineTotal: product.price,
    };

    const [orderA, orderB] = await Promise.all([
      Order.create({
        owner: auth.user._id,
        customer: customer._id,
        items: [lineItem],
        totalAmount: product.price,
        status: 'Pending',
      }),
      Order.create({
        owner: auth.user._id,
        customer: customer._id,
        items: [lineItem],
        totalAmount: product.price,
        status: 'Pending',
      }),
    ]);

    const [resA, resB] = await Promise.all([
      request(app)
        .patch(`/api/orders/${orderA._id}/status`)
        .set(auth.auth)
        .send({ status: 'Confirmed' }),
      request(app)
        .patch(`/api/orders/${orderB._id}/status`)
        .set(auth.auth)
        .send({ status: 'Confirmed' }),
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([200, 409]);

    const finalProduct = await Product.findById(product._id);
    expect(finalProduct.stock).toBe(0);

    const confirmedCount = await Order.countDocuments({ status: 'Confirmed' });
    expect(confirmedCount).toBe(1);
  });
});
