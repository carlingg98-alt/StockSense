const express = require('express');
const Category = require('../models/Category');
const Product = require('../models/Product');
const HttpError = require('../utils/HttpError');
const pick = require('../utils/pick');
const validateObjectId = require('../middleware/validateObjectId');

const router = express.Router();
// REQUIREMENT [Core Req 2 - REST API]: invalid :id values are rejected with 400 for every route in this file.
router.param('id', validateObjectId);

const FIELDS = ['name', 'description'];

// REQUIREMENT [Core Req 2 - REST API]: CRUD on Category - list all (200). Also returns a computed productCount per category.
// GET /api/categories - list all, each with how many products it holds
router.get('/', async (req, res) => {
  const [categories, products] = await Promise.all([
    Category.find().sort('name').lean(),
    Product.find().select('category').lean(),
  ]);

  const counts = {};
  for (const product of products) {
    const id = String(product.category);
    counts[id] = (counts[id] || 0) + 1;
  }

  res.status(200).json(categories.map((c) => ({ ...c, productCount: counts[String(c._id)] || 0 })));
});

// REQUIREMENT [Core Req 2 - REST API]: get one (200, or 404 "Category not found").
// GET /api/categories/:id
router.get('/:id', async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new HttpError(404, 'Category not found');
  res.status(200).json(category);
});

// REQUIREMENT [Core Req 2 - REST API]: create (201). Mongoose validation errors become 400 through the error handler.
// POST /api/categories
router.post('/', async (req, res) => {
  const category = await Category.create(pick(req.body, FIELDS));
  res.status(201).json(category);
});

// REQUIREMENT [Core Req 2 - REST API]: update (200 / 404 / 400). save() runs the schema validation again.
// PUT /api/categories/:id
router.put('/:id', async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new HttpError(404, 'Category not found');
  category.set(pick(req.body, FIELDS));
  await category.save(); // runs schema validation
  res.status(200).json(category);
});

// REQUIREMENT [Core Req 2 - REST API]: delete (200 / 404).
// REQUIREMENT [Data Processing and Business Logic]: referential rule - a category that still has products cannot be deleted (400).
// DELETE /api/categories/:id - blocked while products still use the category
router.delete('/:id', async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new HttpError(404, 'Category not found');

  const inUse = await Product.countDocuments({ category: category._id });
  if (inUse > 0) {
    throw new HttpError(400, `Cannot delete: ${inUse} product(s) are still in this category`);
  }

  await category.deleteOne();
  res.status(200).json({ message: 'Category deleted' });
});

module.exports = router;
