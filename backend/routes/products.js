const express = require('express');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Supplier = require('../models/Supplier');
const Transaction = require('../models/Transaction');
const PurchaseOrder = require('../models/PurchaseOrder');
const HttpError = require('../utils/HttpError');
const pick = require('../utils/pick');
const validateObjectId = require('../middleware/validateObjectId');
const { recordTransaction } = require('../services/stockService');
const { loadSalesByProduct, buildForecast } = require('../services/forecastService');
const { daysUntil, clampInt } = require('../services/dateUtils');

const router = express.Router();
// REQUIREMENT [Core Req 2 - REST API]: invalid :id values are rejected with 400 for every route in this file.
router.param('id', validateObjectId);

// REQUIREMENT [Core Req 2 - REST API]: whitelist of editable fields (used with utils/pick.js). Quantity is NOT here, so stock can only change through transactions.
// `quantity` is deliberately missing: stock only changes through transactions.
const FIELDS = ['name', 'sku', 'category', 'supplier', 'unit', 'unitCost', 'unitPrice', 'reorderLevel', 'expiryDate'];
const POPULATE = [
  { path: 'category', select: 'name' },
  { path: 'supplier', select: 'name leadTimeDays isActive' },
];

// Make sure the category and supplier IDs in the body point to real records.
// REQUIREMENT [Core Req 1 - Database and Data Modeling]: validates the relationships - the category and supplier IDs must point to real records (400 otherwise).
async function checkReferences(body) {
  if (body.category !== undefined) {
    const ok = validId(body.category) && (await Category.exists({ _id: body.category }));
    if (!ok) throw new HttpError(400, 'Selected category does not exist');
  }
  if (body.supplier !== undefined) {
    const ok = validId(body.supplier) && (await Supplier.exists({ _id: body.supplier }));
    if (!ok) throw new HttpError(400, 'Selected supplier does not exist');
  }
}

