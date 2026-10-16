const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');

const router = express.Router();

router.post('/', asyncHandler(createCategory));
router.get('/', asyncHandler(getCategories));
router.get('/:id', asyncHandler(getCategoryById));
router.put('/:id', asyncHandler(updateCategory));
router.delete('/:id', asyncHandler(deleteCategory));

module.exports = router;
