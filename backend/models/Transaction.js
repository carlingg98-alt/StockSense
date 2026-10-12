const mongoose = require('mongoose');

const TYPES = ['sale', 'restock', 'adjustment'];
const REASONS = ['damaged', 'expired', 'lost', 'other'];

// One row in the stock ledger. Every change to a product's quantity creates one.
// REQUIREMENT [Core Req 1 - Database and Data Modeling]: collection 4 of 5 (Transaction) - the stock ledger. RELATIONSHIP: product -> Product (ObjectId ref).
// Also references PurchaseOrder when a restock comes from a received order.
const transactionSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product is required'],
    },
    // sale = stock out, restock = stock in, adjustment = stock written off
    // REQUIREMENT [Core Req 1 - Database and Data Modeling]: enum rule (sale / restock / adjustment).
    type: {
      type: String,
      required: [true, 'Transaction type is required'],
      enum: { values: TYPES, message: 'Type must be sale, restock or adjustment' },
    },
    // REQUIREMENT [Core Req 1 - Database and Data Modeling]: min 1 and whole-number rule.
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      validate: { validator: Number.isInteger, message: 'Quantity must be a whole number' },
    },
    // Prices are copied from the product at the time of the transaction,
    // so later price changes do not rewrite sales history.
    unitPrice: { type: Number, min: 0, default: 0 },
    unitCost: { type: Number, min: 0, default: 0 },
    // REQUIREMENT [Data Processing and Business Logic]: computed totals - totalAmount (revenue or cost) and profit are calculated in services/stockService.js, not typed in by the user.
    totalAmount: { type: Number, min: 0, default: 0 },
    profit: { type: Number, default: 0 },
    // REQUIREMENT [Core Req 1 - Database and Data Modeling]: conditional required rule - a reason is required only for write-offs (adjustment).
    reason: {
      type: String,
      enum: { values: REASONS, message: 'Reason must be damaged, expired, lost or other' },
      required: [
        function () {
          return this.type === 'adjustment';
        },
        'A reason is required when writing off stock',
      ],
    },
    note: { type: String, trim: true, maxlength: [200, 'Note must be at most 200 characters'], default: '' },
    // REQUIREMENT [Data Processing and Business Logic]: date logic - a transaction cannot be dated in the future.
    date: {
      type: Date,
      default: Date.now,
      validate: {
        validator: (value) => value.getTime() <= Date.now() + 60 * 1000,
        message: 'Transaction date cannot be in the future',
      },
    },
    // Set when a restock was created by receiving a purchase order
    purchaseOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder', default: null },
  },
  // REQUIREMENT [Core Req 1 - Database and Data Modeling]: timestamps.
  { timestamps: true }
);

transactionSchema.statics.TYPES = TYPES;
transactionSchema.statics.REASONS = REASONS;

module.exports = mongoose.model('Transaction', transactionSchema);
