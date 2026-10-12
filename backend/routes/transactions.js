const express = require('express');
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const HttpError = require('../utils/HttpError');
const validateObjectId = require('../middleware/validateObjectId');
const { recordTransaction, voidTransaction } = require('../services/stockService');
const { clampInt } = require('../services/dateUtils');

const router = express.Router();
// REQUIREMENT [Core Req 2 - REST API]: invalid :id values are rejected with 400.
router.param('id', validateObjectId);

const PRODUCT_FIELDS = 'name sku unit';

// REQUIREMENT [Core Req 2 - REST API]: server-side validation of dates - an invalid date is a 400, not a crash.
function parseDate(value, label) {
  // "2026-10-07" alone would be read as UTC midnight; add a time so it means local midnight
  const text = /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? `${value}T00:00:00` : value;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) throw new HttpError(400, `${label} is not a valid date`);
  return date;
}

// REQUIREMENT [Data Processing and Business Logic] (Processing endpoint 7): records a sale / restock / write-off. The real work is in services/stockService.js.
// Responds with 201 and the new stock level, plus an isLowStock flag.
// Shared by POST / and POST /sale
async function createTransaction(req, res, forcedType) {
  const { product, quantity, reason, note, date, unitCost } = req.body;
  const type = forcedType || req.body.type;

  if (!product) throw new HttpError(400, 'Product is required');
  if (!mongoose.isValidObjectId(product)) throw new HttpError(400, 'Product must be a valid ID');

  const result = await recordTransaction({
    productId: product,
    type,
    quantity: Number(quantity),
    reason,
    note,
    date: date ? parseDate(date, 'date') : undefined,
    unitCost: unitCost === undefined || unitCost === null || unitCost === '' ? undefined : Number(unitCost),
  });

  await result.transaction.populate('product', PRODUCT_FIELDS);

  // Send back the new stock level so the screen can show it without another request.
  res.status(201).json({
    transaction: result.transaction,
    stockAfter: result.product.quantity,
    isLowStock: result.product.quantity <= result.product.reorderLevel,
  });
}

// REQUIREMENT [Data Processing and Business Logic]: multi-criteria filtering - by type, product and date range (the "to" day is included), with a limit.
// GET /api/transactions?type=&product=&from=&to=&limit=
router.get('/', async (req, res) => {
  const { type, product, from, to } = req.query;
  const filter = {};

  if (type) {
    if (!Transaction.TYPES.includes(type)) throw new HttpError(400, 'type must be sale, restock or adjustment');
    filter.type = type;
  }
  if (product) {
    if (!mongoose.isValidObjectId(product)) throw new HttpError(400, 'product must be a valid ID');
    filter.product = product;
  }
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = parseDate(from, 'from');
    if (to) {
      const end = parseDate(to, 'to');
      end.setHours(23, 59, 59, 999); // include the whole "to" day
      filter.date.$lte = end;
    }
    if (from && to && filter.date.$gte > filter.date.$lte) {
      throw new HttpError(400, '"from" must be on or before "to"');
    }
  }

  const limit = clampInt(req.query.limit, 200, 1, 1000);
  const transactions = await Transaction.find(filter)
    .populate('product', PRODUCT_FIELDS)
    .sort({ date: -1, createdAt: -1 })
    .limit(limit);

  res.status(200).json(transactions);
});

// REQUIREMENT [Core Req 2 - REST API]: get one (200 / 404).
// GET /api/transactions/:id
router.get('/:id', async (req, res) => {
  const transaction = await Transaction.findById(req.params.id).populate('product', PRODUCT_FIELDS);
  if (!transaction) throw new HttpError(404, 'Transaction not found');
  res.status(200).json(transaction);
});

// REQUIREMENT [Core Req 2 - REST API]: create (201). Rejected with 400 when there is not enough stock.
// POST /api/transactions - record a sale, restock or write-off (type in the body)
router.post('/', (req, res) => createTransaction(req, res));

// REQUIREMENT [Data Processing and Business Logic]: dedicated "record a sale" endpoint.
// POST /api/transactions/sale - shortcut that always records a sale
router.post('/sale', (req, res) => createTransaction(req, res, 'sale'));

// REQUIREMENT [Data Processing and Business Logic]: ledger integrity - history is locked, only the note and date can be corrected (400 if anything else is sent).
// PUT /api/transactions/:id - only the note and date may be corrected.
// Quantities and amounts are history: to change them, void the transaction and record it again.
router.put('/:id', async (req, res) => {
  const transaction = await Transaction.findById(req.params.id);
  if (!transaction) throw new HttpError(404, 'Transaction not found');

  const locked = ['product', 'type', 'quantity', 'totalAmount', 'unitPrice', 'unitCost', 'profit'];
  const attempted = locked.filter((field) => req.body[field] !== undefined);
  if (attempted.length > 0) {
    throw new HttpError(400, `${attempted.join(', ')} cannot be edited. Void the transaction and record it again.`);
  }

  if (req.body.note !== undefined) transaction.note = req.body.note;
  if (req.body.date !== undefined) transaction.date = parseDate(req.body.date, 'date');
  await transaction.save();

  await transaction.populate('product', PRODUCT_FIELDS);
  res.status(200).json(transaction);
});

// REQUIREMENT [Data Processing and Business Logic]: void - deletes the row AND reverses its effect on stock (see voidTransaction).
// DELETE /api/transactions/:id - void: removes the row and reverses its effect on stock
router.delete('/:id', async (req, res) => {
  const transaction = await Transaction.findById(req.params.id);
  if (!transaction) throw new HttpError(404, 'Transaction not found');

  const product = await voidTransaction(transaction);
  res.status(200).json({
    message: 'Transaction voided and stock restored',
    stockAfter: product ? product.quantity : null,
  });
});

module.exports = router;