function validId(value) {
  return mongoose.isValidObjectId(value);
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------------------------------------------------------------------------
// REQUIREMENT [Core Req 2 - REST API]: static paths (/search, /low-stock, ...) are declared BEFORE /:id so they are not mistaken for an id. These are the PROCESSING endpoints.
// Processing endpoints. These must be declared BEFORE '/:id',
// otherwise Express would treat "search" or "low-stock" as an id.
// ---------------------------------------------------------------------------

// REQUIREMENT [Data Processing and Business Logic] (Processing endpoint 1): multi-criteria search, filtering and sorting - text, category, supplier, price range, stock status and sort order.
// Invalid query values return 400 instead of being ignored.
// GET /api/products/search?q=&category=&supplier=&status=&minPrice=&maxPrice=&sort=&order=
// Multi-criteria search, filter and sort.
router.get('/search', async (req, res) => {
  const { q, category, supplier, status, minPrice, maxPrice, sort = 'name', order = 'asc' } = req.query;

  const filter = {};
  if (q) {
    const pattern = new RegExp(escapeRegex(String(q).trim()), 'i');
    filter.$or = [{ name: pattern }, { sku: pattern }];
  }
  if (category) {
    if (!validId(category)) throw new HttpError(400, 'category must be a valid ID');
    filter.category = category;
  }
  if (supplier) {
    if (!validId(supplier)) throw new HttpError(400, 'supplier must be a valid ID');
    filter.supplier = supplier;
  }
  if (minPrice !== undefined && minPrice !== '') {
    if (Number.isNaN(Number(minPrice))) throw new HttpError(400, 'minPrice must be a number');
    filter.unitPrice = { ...filter.unitPrice, $gte: Number(minPrice) };
  }
  if (maxPrice !== undefined && maxPrice !== '') {
    if (Number.isNaN(Number(maxPrice))) throw new HttpError(400, 'maxPrice must be a number');
    filter.unitPrice = { ...filter.unitPrice, $lte: Number(maxPrice) };
  }

  // REQUIREMENT [Data Processing and Business Logic]: stock status filter (in-stock / low / out / expiring) - compares two fields of the same product, so it is done in JavaScript.
  const STATUSES = ['in-stock', 'low', 'out', 'expiring'];
  if (status && !STATUSES.includes(status)) {
    throw new HttpError(400, `status must be one of: ${STATUSES.join(', ')}`);
  }
  const SORTS = ['name', 'sku', 'quantity', 'unitPrice', 'unitCost', 'createdAt', 'stockValue'];
  if (!SORTS.includes(sort)) {
    throw new HttpError(400, `sort must be one of: ${SORTS.join(', ')}`);
  }

  let products = await Product.find(filter).populate(POPULATE).lean();

  // Stock status compares two fields of the same product, so we filter in JavaScript.
  if (status === 'out') products = products.filter((p) => p.quantity === 0);
  if (status === 'low') products = products.filter((p) => p.quantity > 0 && p.quantity <= p.reorderLevel);
  if (status === 'in-stock') products = products.filter((p) => p.quantity > p.reorderLevel);
  if (status === 'expiring') {
    products = products.filter((p) => p.expiryDate && daysUntil(p.expiryDate) <= 30);
  }

  const direction = order === 'desc' ? -1 : 1;
  const valueOf = (p) => (sort === 'stockValue' ? p.quantity * p.unitCost : p[sort]);
  products.sort((a, b) => {
    const x = valueOf(a);
    const y = valueOf(b);
    if (typeof x === 'string') return x.localeCompare(y) * direction;
    return (x - y) * direction;
  });

  res.status(200).json(products);
});

// REQUIREMENT [Data Processing and Business Logic] (Processing endpoint 2): availability logic - products at or below the reorder level, ranked emptiest first, with a computed shortBy value.
// GET /api/products/low-stock - at or below the reorder level, most urgent first
router.get('/low-stock', async (req, res) => {
  const products = await Product.find().populate(POPULATE).lean();

  const low = products
    .filter((p) => p.quantity <= p.reorderLevel)
    .map((p) => ({ ...p, shortBy: p.reorderLevel - p.quantity }))
    // Sort by how full the shelf is compared to its reorder level (emptiest first)
    .sort((a, b) => a.quantity / (a.reorderLevel || 1) - b.quantity / (b.reorderLevel || 1));

  res.status(200).json(low);
});

// REQUIREMENT [Data Processing and Business Logic] (Processing endpoint 3): date logic - days until expiry, expired flag and value at risk (quantity x unit cost).
// GET /api/products/expiring?days=30 - already expired or expiring within N days
router.get('/expiring', async (req, res) => {
  const days = clampInt(req.query.days, 30, 1, 365);
  const products = await Product.find({ expiryDate: { $ne: null }, quantity: { $gt: 0 } })
    .populate(POPULATE)
    .lean();

  const expiring = products
    .map((p) => {
      const daysLeft = daysUntil(p.expiryDate);
      return {
        ...p,
        daysUntilExpiry: daysLeft,
        isExpired: daysLeft < 0,
        valueAtRisk: p.quantity * p.unitCost, // money lost if it is not sold in time
      };
    })
    .filter((p) => p.daysUntilExpiry <= days)
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

  res.status(200).json(expiring);
});

// REQUIREMENT [Data Processing and Business Logic] (Processing endpoint 4): scoring / ranking - for every product it computes a forecast and suggested order quantity, then ranks by urgency.
// GET /api/products/reorder-suggestions?window=14
// Every product that should be reordered now, with a suggested quantity.
router.get('/reorder-suggestions', async (req, res) => {
  const windowDays = clampInt(req.query.window, 14, 3, 90);

  const [products, salesByProduct] = await Promise.all([
    Product.find().populate(POPULATE).lean(),
    loadSalesByProduct(windowDays),
  ]);

  const URGENCY_RANK = { out: 0, urgent: 1, soon: 2, ok: 3 };

  const suggestions = products
    .map((product) => {
      const leadTime = product.supplier ? product.supplier.leadTimeDays : 0;
      const forecast = buildForecast(product, salesByProduct.get(String(product._id)), windowDays, leadTime);
      delete forecast.daily; // the day-by-day series is only needed on the detail page
      return { product, forecast };
    })
    .filter((row) => row.forecast.needsReorder)
    .sort((a, b) => {
      const byUrgency = URGENCY_RANK[a.forecast.urgency] - URGENCY_RANK[b.forecast.urgency];
      if (byUrgency !== 0) return byUrgency;
      // Then by days of stock left; "no recent sales" (null) goes last
      const x = a.forecast.daysOfStockLeft ?? Infinity;
      const y = b.forecast.daysOfStockLeft ?? Infinity;
      return x - y;
    });

  res.status(200).json(suggestions);
});

// ---------------------------------------------------------------------------
// REQUIREMENT [Core Req 2 - REST API]: full CRUD on the MAIN collection (Product): list all, get one, create, update, delete.
// CRUD
// ---------------------------------------------------------------------------

// REQUIREMENT [Core Req 2 - REST API]: list all (200).
// GET /api/products
router.get('/', async (req, res) => {
  const products = await Product.find().populate(POPULATE).sort('name');
  res.status(200).json(products);
});

// REQUIREMENT [Core Req 2 - REST API]: get one (200, or 404 "Product not found").
// GET /api/products/:id
router.get('/:id', async (req, res) => {
  const product = await Product.findById(req.params.id).populate(POPULATE);
  if (!product) throw new HttpError(404, 'Product not found');
  res.status(200).json(product);
});

// REQUIREMENT [Data Processing and Business Logic] (Processing endpoint 5): moving-average demand forecast, days of stock left and the stock-out date for ONE product (logic in services/forecastService.js).
// GET /api/products/:id/forecast?window=14 - moving-average demand forecast
router.get('/:id/forecast', async (req, res) => {
  const windowDays = clampInt(req.query.window, 14, 3, 90);

  const product = await Product.findById(req.params.id).populate(POPULATE).lean();
  if (!product) throw new HttpError(404, 'Product not found');

  const salesByProduct = await loadSalesByProduct(windowDays, product._id);
  const leadTime = product.supplier ? product.supplier.leadTimeDays : 0;
  const forecast = buildForecast(product, salesByProduct.get(String(product._id)), windowDays, leadTime);

  res.status(200).json(forecast);
});

// REQUIREMENT [Data Processing and Business Logic] (Processing endpoint 6): running balance - replays the ledger in date order and computes balanceAfter for every row.
// GET /api/products/:id/transactions - stock ledger of one product with a running balance
router.get('/:id/transactions', async (req, res) => {
  const product = await Product.findById(req.params.id).lean();
  if (!product) throw new HttpError(404, 'Product not found');

  const transactions = await Transaction.find({ product: product._id }).sort({ date: 1, createdAt: 1 }).lean();

  // Running balance: start at zero and replay every movement in date order.
  let balance = 0;
  const ledger = transactions.map((t) => {
    balance += t.type === 'restock' ? t.quantity : -t.quantity;
    return { ...t, balanceAfter: balance };
  });

  res.status(200).json(ledger.reverse()); // newest first for display
});

// REQUIREMENT [Core Req 2 - REST API]: create (201). The opening quantity is saved as the first restock in the ledger so the quantity and the ledger always agree.
// POST /api/products - create; an opening quantity becomes the first restock in the ledger
router.post('/', async (req, res) => {
  await checkReferences(req.body);

  const opening = req.body.openingQuantity === undefined ? 0 : Number(req.body.openingQuantity);
  if (!Number.isInteger(opening) || opening < 0) {
    throw new HttpError(400, 'Opening quantity must be a whole number of 0 or more');
  }

  const product = await Product.create({ ...pick(req.body, FIELDS), quantity: 0 });

  if (opening > 0) {
    await recordTransaction({
      productId: product._id,
      type: 'restock',
      quantity: opening,
      note: 'Opening stock',
    });
  }

  const created = await Product.findById(product._id).populate(POPULATE);
  res.status(201).json(created);
});

// REQUIREMENT [Core Req 2 - REST API]: update (200 / 400 / 404). save() applies the full schema validation, including price >= cost.
// PUT /api/products/:id
router.put('/:id', async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new HttpError(404, 'Product not found');

  await checkReferences(req.body);
  product.set(pick(req.body, FIELDS));
  await product.save(); // full schema validation, including price >= cost

  await product.populate(POPULATE);
  res.status(200).json(product);
});

// REQUIREMENT [Core Req 2 - REST API]: delete (200 / 404).
// REQUIREMENT [Data Processing and Business Logic]: a product with stock history or purchase orders cannot be deleted (400), so reports are not changed.
// DELETE /api/products/:id - blocked when the product has history we must keep
router.delete('/:id', async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new HttpError(404, 'Product not found');

  const [movements, orders] = await Promise.all([
    Transaction.countDocuments({ product: product._id }),
    PurchaseOrder.countDocuments({ 'items.product': product._id }),
  ]);
  if (movements > 0) {
    throw new HttpError(
      400,
      `Cannot delete: ${product.name} has ${movements} stock movement(s). Deleting it would change your sales reports.`
    );
  }
  if (orders > 0) {
    throw new HttpError(400, `Cannot delete: ${product.name} is on ${orders} purchase order(s)`);
  }

  await product.deleteOne();
  res.status(200).json({ message: 'Product deleted' });
});

module.exports = router;
