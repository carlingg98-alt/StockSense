// REQUIREMENT [Data Processing and Business Logic]: availability logic - the only place where product.quantity changes.
// Rule: stock on hand = restocks - sales - write-offs, and it can never go below zero.
// The only place where product.quantity is changed.
// Rule: stock on hand = restocks - sales - write-offs, and it can never go below zero.
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
const HttpError = require('../utils/HttpError');

// REQUIREMENT [Data Processing and Business Logic]: validates input (400 / 404), updates the stock and writes the ledger row.
async function recordTransaction({ productId, type, quantity, reason, note, date, unitCost, purchaseOrder }) {
  if (!Transaction.TYPES.includes(type)) {
    throw new HttpError(400, 'Type must be sale, restock or adjustment');
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new HttpError(400, 'Quantity must be a whole number of at least 1');
  }
  if (type === 'adjustment' && !Transaction.REASONS.includes(reason)) {
    throw new HttpError(400, 'A reason is required when writing off stock');
  }

  const product = await Product.findById(productId);
  if (!product) throw new HttpError(404, 'Product not found');

  // Sales and write-offs take stock out, restocks put stock in.
  const change = type === 'restock' ? quantity : -quantity;

  // REQUIREMENT [Data Processing and Business Logic]: double-booking / overselling prevention - the update only applies if quantity >= needed, so two sales at the same time cannot make stock negative.
  // Atomic update. For stock going out, the filter `quantity >= needed` means MongoDB
  // only applies the change if there is enough stock, even if two sales arrive together.
  const filter = { _id: product._id };
  if (change < 0) filter.quantity = { $gte: quantity };

  const update = { $inc: { quantity: change } };
  // A restock may come with a new purchase cost
  // REQUIREMENT [Data Processing and Business Logic]: a restock can update the unit cost, but the cost can never be higher than the selling price.
  const newCost = type === 'restock' && typeof unitCost === 'number' ? unitCost : null;
  if (newCost !== null) {
    if (newCost < 0) throw new HttpError(400, 'Unit cost cannot be negative');
    if (newCost > product.unitPrice) {
      throw new HttpError(400, `Unit cost cannot be higher than the selling price (${product.unitPrice})`);
    }
    update.$set = { unitCost: newCost };
  }

  const updated = await Product.findOneAndUpdate(filter, update, { new: true });
  if (!updated) {
    throw new HttpError(
      400,
      `Not enough stock: only ${product.quantity} ${product.unit} of ${product.name} left`
    );
  }

  const cost = newCost !== null ? newCost : product.unitCost;
  // REQUIREMENT [Data Processing and Business Logic]: computed values - revenue = qty x price, profit = qty x (price - cost); for restock / write-off the amount is the cost.
  const amounts =
    type === 'sale'
      ? {
          unitPrice: product.unitPrice,
          unitCost: cost,
          totalAmount: quantity * product.unitPrice, // revenue
          profit: quantity * (product.unitPrice - cost),
        }
      : { unitPrice: 0, unitCost: cost, totalAmount: quantity * cost, profit: 0 }; // cost of stock in / lost

  try {
    const transaction = await Transaction.create({
      product: product._id,
      type,
      quantity,
      reason: type === 'adjustment' ? reason : undefined,
      note,
      date: date || undefined,
      purchaseOrder: purchaseOrder || null,
      ...amounts,
    });
    return { transaction, product: updated };
  } catch (error) {
    // REQUIREMENT [Data Processing and Business Logic]: rollback - if the ledger row cannot be saved, the stock change is undone so both stay in sync.
    // The ledger row failed validation, so undo the stock change to keep both in sync.
    await Product.updateOne({ _id: product._id }, { $inc: { quantity: -change } });
    throw error;
  }
}

// Void a transaction: remove the ledger row and reverse its effect on stock.
// REQUIREMENT [Data Processing and Business Logic]: reverses a transaction. A restock cannot be voided if that stock was already sold (400), and PO restocks cannot be voided.
async function voidTransaction(transaction) {
  if (transaction.purchaseOrder) {
    throw new HttpError(400, 'This restock came from a purchase order and cannot be voided');
  }

  // Reversing a sale/write-off adds stock back; reversing a restock removes it.
  const change = transaction.type === 'restock' ? -transaction.quantity : transaction.quantity;

  const filter = { _id: transaction.product };
  if (change < 0) filter.quantity = { $gte: transaction.quantity };

  const product = await Product.findOneAndUpdate(filter, { $inc: { quantity: change } }, { new: true });
  if (!product) {
    const exists = await Product.exists({ _id: transaction.product });
    if (exists) {
      throw new HttpError(400, 'Cannot void this restock: some of that stock has already been sold');
    }
    // The product itself is gone, so there is no stock to fix. Just remove the row.
  }

  await transaction.deleteOne();
  return product;
}

module.exports = { recordTransaction, voidTransaction };
