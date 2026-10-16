const Product = require('../models/Product');
const Category = require('../models/Category');
const Order = require('../models/Order');
const AppError = require('../middleware/AppError');
const { isValidObjectId, parsePagination } = require('../utils/validators');
const { validateProductPayload } = require('../utils/fieldValidators');
const { assignUniqueSku } = require('../utils/skuGenerator');
const { ownerQuery, findOwnedById } = require('../utils/ownership');
const { caseInsensitiveRegex } = require('../utils/search');
const { sendPaginatedList } = require('../utils/listResponse');

const ALLOWED_SORT_FIELDS = ['name', 'sku', 'price', 'stock', 'status', 'createdAt'];
const ALLOWED_UPDATE_FIELDS = ['name', 'price', 'stock', 'status'];

const resolveCategoryId = async (body, ownerId) => {
  const categoryId = body.categoryId || body.category;
  if (!categoryId || !isValidObjectId(categoryId)) {
    throw new AppError('Valid categoryId is required', 400);
  }

  const category = await Category.findOne(ownerQuery(ownerId, { _id: categoryId }));
  if (!category) {
    throw new AppError('Category not found', 404);
  }

  return categoryId;
};

const createProduct = async (req, res) => {
  const ownerId = req.user._id;
  const payload = validateProductPayload(req.body);
  payload.category = await resolveCategoryId(req.body, ownerId);
  payload.owner = ownerId;

  const maxAttempts = 5;
  let product = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const sku = await assignUniqueSku(payload.name, Product, ownerId);
    try {
      product = await Product.create({ ...payload, sku });
      break;
    } catch (err) {
      if (err.code === 11000 && err.keyPattern?.sku && attempt < maxAttempts - 1) {
        continue;
      }
      throw err;
    }
  }

  if (!product) {
    throw new AppError('Could not generate a unique SKU. Please try again.', 409);
  }

  const populated = await Product.findById(product._id).populate('category', 'name');

  res.status(201).json({
    success: true,
    message: 'Product created successfully',
    data: populated,
  });
};

const getProducts = async (req, res) => {
  const { search, categoryId, status, sortBy, order } = req.query;
  const { page, limit, skip } = parsePagination(req.query);

  const filter = ownerQuery(req.user._id);

  if (search) {
    const regex = caseInsensitiveRegex(search);
    filter.$or = [{ name: regex }, { sku: regex }];
  }

  if (categoryId) {
    if (!isValidObjectId(categoryId)) {
      throw new AppError('Invalid category id', 400);
    }
    filter.category = categoryId;
  }

  if (status) {
    if (!['Active', 'Inactive'].includes(status)) {
      throw new AppError('Invalid status filter', 400);
    }
    filter.status = status;
  }

  let sortField = 'createdAt';
  if (sortBy) {
    if (!ALLOWED_SORT_FIELDS.includes(sortBy)) {
      throw new AppError('Invalid sort field', 400);
    }
    sortField = sortBy;
  }

  const sortOrder = order === 'asc' ? 1 : -1;
  const sort = { [sortField]: sortOrder };

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Product.countDocuments(filter),
  ]);

  sendPaginatedList(res, 'products', products, {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit) || 1,
  });
};

const getProductById = async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    throw new AppError('Invalid product id', 400);
  }

  const product = await Product.findOne(ownerQuery(req.user._id, { _id: req.params.id })).populate(
    'category',
    'name'
  );
  if (!product) {
    throw new AppError('Product not found', 404);
  }

  res.status(200).json({
    success: true,
    message: 'Product retrieved successfully',
    data: product,
  });
};

const updateProduct = async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    throw new AppError('Invalid product id', 400);
  }

  const hasCategory = req.body.categoryId !== undefined || req.body.category !== undefined;
  const hasProductField = ALLOWED_UPDATE_FIELDS.some((key) => req.body[key] !== undefined);

  if (!hasProductField && !hasCategory) {
    throw new AppError('No valid fields to update', 400);
  }

  const updates = hasProductField ? validateProductPayload(req.body, { isUpdate: true }) : {};

  if (hasCategory) {
    updates.category = await resolveCategoryId(req.body, req.user._id);
  }

  const product = await Product.findOneAndUpdate(ownerQuery(req.user._id, { _id: req.params.id }), updates, {
    new: true,
    runValidators: true,
  }).populate('category', 'name');

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  res.status(200).json({
    success: true,
    message: 'Product updated successfully',
    data: product,
  });
};

const deleteProduct = async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    throw new AppError('Invalid product id', 400);
  }

  const product = await findOwnedById(Product, req.params.id, req.user._id, 'Product');

  const referenced = await Order.exists({
    owner: req.user._id,
    'items.product': product._id,
  });
  if (referenced) {
    throw new AppError(
      'Cannot delete product that is referenced by orders. Deactivate it instead.',
      409
    );
  }

  await product.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Product deleted successfully',
    data: null,
  });
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};
