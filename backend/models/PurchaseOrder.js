const mongoose = require('mongoose');

// REQUIREMENT [Data Processing and Business Logic]: status transitions with rules (draft -> ordered -> received, or cancelled). The allowed moves are enforced in routes/purchaseOrders.js.
const STATUSES = ['draft', 'ordered', 'received', 'cancelled'];

const itemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Each item needs a product'],
    },
    quantity: {
      type: Number,
      required: [true, 'Each item needs a quantity'],
      min: [1, 'Item quantity must be at least 1'],
      validate: { validator: Number.isInteger, message: 'Item quantity must be a whole number' },
    },
    unitCost: {
      type: Number,
      required: [true, 'Each item needs a unit cost'],
      min: [0, 'Item cost cannot be negative'],
    },
  },
  { _id: true }
);

// REQUIREMENT [Core Req 1 - Database and Data Modeling]: collection 5 of 5 (PurchaseOrder). RELATIONSHIPS: supplier -> Supplier, items[].product -> Product.
// Embedded sub-documents (items) have their own validation (min quantity 1, cost >= 0).
const purchaseOrderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: [true, 'Supplier is required'],
    },
    items: {
      type: [itemSchema],
      validate: {
        // REQUIREMENT [Core Req 1 - Database and Data Modeling]: custom validator - an order must have at least one item.
        validator: (items) => items.length > 0,
        message: 'A purchase order needs at least one item',
      },
    },
    // draft -> ordered -> received, or cancelled before it is received
    status: {
      type: String,
      enum: { values: STATUSES, message: 'Unknown status' },
      default: 'draft',
    },
    orderedAt: { type: Date, default: null },
    expectedDate: { type: Date, default: null },
    receivedAt: { type: Date, default: null },
    note: { type: String, trim: true, maxlength: [200, 'Note must be at most 200 characters'], default: '' },
  },
  // REQUIREMENT [Core Req 1 - Database and Data Modeling]: timestamps (virtuals are also included in the JSON output).
  { timestamps: true, toJSON: { virtuals: true } }
);

// REQUIREMENT [Data Processing and Business Logic]: totals - totalCost is a virtual field, computed from the items and never stored.
// Derived value: never stored, always computed from the items.
purchaseOrderSchema.virtual('totalCost').get(function () {
  return this.items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
});

purchaseOrderSchema.statics.STATUSES = STATUSES;

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
