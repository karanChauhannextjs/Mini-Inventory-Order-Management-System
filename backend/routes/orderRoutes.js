const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  updateOrder,
  deleteOrder,
} = require('../controllers/orderController');

const router = express.Router();

router.post('/', asyncHandler(createOrder));
router.get('/', asyncHandler(getOrders));
router.get('/:id', asyncHandler(getOrderById));
router.patch('/:id/status', asyncHandler(updateOrderStatus));
router.put('/:id', asyncHandler(updateOrder));
router.delete('/:id', asyncHandler(deleteOrder));

module.exports = router;
