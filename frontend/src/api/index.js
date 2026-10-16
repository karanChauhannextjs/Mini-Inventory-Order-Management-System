import { api } from './http';

export const register = (data) =>
  api('/auth/register', { method: 'POST', body: JSON.stringify(data) });

export const login = (data) =>
  api('/auth/login', { method: 'POST', body: JSON.stringify(data) });

export const logout = () => api('/auth/logout', { method: 'POST' });

export const getMe = () => api('/auth/me');

export const getDashboard = () => api('/dashboard');

export const getProducts = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return api(`/products${qs ? `?${qs}` : ''}`);
};

export const getProduct = (id) => api(`/products/${id}`);

export const createProduct = (data) =>
  api('/products', { method: 'POST', body: JSON.stringify(data) });

export const updateProduct = (id, data) =>
  api(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteProduct = (id) =>
  api(`/products/${id}`, { method: 'DELETE' });

export const getCategories = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return api(`/categories${qs ? `?${qs}` : ''}`);
};

export const createCategory = (data) =>
  api('/categories', { method: 'POST', body: JSON.stringify(data) });

export const updateCategory = (id, data) =>
  api(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteCategory = (id) =>
  api(`/categories/${id}`, { method: 'DELETE' });

export const getCustomers = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return api(`/customers${qs ? `?${qs}` : ''}`);
};

export const createCustomer = (data) =>
  api('/customers', { method: 'POST', body: JSON.stringify(data) });

export const updateCustomer = (id, data) =>
  api(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteCustomer = (id) =>
  api(`/customers/${id}`, { method: 'DELETE' });

export const getOrders = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return api(`/orders${qs ? `?${qs}` : ''}`);
};

export const getOrder = (id) => api(`/orders/${id}`);

export const createOrder = (data) =>
  api('/orders', { method: 'POST', body: JSON.stringify(data) });

export const updateOrder = (id, data) =>
  api(`/orders/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteOrder = (id) => api(`/orders/${id}`, { method: 'DELETE' });

export const updateOrderStatus = (id, status) =>
  api(`/orders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
