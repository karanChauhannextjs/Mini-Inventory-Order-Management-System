const Category = require('../models/Category');
const Product = require('../models/Product');
const AppError = require('../middleware/AppError');
const { isValidObjectId, parsePagination } = require('../utils/validators');
const { validateCategoryPayload } = require('../utils/fieldValidators');
const { ownerQuery, findOwnedById } = require('../utils/ownership');
const { caseInsensitiveRegex } = require('../utils/search');
const { sendPaginatedList } = require('../utils/listResponse');

const createCategory = async (req, res) => {
  const category = await Category.create({
    ...validateCategoryPayload(req.body),
    owner: req.user._id,
  });

  res.status(201).json({
    success: true,
    message: 'Category created successfully',
    data: category,
  });
};

const getCategories = async (req, res) => {
  const { search } = req.query;
  const { page, limit, skip } = parsePagination(req.query);

  const filter = ownerQuery(req.user._id);
  if (search) {
    const regex = caseInsensitiveRegex(search);
    filter.$or = [{ name: regex }, { description: regex }];
  }

  const [categories, total] = await Promise.all([
    Category.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
    Category.countDocuments(filter),
  ]);

  sendPaginatedList(res, 'categories', categories, {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit) || 1,
  });
};

const getCategoryById = async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    throw new AppError('Invalid category id', 400);
  }

  const category = await findOwnedById(Category, req.params.id, req.user._id, 'Category');

  res.status(200).json({
    success: true,
    message: 'Category retrieved successfully',
    data: category,
  });
};

const updateCategory = async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    throw new AppError('Invalid category id', 400);
  }

  if (req.body.name === undefined && req.body.description === undefined) {
    throw new AppError('No valid fields to update', 400);
  }

  const updates = {};
  if (req.body.name !== undefined) {
    updates.name = validateCategoryPayload({ name: req.body.name }).name;
  }
  if (req.body.description !== undefined) {
    updates.description = req.body.description?.trim() || '';
  }

  const category = await Category.findOneAndUpdate(
    ownerQuery(req.user._id, { _id: req.params.id }),
    updates,
    { new: true, runValidators: true }
  );

  if (!category) {
    throw new AppError('Category not found', 404);
  }

  res.status(200).json({
    success: true,
    message: 'Category updated successfully',
    data: category,
  });
};

const deleteCategory = async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    throw new AppError('Invalid category id', 400);
  }

  const category = await findOwnedById(Category, req.params.id, req.user._id, 'Category');

  const inUse = await Product.exists({ owner: req.user._id, category: category._id });
  if (inUse) {
    throw new AppError('Cannot delete category that is used by products', 409);
  }

  await category.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Category deleted successfully',
    data: null,
  });
};

module.exports = {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
