const express = require('express');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const PurchaseOrder = require('../models/PurchaseOrder');
const HttpError = require('../utils/HttpError');
const pick = require('../utils/pick');
const validateObjectId = require('../middleware/validateObjectId');

const router = express.Router();
// REQUIREMENT [Core Req 2 - REST API]: invalid :id values are rejected with 400 for every route in this file.
router.param('id', validateObjectId);

const FIELDS = ['name', 'contactPerson', 'phone', 'email', 'leadTimeDays', 'isActive'];

// REQUIREMENT [Core Req 2 - REST API]: CRUD on Supplier - list all (200). Also returns a computed productCount per supplier.
// GET /api/suppliers - list all, each with how many products it supplies
router.get('/', async (req, res) => {
  const [suppliers, products] = await Promise.all([
    Supplier.find().sort('name').lean(),
    Product.find().select('supplier').lean(),
  ]);

  const counts = {};
  for (const product of products) {
    const id = String(product.supplier);
    counts[id] = (counts[id] || 0) + 1;
  }

  res.status(200).json(suppliers.map((s) => ({ ...s, productCount: counts[String(s._id)] || 0 })));
});

// REQUIREMENT [Core Req 2 - REST API]: get one (200 / 404).
// GET /api/suppliers/:id
router.get('/:id', async (req, res) => {
  const supplier = await Supplier.findById(req.params.id);
  if (!supplier) throw new HttpError(404, 'Supplier not found');
  res.status(200).json(supplier);
});

// REQUIREMENT [Core Req 2 - REST API]: create (201 / 400 on validation or duplicate name).
// POST /api/suppliers
router.post('/', async (req, res) => {
  const supplier = await Supplier.create(pick(req.body, FIELDS));
  res.status(201).json(supplier);
});

// REQUIREMENT [Core Req 2 - REST API]: update (200 / 400 / 404).
// PUT /api/suppliers/:id
router.put('/:id', async (req, res) => {
  const supplier = await Supplier.findById(req.params.id);
  if (!supplier) throw new HttpError(404, 'Supplier not found');
  supplier.set(pick(req.body, FIELDS));
  await supplier.save();
  res.status(200).json(supplier);
});

// REQUIREMENT [Core Req 2 - REST API]: delete (200 / 404).
// REQUIREMENT [Data Processing and Business Logic]: referential rule - a supplier that still has products or purchase orders cannot be deleted (400).
// DELETE /api/suppliers/:id - blocked while products or purchase orders still point to it
router.delete('/:id', async (req, res) => {
  const supplier = await Supplier.findById(req.params.id);
  if (!supplier) throw new HttpError(404, 'Supplier not found');

  const [productCount, orderCount] = await Promise.all([
    Product.countDocuments({ supplier: supplier._id }),
    PurchaseOrder.countDocuments({ supplier: supplier._id }),
  ]);
  if (productCount > 0) {
    throw new HttpError(400, `Cannot delete: ${productCount} product(s) still use this supplier`);
  }
  if (orderCount > 0) {
    throw new HttpError(400, `Cannot delete: ${orderCount} purchase order(s) belong to this supplier`);
  }

  await supplier.deleteOne();
  res.status(200).json({ message: 'Supplier deleted' });
});

module.exports = router;
