const LIST_COPY = {
  products: {
    empty: 'No products yet. Create your first product to get started.',
    ok: 'Products retrieved successfully',
  },
  categories: {
    empty: 'No categories yet. Add a category before creating products.',
    ok: 'Categories retrieved successfully',
  },
  customers: {
    empty: 'No customers yet. Add a customer to place orders.',
    ok: 'Customers retrieved successfully',
  },
  orders: {
    empty: 'No orders yet. Create your first order when you are ready.',
    ok: 'Orders retrieved successfully',
  },
};

const sendPaginatedList = (res, resourceKey, data, pagination) => {
  const copy = LIST_COPY[resourceKey] || {
    empty: 'No records yet.',
    ok: 'Data retrieved successfully',
  };
  const total = pagination?.total ?? 0;
  const isEmpty = total === 0;

  res.status(200).json({
    success: true,
    message: isEmpty ? copy.empty : copy.ok,
    isEmpty,
    data,
    pagination,
  });
};

module.exports = {
  sendPaginatedList,
  LIST_COPY,
};
