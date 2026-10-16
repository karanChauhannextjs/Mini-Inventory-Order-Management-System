const mongoose = require('mongoose');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { isValidObjectId, parsePositiveInt } = require('./validators');
const AppError = require('../middleware/AppError');

/**
 * Combine duplicate product lines in a request body into one entry per product.
 */
const mergeItemRequests = (items) => {
  const map = new Map();

  for (const item of items) {
    const productId = item.product?.toString();
    if (!productId) {
      throw new AppError('Each order item must include a product id', 400);
    }
    if (!isValidObjectId(productId)) {
      throw new AppError('Invalid product id in order items', 400);
    }

    const qtyResult = parsePositiveInt(item.quantity, 'Quantity');
    if (qtyResult.error) {
      throw new AppError(qtyResult.error, 400);
    }

    const existing = map.get(productId) || 0;
    map.set(productId, existing + qtyResult.value);
  }

  return Array.from(map.entries()).map(([product, quantity]) => ({
    product,
    quantity,
  }));
};

const getReservedPendingQuantities = async (
  productIds,
  { ownerId, excludeOrderId = null } = {}
) => {
  const map = new Map();
  if (!productIds?.length) return map;

  const ownerObjectId = new mongoose.Types.ObjectId(ownerId);
  const productObjectIds = productIds.map((id) => new mongoose.Types.ObjectId(id));
  const match = { status: 'Pending', owner: ownerObjectId };
  if (excludeOrderId) {
    match._id = { $ne: new mongoose.Types.ObjectId(excludeOrderId) };
  }

  const rows = await Order.aggregate([
    { $match: match },
    { $unwind: '$items' },
    { $match: { 'items.product': { $in: productObjectIds } } },
    { $group: { _id: '$items.product', total: { $sum: '$items.quantity' } } },
  ]);

  for (const row of rows) {
    map.set(row._id.toString(), row.total);
  }
  return map;
};

const getReservedPendingQuantity = async (productId, options = {}) => {
  const map = await getReservedPendingQuantities([productId], options);
  return map.get(String(productId)) ?? 0;
};

/**
 * Load products and build order line items with price snapshots.
 */
const buildOrderLineItems = async (mergedItems, { ownerId, excludeOrderId = null } = {}) => {
  if (!ownerId) {
    throw new AppError('Owner is required to build order items', 500);
  }

  const productIds = mergedItems.map((i) => i.product);
  const [products, reservedMap] = await Promise.all([
    Product.find({ _id: { $in: productIds }, owner: ownerId }).lean(),
    getReservedPendingQuantities(productIds, { ownerId, excludeOrderId }),
  ]);

  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  const lineItems = [];
  let totalAmount = 0;

  for (const { product, quantity } of mergedItems) {
    const doc = productMap.get(product);
    if (!doc) {
      throw new AppError(`Product not found: ${product}`, 404);
    }
    if (doc.status !== 'Active') {
      throw new AppError(`Product "${doc.name}" is not active`, 409);
    }

    const reserved = reservedMap.get(doc._id.toString()) ?? 0;
    const available = doc.stock - reserved;

    if (quantity > available) {
      const reservedNote =
        reserved > 0 ? ` (${reserved} reserved on other pending orders)` : '';
      throw new AppError(
        `Insufficient stock for "${doc.name}". Available: ${available}, requested: ${quantity}${reservedNote}`,
        409
      );
    }

    const unitPrice = doc.price;
    const lineTotal = quantity * unitPrice;
    totalAmount += lineTotal;

    lineItems.push({
      product: doc._id,
      productName: doc.name,
      sku: doc.sku,
      quantity,
      unitPrice,
      lineTotal,
    });
  }

  return { lineItems, totalAmount };
};

module.exports = {
  mergeItemRequests,
  buildOrderLineItems,
  getReservedPendingQuantity,
  getReservedPendingQuantities,
};
