const Product = require('../models/Product');
const Order = require('../models/Order');

const getDashboard = async (req, res) => {
  const ownerId = req.user._id;

  const [totalProducts, totalOrders, stockAgg, salesAgg, recentOrders] =
    await Promise.all([
      Product.countDocuments({ owner: ownerId }),
      Order.countDocuments({ owner: ownerId }),
      Product.aggregate([
        { $match: { owner: ownerId } },
        { $group: { _id: null, totalStock: { $sum: '$stock' } } },
      ]),
      Order.aggregate([
        { $match: { owner: ownerId, status: 'Confirmed' } },
        { $group: { _id: null, totalSales: { $sum: '$totalAmount' } } },
      ]),
      Order.find({ owner: ownerId })
        .populate('customer', 'name email')
        .sort({ createdAt: -1 })
        .limit(5),
    ]);

  res.status(200).json({
    success: true,
    message: 'Dashboard summary retrieved successfully',
    data: {
      totalProducts,
      totalOrders,
      totalStock: stockAgg[0]?.totalStock ?? 0,
      totalSales: salesAgg[0]?.totalSales ?? 0,
      recentOrders,
    },
  });
};

module.exports = { getDashboard };
