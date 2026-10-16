const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { getDashboard } = require('../controllers/dashboardController');

const router = express.Router();

router.get('/', asyncHandler(getDashboard));

module.exports = router;
