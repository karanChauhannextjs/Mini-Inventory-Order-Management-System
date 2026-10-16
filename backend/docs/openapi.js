const objectId = {
  type: 'string',
  pattern: '^[a-fA-F0-9]{24}$',
  example: '507f1f77bcf86cd799439011',
};

const ok = (description = 'Successful response') => ({
  description,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } },
});

const errors = {
  400: { description: 'Invalid request', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
  401: { description: 'Authentication required or invalid', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
  404: { description: 'Resource not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
  409: { description: 'Conflicting resource state', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
};

const idParameter = (name = 'id', description = 'Resource ID') => ({
  name,
  in: 'path',
  required: true,
  description,
  schema: objectId,
});

const body = (schema) => ({
  required: true,
  content: { 'application/json': { schema } },
});

const secure = (operation) => ({ security: [{ bearerAuth: [] }], ...operation });

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'Mini Inventory & Order Management API',
    version: '1.0.0',
    description: 'REST API for each user\'s categories, products, customers, orders, and dashboard.',
  },
  servers: [{ url: 'http://localhost:5000', description: 'Local development server' }],
  tags: [
    { name: 'Health' }, { name: 'Authentication' }, { name: 'Categories' },
    { name: 'Products' }, { name: 'Customers' }, { name: 'Orders' }, { name: 'Dashboard' },
  ],
  paths: {
    '/api/health': { get: { tags: ['Health'], summary: 'Check API health', responses: { 200: ok() } } },
    '/api/auth/register': { post: { tags: ['Authentication'], summary: 'Create an account', requestBody: body({ $ref: '#/components/schemas/RegisterRequest' }), responses: { 201: ok('Account created'), 400: errors[400], 409: errors[409] } } },
    '/api/auth/login': { post: { tags: ['Authentication'], summary: 'Sign in and receive a JWT', requestBody: body({ $ref: '#/components/schemas/LoginRequest' }), responses: { 200: ok('Signed in'), 400: errors[400], 401: errors[401] } } },
    '/api/auth/me': { get: secure({ tags: ['Authentication'], summary: 'Get the current user', responses: { 200: ok(), 401: errors[401] } }) },
    '/api/auth/logout': { post: secure({ tags: ['Authentication'], summary: 'Revoke the current token', responses: { 200: ok(), 401: errors[401] } }) },
    '/api/categories': {
      get: secure({ tags: ['Categories'], summary: 'List categories', parameters: [{ name: 'search', in: 'query', schema: { type: 'string' } }, { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1 } }, { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 } }], responses: { 200: ok(), 401: errors[401] } }),
      post: secure({ tags: ['Categories'], summary: 'Create a category', requestBody: body({ $ref: '#/components/schemas/CategoryInput' }), responses: { 201: ok('Category created'), 400: errors[400], 401: errors[401], 409: errors[409] } }),
    },
    '/api/categories/{id}': {
      get: secure({ tags: ['Categories'], summary: 'Get a category', parameters: [idParameter()], responses: { 200: ok(), ...errors } }),
      put: secure({ tags: ['Categories'], summary: 'Update a category', parameters: [idParameter()], requestBody: body({ $ref: '#/components/schemas/CategoryInput' }), responses: { 200: ok(), ...errors } }),
      delete: secure({ tags: ['Categories'], summary: 'Delete a category', parameters: [idParameter()], responses: { 200: ok(), ...errors } }),
    },
    '/api/products': {
      get: secure({ tags: ['Products'], summary: 'List products', parameters: [{ name: 'search', in: 'query', schema: { type: 'string' } }, { name: 'categoryId', in: 'query', schema: objectId }, { name: 'status', in: 'query', schema: { type: 'string', enum: ['Active', 'Inactive'] } }, { name: 'page', in: 'query', schema: { type: 'integer' } }, { name: 'limit', in: 'query', schema: { type: 'integer' } }, { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['name', 'sku', 'price', 'stock', 'status', 'createdAt'] } }, { name: 'order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } }], responses: { 200: ok(), 401: errors[401] } }),
      post: secure({ tags: ['Products'], summary: 'Create a product (SKU is generated)', requestBody: body({ $ref: '#/components/schemas/ProductInput' }), responses: { 201: ok('Product created'), 400: errors[400], 401: errors[401], 404: errors[404] } }),
    },
    '/api/products/{id}': {
      get: secure({ tags: ['Products'], summary: 'Get a product', parameters: [idParameter()], responses: { 200: ok(), ...errors } }),
      put: secure({ tags: ['Products'], summary: 'Update a product', parameters: [idParameter()], requestBody: body({ $ref: '#/components/schemas/ProductInput' }), responses: { 200: ok(), ...errors } }),
      delete: secure({ tags: ['Products'], summary: 'Delete a product', parameters: [idParameter()], responses: { 200: ok(), ...errors } }),
    },
    '/api/customers': {
      get: secure({ tags: ['Customers'], summary: 'List customers', parameters: [{ name: 'search', in: 'query', schema: { type: 'string' } }, { name: 'page', in: 'query', schema: { type: 'integer' } }, { name: 'limit', in: 'query', schema: { type: 'integer' } }], responses: { 200: ok(), 401: errors[401] } }),
      post: secure({ tags: ['Customers'], summary: 'Create a customer', requestBody: body({ $ref: '#/components/schemas/CustomerInput' }), responses: { 201: ok('Customer created'), 400: errors[400], 401: errors[401], 409: errors[409] } }),
    },
    '/api/customers/{id}': {
      get: secure({ tags: ['Customers'], summary: 'Get a customer', parameters: [idParameter()], responses: { 200: ok(), ...errors } }),
      put: secure({ tags: ['Customers'], summary: 'Update a customer', parameters: [idParameter()], requestBody: body({ $ref: '#/components/schemas/CustomerInput' }), responses: { 200: ok(), ...errors } }),
      delete: secure({ tags: ['Customers'], summary: 'Delete a customer', parameters: [idParameter()], responses: { 200: ok(), ...errors } }),
    },
    '/api/orders': {
      get: secure({ tags: ['Orders'], summary: 'List orders', parameters: [{ name: 'status', in: 'query', schema: { type: 'string', enum: ['Pending', 'Confirmed', 'Cancelled'] } }, { name: 'search', in: 'query', description: 'Order ID, customer name, or email', schema: { type: 'string' } }, { name: 'page', in: 'query', schema: { type: 'integer' } }, { name: 'limit', in: 'query', schema: { type: 'integer' } }], responses: { 200: ok(), 401: errors[401] } }),
      post: secure({ tags: ['Orders'], summary: 'Create a pending order', requestBody: body({ $ref: '#/components/schemas/OrderInput' }), responses: { 201: ok('Order created'), ...errors } }),
    },
    '/api/orders/{id}': {
      get: secure({ tags: ['Orders'], summary: 'Get an order', parameters: [idParameter()], responses: { 200: ok(), ...errors } }),
      put: secure({ tags: ['Orders'], summary: 'Update a pending order', parameters: [idParameter()], requestBody: body({ $ref: '#/components/schemas/OrderInput' }), responses: { 200: ok(), ...errors } }),
      delete: secure({ tags: ['Orders'], summary: 'Delete an order', parameters: [idParameter()], responses: { 200: ok(), ...errors } }),
    },
    '/api/orders/{id}/status': { patch: secure({ tags: ['Orders'], summary: 'Confirm or cancel an order', parameters: [idParameter()], requestBody: body({ $ref: '#/components/schemas/OrderStatusInput' }), responses: { 200: ok(), ...errors } }) },
    '/api/dashboard': { get: secure({ tags: ['Dashboard'], summary: 'Get inventory and sales summary', responses: { 200: ok(), 401: errors[401] } }) },
  },
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Get a token from /api/auth/register or /api/auth/login, then click Authorize.' } },
    schemas: {
      SuccessResponse: { type: 'object', required: ['success', 'message'], properties: { success: { type: 'boolean', example: true }, message: { type: 'string' }, data: { nullable: true }, pagination: { type: 'object' } } },
      ErrorResponse: { type: 'object', required: ['success', 'message'], properties: { success: { type: 'boolean', example: false }, message: { type: 'string', example: 'Invalid request' } } },
      RegisterRequest: { type: 'object', required: ['name', 'email', 'password'], properties: { name: { type: 'string', example: 'Jane Doe' }, email: { type: 'string', format: 'email', example: 'jane@example.com' }, password: { type: 'string', format: 'password', minLength: 6, example: 'password123' } } },
      LoginRequest: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email', example: 'jane@example.com' }, password: { type: 'string', format: 'password', example: 'password123' } } },
      CategoryInput: { type: 'object', required: ['name'], properties: { name: { type: 'string', example: 'Electronics' }, description: { type: 'string', example: 'Electronic goods' } } },
      ProductInput: { type: 'object', properties: { name: { type: 'string', example: 'Wireless Mouse' }, price: { type: 'number', minimum: 0, example: 29.99 }, stock: { type: 'integer', minimum: 0, example: 50 }, categoryId: objectId, status: { type: 'string', enum: ['Active', 'Inactive'], example: 'Active' } }, required: ['name', 'price', 'stock', 'categoryId'] },
      CustomerInput: { type: 'object', required: ['name', 'email'], properties: { name: { type: 'string', example: 'Acme Corp' }, email: { type: 'string', format: 'email', example: 'orders@acme.test' }, phone: { type: 'string', example: '+1 555 0100' } } },
      OrderInput: { type: 'object', required: ['customer', 'items'], properties: { customer: objectId, items: { type: 'array', minItems: 1, items: { type: 'object', required: ['product', 'quantity'], properties: { product: objectId, quantity: { type: 'integer', minimum: 1, example: 2 } } } } } },
      OrderStatusInput: { type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['Confirmed', 'Cancelled'], example: 'Confirmed' } } },
    },
  },
};
