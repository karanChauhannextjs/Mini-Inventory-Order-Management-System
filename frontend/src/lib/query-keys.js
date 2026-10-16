export const queryKeys = {
  me: ['auth', 'me'],
  dashboard: ['dashboard'],
  products: (params) => ['products', params],
  product: (id) => ['product', id],
  categories: (params) => ['categories', params],
  customers: (params) => ['customers', params],
  orders: (params) => ['orders', params],
  order: (id) => ['order', id],
};
