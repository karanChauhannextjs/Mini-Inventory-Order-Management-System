const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');

const router = express.Router();

router.post('/', asyncHandler(createProduct));
router.get('/', asyncHandler(getProducts));
router.get('/:id', asyncHandler(getProductById));
router.put('/:id', asyncHandler(updateProduct));
router.delete('/:id', asyncHandler(deleteProduct));

module.exports = router;
