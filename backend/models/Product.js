const mongoose = require('mongoose');

const UNITS = ['pc', 'pack', 'bottle', 'sachet', 'can', 'box', 'kg'];

// REQUIREMENT [Core Req 1 - Database and Data Modeling]: collection 3 of 5 (Product) - the MAIN collection (full CRUD in routes/products.js).
// RELATIONSHIPS: category -> Category and supplier -> Supplier through ObjectId + ref (can be populated).
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      minlength: [2, 'Product name must be at least 2 characters'],
      maxlength: [80, 'Product name must be at most 80 characters'],
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      // REQUIREMENT [Core Req 1 - Database and Data Modeling]: unique rule - no two products may share a SKU.
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z0-9-]{3,20}$/, 'SKU must be 3-20 letters, numbers or dashes'],
    },
    // REQUIREMENT [Core Req 1 - Database and Data Modeling]: related collections - a Product belongs to one Category (ObjectId reference).
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
    },
    // REQUIREMENT [Core Req 1 - Database and Data Modeling]: related collections - a Product belongs to one Supplier (ObjectId reference).
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: [true, 'Supplier is required'],
    },
    // REQUIREMENT [Core Req 1 - Database and Data Modeling]: enum + default rule.
    unit: { type: String, enum: { values: UNITS, message: 'Unknown unit' }, default: 'pc' },
    unitCost: {
      type: Number,
      required: [true, 'Unit cost is required'],
      min: [0, 'Unit cost cannot be negative'],
    },
    unitPrice: {
      type: Number,
      required: [true, 'Selling price is required'],
      min: [0, 'Selling price cannot be negative'],
      // REQUIREMENT [Data Processing and Business Logic]: business rule enforced in the schema - the selling price can never be lower than the unit cost.
      validate: {
        // `this` is the document because we always save with product.save()
        validator(value) {
          return value >= this.unitCost;
        },
        message: 'Selling price cannot be lower than the unit cost',
      },
    },
    // Current stock on hand. Never edited directly: only sales, restocks
    // and write-offs change it (see services/stockService.js).
    // REQUIREMENT [Data Processing and Business Logic]: availability / stock level logic - min 0 means stock can never go negative and it must be a whole number.
    quantity: {
      type: Number,
      default: 0,
      min: [0, 'Stock cannot go below zero'],
      validate: { validator: Number.isInteger, message: 'Stock must be a whole number' },
    },
    // REQUIREMENT [Data Processing and Business Logic]: reorder level - the threshold used for the low-stock flag, the forecast and the reorder suggestion. Uses default, min and max.
    reorderLevel: {
      type: Number,
      default: 10,
      min: [0, 'Reorder level cannot be negative'],
      max: [100000, 'Reorder level is too large'],
    },
    // REQUIREMENT [Data Processing and Business Logic]: date logic - used to compute days until expiry, the expired flag and the value at risk (GET /api/products/expiring).
    expiryDate: { type: Date, default: null },
  },
  // REQUIREMENT [Core Req 1 - Database and Data Modeling]: timestamps.
  { timestamps: true }
);

productSchema.statics.UNITS = UNITS;

module.exports = mongoose.model('Product', productSchema);
