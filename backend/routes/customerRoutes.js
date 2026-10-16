const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
} = require('../controllers/customerController');

const router = express.Router();

router.post('/', asyncHandler(createCustomer));
router.get('/', asyncHandler(getCustomers));
router.get('/:id', asyncHandler(getCustomerById));
router.put('/:id', asyncHandler(updateCustomer));
router.delete('/:id', asyncHandler(deleteCustomer));

module.exports = router;
