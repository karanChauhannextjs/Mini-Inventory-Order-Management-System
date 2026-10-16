const mongoose = require('mongoose');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const AppError = require('../middleware/AppError');
const { isValidObjectId, parsePagination } = require('../utils/validators');
const { mergeItemRequests, buildOrderLineItems } = require('../utils/orderHelpers');
const { ownerQuery, findOwnedById } = require('../utils/ownership');
const { caseInsensitiveRegex } = require('../utils/search');

const isTransientTransactionError = (error) =>
  error?.errorLabels?.has?.('TransientTransactionError') || error?.code === 112;

const runInTransaction = async (work) => {
  const maxAttempts = 5;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();
      const result = await work(session);
      await session.commitTransaction();
      session.endSession();
      return result;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();

      if (isTransientTransactionError(error) && attempt < maxAttempts) {
        continue;
      }

      throw error;
    }
  }

  throw new AppError('Could not complete transaction. Please retry.', 409);
};

const deductStockForOrder = async (order, session) => {
  for (const item of order.items) {
    const result = await Product.updateOne(
      {
        _id: item.product,
        owner: order.owner,
        stock: { $gte: item.quantity },
      },
      { $inc: { stock: -item.quantity } },
      { session }
    );

    if (result.modifiedCount !== 1) {
      throw new AppError('Insufficient stock for one or more products', 409);
    }
  }
};

const restoreStockForOrder = async (order, session) => {
  for (const item of order.items) {
    await Product.updateOne(
      { _id: item.product },
      { $inc: { stock: item.quantity } },
      { session }
    );
  }
};

const createOrder = async (req, res) => {
  const { customer, items } = req.body;

  if (!customer || !isValidObjectId(customer)) {
    throw new AppError('Valid customer id is required', 400);
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('Order must contain at least one item', 400);
  }

  const customerDoc = await Customer.findOne(ownerQuery(req.user._id, { _id: customer }));
  if (!customerDoc) {
    throw new AppError('Customer not found', 404);
  }

  const mergedItems = mergeItemRequests(items);
  const { lineItems, totalAmount } = await buildOrderLineItems(mergedItems, {
    ownerId: req.user._id,
  });

  const order = await Order.create({
    owner: req.user._id,
    customer,
    items: lineItems,
    totalAmount,
    status: 'Pending',
  });

  const populated = await Order.findById(order._id).populate('customer', 'name email phone');

  res.status(201).json({
    success: true,
    message: 'Order created successfully',
    data: populated,
  });
};

const getOrders = async (req, res) => {
  const { status, search } = req.query;
  const { page, limit, skip } = parsePagination(req.query);

  const filter = ownerQuery(req.user._id);
  if (status) {
    if (!['Pending', 'Confirmed', 'Cancelled'].includes(status)) {
      throw new AppError('Invalid status filter', 400);
    }
    filter.status = status;
  }

  if (search && isValidObjectId(search)) {
    filter._id = search;
  }

  let query = Order.find(filter)
    .populate('customer', 'name email phone')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  if (search && !isValidObjectId(search)) {
    const regex = caseInsensitiveRegex(search);
    const customers = await Customer.find({
      owner: req.user._id,
      $or: [{ name: regex }, { email: regex }],
    })
      .select('_id')
      .lean();
    const customerIds = customers.map((c) => c._id);
    filter.customer = { $in: customerIds };
    query = Order.find(filter)
      .populate('customer', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
  }

  const [orders, total] = await Promise.all([
    query.lean(),
    Order.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    message: 'Orders retrieved successfully',
    data: orders,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
    },
  });
};

const getOrderById = async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    throw new AppError('Invalid order id', 400);
  }

  const order = await Order.findOne(ownerQuery(req.user._id, { _id: req.params.id }))
    .populate('customer', 'name email phone')
    .populate('items.product', 'name sku status');

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  res.status(200).json({
    success: true,
    message: 'Order retrieved successfully',
    data: order,
  });
};

const updateOrderStatus = async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    throw new AppError('Invalid order id', 400);
  }

  const { status } = req.body;
  if (!['Confirmed', 'Cancelled'].includes(status)) {
    throw new AppError('Status must be Confirmed or Cancelled', 400);
  }

  const updatedOrder = await runInTransaction(async (session) => {
    const order = await Order.findOne(ownerQuery(req.user._id, { _id: req.params.id })).session(
      session
    );
    if (!order) {
      throw new AppError('Order not found', 404);
    }

    if (order.status === 'Cancelled') {
      throw new AppError('Cannot change status of a cancelled order', 409);
    }

    if (status === 'Confirmed') {
      if (order.status === 'Confirmed') {
        throw new AppError('Order is already confirmed', 409);
      }
      if (order.status !== 'Pending') {
        throw new AppError('Only pending orders can be confirmed', 409);
      }

      await deductStockForOrder(order, session);
      order.status = 'Confirmed';
      await order.save({ session });
    }

    if (status === 'Cancelled') {
      if (order.status === 'Confirmed') {
        await restoreStockForOrder(order, session);
      }

      order.status = 'Cancelled';
      await order.save({ session });
    }

    return order;
  });

  const populated = await Order.findById(updatedOrder._id).populate(
    'customer',
    'name email phone'
  );

  const message =
    status === 'Confirmed'
      ? 'Order confirmed successfully'
      : 'Order cancelled successfully';

  res.status(200).json({
    success: true,
    message,
    data: populated,
  });
};

const updateOrder = async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    throw new AppError('Invalid order id', 400);
  }

  const order = await findOwnedById(Order, req.params.id, req.user._id, 'Order');

  if (order.status === 'Confirmed') {
    throw new AppError(
      'Confirmed orders cannot be edited because stock has already been deducted',
      409
    );
  }

  if (order.status === 'Cancelled') {
    throw new AppError('Cancelled orders cannot be edited', 409);
  }

  const { customer, items } = req.body;

  if (customer !== undefined) {
    if (!isValidObjectId(customer)) {
      throw new AppError('Valid customer id is required', 400);
    }
    const customerDoc = await Customer.findOne(ownerQuery(req.user._id, { _id: customer }));
    if (!customerDoc) {
      throw new AppError('Customer not found', 404);
    }
    order.customer = customer;
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('Order must contain at least one item', 400);
  }

  const mergedItems = mergeItemRequests(items);
  const { lineItems, totalAmount } = await buildOrderLineItems(mergedItems, {
    ownerId: req.user._id,
    excludeOrderId: order._id,
  });

  order.items = lineItems;
  order.totalAmount = totalAmount;
  await order.save();

  const populated = await Order.findById(order._id).populate(
    'customer',
    'name email phone'
  );

  res.status(200).json({
    success: true,
    message: 'Order updated successfully',
    data: populated,
  });
};

const deleteOrder = async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    throw new AppError('Invalid order id', 400);
  }

  const order = await findOwnedById(Order, req.params.id, req.user._id, 'Order');

  if (order.status === 'Confirmed') {
    throw new AppError(
      'Cannot delete a confirmed order. Cancel it first to restore stock.',
      409
    );
  }

  await order.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Order deleted successfully',
    data: null,
  });
};

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  updateOrder,
  deleteOrder,
};
