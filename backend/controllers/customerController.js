const Customer = require('../models/Customer');
const Order = require('../models/Order');
const AppError = require('../middleware/AppError');
const { isValidObjectId, parsePagination } = require('../utils/validators');
const { validateCustomerPayload } = require('../utils/fieldValidators');
const { ownerQuery, findOwnedById } = require('../utils/ownership');
const { caseInsensitiveRegex } = require('../utils/search');
const { sendPaginatedList } = require('../utils/listResponse');

const createCustomer = async (req, res) => {
  const customer = await Customer.create({
    ...validateCustomerPayload(req.body),
    owner: req.user._id,
  });

  res.status(201).json({
    success: true,
    message: 'Customer created successfully',
    data: customer,
  });
};

const getCustomers = async (req, res) => {
  const { search } = req.query;
  const { page, limit, skip } = parsePagination(req.query);

  const filter = ownerQuery(req.user._id);
  if (search) {
    const regex = caseInsensitiveRegex(search);
    filter.$or = [{ name: regex }, { email: regex }];
  }

  const [customers, total] = await Promise.all([
    Customer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Customer.countDocuments(filter),
  ]);

  sendPaginatedList(res, 'customers', customers, {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit) || 1,
  });
};

const getCustomerById = async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    throw new AppError('Invalid customer id', 400);
  }

  const customer = await findOwnedById(Customer, req.params.id, req.user._id, 'Customer');

  res.status(200).json({
    success: true,
    message: 'Customer retrieved successfully',
    data: customer,
  });
};

const updateCustomer = async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    throw new AppError('Invalid customer id', 400);
  }

  if (
    req.body.name === undefined &&
    req.body.email === undefined &&
    req.body.phone === undefined
  ) {
    throw new AppError('No valid fields to update', 400);
  }

  const updates = validateCustomerPayload(req.body, { isUpdate: true });

  const customer = await Customer.findOneAndUpdate(
    ownerQuery(req.user._id, { _id: req.params.id }),
    updates,
    { new: true, runValidators: true }
  );

  if (!customer) {
    throw new AppError('Customer not found', 404);
  }

  res.status(200).json({
    success: true,
    message: 'Customer updated successfully',
    data: customer,
  });
};

const deleteCustomer = async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    throw new AppError('Invalid customer id', 400);
  }

  const customer = await findOwnedById(Customer, req.params.id, req.user._id, 'Customer');

  const hasOrders = await Order.exists({ owner: req.user._id, customer: customer._id });
  if (hasOrders) {
    throw new AppError('Cannot delete customer with existing orders', 409);
  }

  await customer.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Customer deleted successfully',
    data: null,
  });
};

module.exports = {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
};
