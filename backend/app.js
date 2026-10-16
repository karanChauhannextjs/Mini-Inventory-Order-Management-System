const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const openApiDocument = require('./docs/openapi');
const errorHandler = require('./middleware/errorHandler');
const apiHeaders = require('./middleware/apiHeaders');
const notFoundHandler = require('./middleware/notFoundHandler');

const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const customerRoutes = require('./routes/customerRoutes');
const orderRoutes = require('./routes/orderRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const authRoutes = require('./routes/authRoutes');
const protect = require('./middleware/protect');

const app = express();

app.set('etag', false);

const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(
  cors({
    origin: clientUrl,
  })
);
app.use(express.json());
app.get('/api-docs.json', (req, res) => res.json(openApiDocument));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDocument, {
  customSiteTitle: 'Mini Inventory API Docs',
}));
app.use('/api', apiHeaders);

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is healthy',
    data: { uptime: process.uptime() },
  });
});

app.use('/api/auth', authRoutes);

const securedApi = express.Router();
securedApi.use(protect);
securedApi.use('/products', productRoutes);
securedApi.use('/categories', categoryRoutes);
securedApi.use('/customers', customerRoutes);
securedApi.use('/orders', orderRoutes);
securedApi.use('/dashboard', dashboardRoutes);
app.use('/api', securedApi);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
