const express = require('express');
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
const { daysAgo, dayKey, daysUntil, clampInt } = require('../services/dateUtils');
const { round } = require('../services/forecastService');

const router = express.Router();

// REQUIREMENT [Data Processing and Business Logic] (Processing endpoint 9): statistics and summaries - inventory value, revenue, profit, margin, average sale, best sellers, slow movers and category share.
// Compares the period with the previous one (revenueChangePercent).
// GET /api/analytics/summary?days=30
// Inventory valuation, sales totals, best sellers, slow movers and category breakdown.
router.get('/summary', async (req, res) => {
  const days = clampInt(req.query.days, 30, 1, 365);
  const periodStart = daysAgo(days - 1);
  const previousStart = daysAgo(days * 2 - 1);

  const [products, transactions] = await Promise.all([
    Product.find().populate('category', 'name').lean(),
    // Two periods at once: the current one and the one before it, for comparison
    Transaction.find({ date: { $gte: previousStart } }).lean(),
  ]);

  // REQUIREMENT [Data Processing and Business Logic]: totals - inventory cost value, retail value and potential profit; counts of low, out and expiring stock.
  // ----- Inventory right now -----
  const inventory = {
    productCount: products.length,
    totalUnits: 0,
    costValue: 0, // what the stock cost us
    retailValue: 0, // what it would sell for
    lowStockCount: 0,
    outOfStockCount: 0,
    expiringCount: 0, // expires within 30 days
    expiredCount: 0,
  };
  for (const p of products) {
    inventory.totalUnits += p.quantity;
    inventory.costValue += p.quantity * p.unitCost;
    inventory.retailValue += p.quantity * p.unitPrice;
    if (p.quantity === 0) inventory.outOfStockCount += 1;
    else if (p.quantity <= p.reorderLevel) inventory.lowStockCount += 1;
    if (p.expiryDate && p.quantity > 0) {
      const left = daysUntil(p.expiryDate);
      if (left < 0) inventory.expiredCount += 1;
      else if (left <= 30) inventory.expiringCount += 1;
    }
  }
  inventory.costValue = round(inventory.costValue, 2);
  inventory.retailValue = round(inventory.retailValue, 2);
  inventory.potentialProfit = round(inventory.retailValue - inventory.costValue, 2);

  // ----- Sales in the period -----
  const sales = { revenue: 0, profit: 0, unitsSold: 0, saleCount: 0 };
  let previousRevenue = 0;
  let restockSpend = 0;
  let writeOffLoss = 0;
  const perProduct = new Map(); // productId -> { units, revenue, profit }

  for (const t of transactions) {
    const inPeriod = t.date >= periodStart;

    if (t.type === 'sale') {
      if (!inPeriod) {
        previousRevenue += t.totalAmount;
        continue;
      }
      sales.revenue += t.totalAmount;
      sales.profit += t.profit;
      sales.unitsSold += t.quantity;
      sales.saleCount += 1;

      const id = String(t.product);
      const row = perProduct.get(id) || { units: 0, revenue: 0, profit: 0 };
      row.units += t.quantity;
      row.revenue += t.totalAmount;
      row.profit += t.profit;
      perProduct.set(id, row);
    } else if (inPeriod && t.type === 'restock') {
      restockSpend += t.totalAmount;
    } else if (inPeriod && t.type === 'adjustment') {
      writeOffLoss += t.totalAmount;
    }
  }

  sales.revenue = round(sales.revenue, 2);
  sales.profit = round(sales.profit, 2);
  // REQUIREMENT [Data Processing and Business Logic]: edge cases - every division is guarded against zero (no NaN or Infinity in the JSON).
  // Guard every division against zero
  sales.marginPercent = sales.revenue > 0 ? round((sales.profit / sales.revenue) * 100, 1) : 0;
  sales.averageSale = sales.saleCount > 0 ? round(sales.revenue / sales.saleCount, 2) : 0;
  sales.previousRevenue = round(previousRevenue, 2);
  sales.revenueChangePercent =
    previousRevenue > 0 ? round(((sales.revenue - previousRevenue) / previousRevenue) * 100, 1) : null;
  sales.restockSpend = round(restockSpend, 2);
  sales.writeOffLoss = round(writeOffLoss, 2);

  // REQUIREMENT [Data Processing and Business Logic]: scoring / ranking - best sellers (most units) and slow movers (least units, ties go to the most money tied up).
  // ----- Ranking -----
  const ranked = products.map((p) => {
    const row = perProduct.get(String(p._id)) || { units: 0, revenue: 0, profit: 0 };
    return {
      _id: p._id,
      name: p.name,
      sku: p.sku,
      unit: p.unit,
      quantity: p.quantity,
      unitsSold: row.units,
      revenue: round(row.revenue, 2),
      profit: round(row.profit, 2),
      stockValue: round(p.quantity * p.unitCost, 2),
    };
  });

  const bestSellers = ranked
    .filter((r) => r.unitsSold > 0)
    .sort((a, b) => b.unitsSold - a.unitsSold)
    .slice(0, 5);

  // Slow movers: still on the shelf but selling the least. Ties go to the most money tied up.
  const slowMovers = ranked
    .filter((r) => r.quantity > 0)
    .sort((a, b) => a.unitsSold - b.unitsSold || b.stockValue - a.stockValue)
    .slice(0, 5);

  // REQUIREMENT [Data Processing and Business Logic]: distribution - revenue share per category (percent of total revenue).
  // ----- Per category -----
  const categories = new Map();
  for (const p of products) {
    const name = p.category ? p.category.name : 'Uncategorised';
    const row = categories.get(name) || { category: name, productCount: 0, stockValue: 0, revenue: 0 };
    const sold = perProduct.get(String(p._id));
    row.productCount += 1;
    row.stockValue += p.quantity * p.unitCost;
    row.revenue += sold ? sold.revenue : 0;
    categories.set(name, row);
  }
  const categoryBreakdown = [...categories.values()]
    .map((row) => ({
      ...row,
      stockValue: round(row.stockValue, 2),
      revenue: round(row.revenue, 2),
      revenueShare: sales.revenue > 0 ? round((row.revenue / sales.revenue) * 100, 1) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  res.status(200).json({ days, inventory, sales, bestSellers, slowMovers, categoryBreakdown });
});

// REQUIREMENT [Data Processing and Business Logic] (Processing endpoint 10): revenue, profit and units per day, grouped by date with zero-filled days.
// GET /api/analytics/sales-trend?days=14 - revenue, profit and units per day (zero-filled)
router.get('/sales-trend', async (req, res) => {
  const days = clampInt(req.query.days, 14, 1, 90);
  const since = daysAgo(days - 1);

  const sales = await Transaction.find({ type: 'sale', date: { $gte: since } })
    .select('date quantity totalAmount profit')
    .lean();

  // Start with one empty bucket per day so days without sales still appear as zero
  const buckets = new Map();
  for (let i = days - 1; i >= 0; i--) {
    const key = dayKey(daysAgo(i));
    buckets.set(key, { date: key, revenue: 0, profit: 0, units: 0, saleCount: 0 });
  }
  for (const sale of sales) {
    const bucket = buckets.get(dayKey(sale.date));
    if (!bucket) continue;
    bucket.revenue += sale.totalAmount;
    bucket.profit += sale.profit;
    bucket.units += sale.quantity;
    bucket.saleCount += 1;
  }

  const trend = [...buckets.values()].map((b) => ({
    ...b,
    revenue: round(b.revenue, 2),
    profit: round(b.profit, 2),
  }));

  res.status(200).json(trend);
});

module.exports = router;
