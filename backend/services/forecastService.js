// REQUIREMENT [Data Processing and Business Logic]: core computation - demand forecast and reorder logic (Processing endpoints 4 and 5).
// Demand forecasting and reorder logic.
// Everything here is plain arithmetic on purpose, so it is easy to verify by hand.
const Transaction = require('../models/Transaction');
const { DAY_MS, daysAgo, dayKey } = require('./dateUtils');

// How many extra days of stock we want on the shelf after a delivery arrives.
// REQUIREMENT [Data Processing and Business Logic]: reorder rule - target stock covers the supplier lead time + 14 extra selling days.
const COVER_DAYS = 14;

// Load sales for the last `windowDays` days (today included) and group them:
// Map(productId -> Map(dayKey -> units sold that day))
// REQUIREMENT [Data Processing and Business Logic]: groups sales per product per day for the chosen window (7, 14 or 30 days).
async function loadSalesByProduct(windowDays, productId) {
  const since = daysAgo(windowDays - 1);
  const filter = { type: 'sale', date: { $gte: since } };
  if (productId) filter.product = productId;

  const sales = await Transaction.find(filter).select('product quantity date').lean();

  const byProduct = new Map();
  for (const sale of sales) {
    const id = String(sale.product);
    if (!byProduct.has(id)) byProduct.set(id, new Map());
    const byDay = byProduct.get(id);
    const key = dayKey(sale.date);
    byDay.set(key, (byDay.get(key) || 0) + sale.quantity);
  }
  return byProduct;
}

// Build the forecast for one product.
// `unitsByDay` is the Map(dayKey -> units) for that product (may be undefined = no sales).
function buildForecast(product, unitsByDay, windowDays, leadTimeDays) {
  // 1. Daily series for the window, oldest first, with zero-filled days
  const daily = [];
  let unitsSold = 0;
  for (let i = windowDays - 1; i >= 0; i--) {
    const key = dayKey(daysAgo(i));
    const units = (unitsByDay && unitsByDay.get(key)) || 0;
    daily.push({ date: key, units });
    unitsSold += units;
  }

  // REQUIREMENT [Data Processing and Business Logic]: moving average = units sold in the window / window length.
  // 2. Moving average: units sold in the window divided by the window length
  const avgDailyDemand = unitsSold / windowDays;

  // REQUIREMENT [Data Processing and Business Logic]: days of stock left = quantity / average daily demand, and the stock-out date. null when there are no recent sales (no division by zero).
  // 3. How long the current stock lasts at that rate (null = no recent sales)
  const daysOfStockLeft = avgDailyDemand > 0 ? product.quantity / avgDailyDemand : null;
  const stockOutDate =
    daysOfStockLeft === null ? null : new Date(Date.now() + daysOfStockLeft * DAY_MS);

  // REQUIREMENT [Data Processing and Business Logic]: reorder suggestion = demand x (lead time + 14 days) - quantity, never less than what puts the product back above its reorder level.
  // 4. Suggested order: enough to cover the delivery wait plus COVER_DAYS of selling,
  //    and never less than what is needed to get back above the reorder level.
  const targetStock = Math.ceil(avgDailyDemand * (leadTimeDays + COVER_DAYS));
  const neededForDemand = Math.max(0, targetStock - product.quantity);
  const neededForLevel =
    product.quantity <= product.reorderLevel ? product.reorderLevel * 2 - product.quantity : 0;
  const suggestedOrderQty = Math.max(neededForDemand, neededForLevel);

  // REQUIREMENT [Data Processing and Business Logic]: status with rules - urgency is out / urgent / soon / ok.
  // 5. Does it need reordering now?
  const belowReorderLevel = product.quantity <= product.reorderLevel;
  const runsOutBeforeDelivery = daysOfStockLeft !== null && daysOfStockLeft <= leadTimeDays;
  const needsReorder = belowReorderLevel || runsOutBeforeDelivery;

  let urgency = 'ok';
  if (product.quantity === 0) urgency = 'out';
  else if (runsOutBeforeDelivery) urgency = 'urgent';
  else if (belowReorderLevel) urgency = 'soon';

  return {
    windowDays,
    leadTimeDays,
    coverDays: COVER_DAYS,
    unitsSold,
    avgDailyDemand: round(avgDailyDemand, 2),
    forecastNext7Days: Math.ceil(avgDailyDemand * 7),
    daysOfStockLeft: daysOfStockLeft === null ? null : round(daysOfStockLeft, 1),
    stockOutDate,
    targetStock,
    suggestedOrderQty,
    estimatedOrderCost: round(suggestedOrderQty * product.unitCost, 2),
    needsReorder,
    urgency,
    daily,
  };
}

function round(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

module.exports = { COVER_DAYS, loadSalesByProduct, buildForecast, round };
