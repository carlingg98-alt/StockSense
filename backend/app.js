// REQUIREMENT [Core Req 2 - REST API]: "a clean app.js containing only configuration and mounting" - no business logic here.
// app.js only configures Express and mounts routers. No business logic lives here.
const express = require('express');
const cors = require('cors');

const logger = require('./middleware/logger');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const categoryRoutes = require('./routes/categories');
const supplierRoutes = require('./routes/suppliers');
const productRoutes = require('./routes/products');
const transactionRoutes = require('./routes/transactions');
const purchaseOrderRoutes = require('./routes/purchaseOrders');
const analyticsRoutes = require('./routes/analytics');

const app = express();

// CORS: allow the deployed frontend (CLIENT_URL) and any localhost port,
// because Vite moves to 5174, 5175... when 5173 is already taken.
// REQUIREMENT [Core Req 2 - REST API]: CORS is configured for the React frontend (CLIENT_URL or any localhost port).
const corsOptions = {
  origin(origin, callback) {
    const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin || '');
    // `!origin` covers tools such as Postman, which send no Origin header
    callback(null, !origin || isLocalhost || origin === process.env.CLIENT_URL);
  },
};

// REQUIREMENT [Core Req 2 - REST API]: middleware is registered in the correct order: cors -> JSON body parser -> logger -> routes -> 404 -> error handler.
// 1. Global middleware (runs before every route)
app.use(cors(corsOptions));
app.use(express.json());
// REQUIREMENT [Core Req 2 - REST API]: custom middleware (request logger), see middleware/logger.js.
app.use(logger);

// REQUIREMENT [Core Req 2 - REST API]: routers are created with express.Router() in the routes/ folder and only mounted here.
// Plural noun paths (/categories, /suppliers, /products, /transactions, /purchase-orders), HTTP method = the verb.
// 2. Routes
app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok' }));
app.use('/api/categories', categoryRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/products', productRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/analytics', analyticsRoutes);

// REQUIREMENT [Core Req 2 - REST API]: JSON 404 catch-all, registered AFTER all routes.
// 3. JSON 404 catch-all (only reached when no route matched)
app.use(notFound);

// REQUIREMENT [Core Req 2 - REST API]: error-handling middleware, registered LAST so every thrown error reaches it.
// 4. Error handler (must be registered last)
app.use(errorHandler);

module.exports = app;
