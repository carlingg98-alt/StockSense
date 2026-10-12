// Fills the database with realistic sample data for a neighbourhood mini-grocery.
// Used by `npm run seed` and by server.js when the database is empty.
// It DELETES existing data first.
// REQUIREMENT [Core Req 1 - Database and Data Modeling]: seeded sample data (categories, suppliers, products, sales history and purchase orders) so the demo looks complete.
const Category = require('../models/Category');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
const PurchaseOrder = require('../models/PurchaseOrder');

const DAY_MS = 24 * 60 * 60 * 1000;
const HISTORY_DAYS = 60;

// Small seeded random generator so every seed run produces the same shop.
let seedValue = 20261012;
function random() {
  seedValue = (seedValue * 1664525 + 1013904223) % 4294967296;
  return seedValue / 4294967296;
}

function daysFromNow(days) {
  return new Date(Date.now() + days * DAY_MS);
}

const categories = [
  { name: 'Beverages', description: 'Soft drinks, juice, coffee and bottled water' },
  { name: 'Snacks', description: 'Chips, biscuits and candy' },
  { name: 'Canned Goods', description: 'Sardines, corned beef and other canned food' },
  { name: 'Instant Noodles', description: 'Pancit canton, cup noodles and mami' },
  { name: 'Rice & Grains', description: 'Rice, sugar and other staples sold by weight' },
  { name: 'Household', description: 'Detergent, dish soap and cleaning supplies' },
  { name: 'Personal Care', description: 'Shampoo, soap and toothpaste' },
];

const suppliers = [
  { name: 'Pampanga Beverage Distributors', contactPerson: 'Ramon Dizon', phone: '0917 555 0142', email: 'orders@pampangabev.example', leadTimeDays: 2 },
  { name: 'Clark Dry Goods Trading', contactPerson: 'Liza Manalo', phone: '0918 555 0177', email: 'liza@clarkdrygoods.example', leadTimeDays: 4 },
  { name: 'Angeles Snack Wholesale', contactPerson: 'Jun Pangilinan', phone: '0922 555 0108', email: '', leadTimeDays: 3 },
  { name: 'Central Luzon Rice Mill', contactPerson: 'Tess Lacson', phone: '(045) 555 0190', email: 'sales@clricemill.example', leadTimeDays: 5 },
  { name: 'Mabalacat Home Essentials', contactPerson: 'Arnel Canlas', phone: '0935 555 0123', email: 'arnel@mhe.example', leadTimeDays: 7 },
  { name: 'Porac Farm Supply', contactPerson: 'Nena Gozun', phone: '0945 555 0166', email: '', leadTimeDays: 6, isActive: false },
];

// qty = stock on hand today, rate = average units sold per day, expiresIn = days until expiry
const products = [
  { name: 'Coca-Cola 1.5L', sku: 'BEV-COKE-15', cat: 'Beverages', sup: 0, unit: 'bottle', cost: 62, price: 75, qty: 14, reorder: 24, rate: 6, expiresIn: 160 },
  { name: 'Royal Tru-Orange 1L', sku: 'BEV-ROYAL-1L', cat: 'Beverages', sup: 0, unit: 'bottle', cost: 44, price: 55, qty: 38, reorder: 18, rate: 3, expiresIn: 150 },
  { name: 'C2 Green Tea Apple 500ml', sku: 'BEV-C2-APL', cat: 'Beverages', sup: 0, unit: 'bottle', cost: 24, price: 32, qty: 9, reorder: 20, rate: 5, expiresIn: 21 },
  { name: 'Nature\'s Spring Water 500ml', sku: 'BEV-WATER-500', cat: 'Beverages', sup: 0, unit: 'bottle', cost: 9, price: 15, qty: 96, reorder: 36, rate: 9, expiresIn: 300 },
  { name: 'Kopiko Black 3-in-1', sku: 'BEV-KOPIKO-BLK', cat: 'Beverages', sup: 1, unit: 'sachet', cost: 7.5, price: 10, qty: 140, reorder: 60, rate: 12, expiresIn: 240 },
  { name: 'Milo Sachet 24g', sku: 'BEV-MILO-24', cat: 'Beverages', sup: 1, unit: 'sachet', cost: 8.5, price: 12, qty: 0, reorder: 40, rate: 7, expiresIn: 200 },
  { name: 'Piattos Cheese 85g', sku: 'SNK-PIATTOS-CHZ', cat: 'Snacks', sup: 2, unit: 'pack', cost: 33, price: 42, qty: 26, reorder: 15, rate: 3, expiresIn: 90 },
  { name: 'Nova Country Cheddar 78g', sku: 'SNK-NOVA-CHD', cat: 'Snacks', sup: 2, unit: 'pack', cost: 31, price: 40, qty: 7, reorder: 15, rate: 2, expiresIn: 75 },
  { name: 'SkyFlakes Crackers 10s', sku: 'SNK-SKYFLAKES', cat: 'Snacks', sup: 2, unit: 'pack', cost: 52, price: 65, qty: 22, reorder: 10, rate: 2, expiresIn: 120 },
  { name: 'Chippy BBQ 110g', sku: 'SNK-CHIPPY-BBQ', cat: 'Snacks', sup: 2, unit: 'pack', cost: 29, price: 38, qty: 31, reorder: 12, rate: 2, expiresIn: 12 },
  { name: 'Hany Milk Chocolate 24s', sku: 'SNK-HANY-24', cat: 'Snacks', sup: 2, unit: 'box', cost: 58, price: 72, qty: 18, reorder: 6, rate: 0.15, expiresIn: 180 },
  { name: 'Ligo Sardines Red 155g', sku: 'CAN-LIGO-RED', cat: 'Canned Goods', sup: 1, unit: 'can', cost: 21, price: 27, qty: 64, reorder: 30, rate: 5, expiresIn: 500 },
  { name: 'Argentina Corned Beef 150g', sku: 'CAN-ARG-CB150', cat: 'Canned Goods', sup: 1, unit: 'can', cost: 36, price: 45, qty: 28, reorder: 24, rate: 4, expiresIn: 420 },
  { name: 'Century Tuna Flakes 155g', sku: 'CAN-CENT-TUNA', cat: 'Canned Goods', sup: 1, unit: 'can', cost: 34, price: 43, qty: 41, reorder: 20, rate: 3, expiresIn: 460 },
  { name: 'Spam Lite 340g', sku: 'CAN-SPAM-LITE', cat: 'Canned Goods', sup: 1, unit: 'can', cost: 205, price: 245, qty: 12, reorder: 4, rate: 0.1, expiresIn: 600 },
  { name: 'Lucky Me Pancit Canton Original', sku: 'NDL-LM-PC-ORIG', cat: 'Instant Noodles', sup: 1, unit: 'pack', cost: 13.5, price: 18, qty: 52, reorder: 48, rate: 11, expiresIn: 150 },
  { name: 'Lucky Me Pancit Canton Chilimansi', sku: 'NDL-LM-PC-CHILI', cat: 'Instant Noodles', sup: 1, unit: 'pack', cost: 13.5, price: 18, qty: 88, reorder: 36, rate: 6, expiresIn: 150 },
  { name: 'Nissin Cup Noodles Seafood', sku: 'NDL-NISSIN-SEA', cat: 'Instant Noodles', sup: 1, unit: 'pc', cost: 27, price: 35, qty: 6, reorder: 12, rate: 2, expiresIn: -3 },
  { name: 'Sinandomeng Rice', sku: 'RIC-SINANDOMENG', cat: 'Rice & Grains', sup: 3, unit: 'kg', cost: 46, price: 54, qty: 85, reorder: 50, rate: 9, expiresIn: null, received: 80 },
  { name: 'Jasmine Rice', sku: 'RIC-JASMINE', cat: 'Rice & Grains', sup: 3, unit: 'kg', cost: 55, price: 64, qty: 120, reorder: 40, rate: 4, expiresIn: null, received: 50 },
  { name: 'Brown Sugar', sku: 'RIC-SUGAR-BRN', cat: 'Rice & Grains', sup: 3, unit: 'kg', cost: 68, price: 80, qty: 19, reorder: 15, rate: 2, expiresIn: null },
  { name: 'Surf Powder Cherry Blossom 65g', sku: 'HSE-SURF-65', cat: 'Household', sup: 4, unit: 'sachet', cost: 6.5, price: 9, qty: 110, reorder: 60, rate: 8, expiresIn: null },
  { name: 'Joy Dishwashing Liquid 40ml', sku: 'HSE-JOY-40', cat: 'Household', sup: 4, unit: 'sachet', cost: 7, price: 10, qty: 34, reorder: 40, rate: 5, expiresIn: null },
  { name: 'Zonrox Bleach 500ml', sku: 'HSE-ZONROX-500', cat: 'Household', sup: 4, unit: 'bottle', cost: 27, price: 35, qty: 16, reorder: 6, rate: 0.3, expiresIn: null },
  { name: 'Safeguard White 60g', sku: 'PRS-SAFEGUARD-60', cat: 'Personal Care', sup: 4, unit: 'pc', cost: 22, price: 29, qty: 45, reorder: 20, rate: 3, expiresIn: 700 },
  { name: 'Palmolive Shampoo 15ml', sku: 'PRS-PALMOLIVE-15', cat: 'Personal Care', sup: 4, unit: 'sachet', cost: 5.5, price: 8, qty: 150, reorder: 72, rate: 10, expiresIn: 400 },
  { name: 'Colgate Toothpaste 22g', sku: 'PRS-COLGATE-22', cat: 'Personal Care', sup: 4, unit: 'sachet', cost: 9, price: 13, qty: 58, reorder: 30, rate: 4, expiresIn: 380 },
];

async function seedDatabase() {
  seedValue = 20261012; // restart the random sequence so every run gives the same shop
  await Promise.all([
    Category.deleteMany({}),
    Supplier.deleteMany({}),
    Product.deleteMany({}),
    Transaction.deleteMany({}),
    PurchaseOrder.deleteMany({}),
  ]);

  const categoryDocs = await Category.insertMany(categories);
  const supplierDocs = await Supplier.insertMany(suppliers);
  const categoryId = (name) => categoryDocs.find((c) => c.name === name)._id;

  const transactions = [];
  const productDocs = [];

  for (const spec of products) {
    const product = await Product.create({
      name: spec.name,
      sku: spec.sku,
      category: categoryId(spec.cat),
      supplier: supplierDocs[spec.sup]._id,
      unit: spec.unit,
      unitCost: spec.cost,
      unitPrice: spec.price,
      quantity: spec.qty,
      reorderLevel: spec.reorder,
      expiryDate: spec.expiresIn === null ? null : daysFromNow(spec.expiresIn),
    });
    productDocs.push(product);

    // Daily sales for the last 60 days, a bit busier on weekends
    let totalSold = 0;
    for (let day = HISTORY_DAYS; day >= 0; day--) {
      const date = new Date(Date.now() - day * DAY_MS);
      // Today's sale must not be in the future: keep it between midnight and now
      if (day === 0) {
        const now = new Date();
        const minutesToday = now.getHours() * 60 + now.getMinutes();
        if (minutesToday < 30) continue; // just after midnight: nothing sold yet today
        date.setHours(0, Math.floor(random() * minutesToday), 0, 0);
      } else {
        date.setHours(8 + Math.floor(random() * 11), Math.floor(random() * 60), 0, 0);
      }

      const weekend = date.getDay() === 0 || date.getDay() === 6 ? 1.3 : 1;
      const expected = spec.rate * weekend * (0.5 + random());
      // Slow items sell on some days only
      let units = expected >= 1 ? Math.round(expected) : random() < expected ? 1 : 0;
      // The sold-out product stopped selling 2 days ago
      if (spec.qty === 0 && day < 2) units = 0;
      if (units === 0) continue;

      totalSold += units;
      transactions.push({
        product: product._id,
        type: 'sale',
        quantity: units,
        unitPrice: spec.price,
        unitCost: spec.cost,
        totalAmount: units * spec.price,
        profit: units * (spec.price - spec.cost),
        date,
      });
    }

    // A few write-offs so the ledger shows all three movement types
    let writtenOff = 0;
    if (spec.sku === 'SNK-NOVA-CHD' || spec.sku === 'BEV-ROYAL-1L' || spec.sku === 'NDL-NISSIN-SEA') {
      writtenOff = 2;
      transactions.push({
        product: product._id,
        type: 'adjustment',
        quantity: writtenOff,
        reason: spec.sku === 'BEV-ROYAL-1L' ? 'damaged' : 'expired',
        unitCost: spec.cost,
        totalAmount: writtenOff * spec.cost,
        note: spec.sku === 'BEV-ROYAL-1L' ? 'Dropped during delivery' : 'Found past best-before date',
        date: new Date(Date.now() - 9 * DAY_MS),
      });
    }

    // Opening stock is worked backwards so the ledger adds up exactly:
    // opening = stock today + everything sold + everything written off - later deliveries
    const received = spec.received || 0; // delivered 8 days ago through PO-0004 (see below)
    const opening = spec.qty + totalSold + writtenOff - received;
    transactions.push({
      product: product._id,
      type: 'restock',
      quantity: opening,
      unitCost: spec.cost,
      totalAmount: opening * spec.cost,
      note: 'Opening stock',
      date: new Date(Date.now() - (HISTORY_DAYS + 1) * DAY_MS),
    });
  }

  await Transaction.insertMany(transactions);

  // Purchase orders in different stages
  const bySku = (sku) => productDocs.find((p) => p.sku === sku);
  const item = (sku, quantity) => ({ product: bySku(sku)._id, quantity, unitCost: bySku(sku).unitCost });

  // PO-0004 was already received: its items are in the ledger as restocks linked to the order
  const receivedAt = new Date(Date.now() - 8 * DAY_MS);
  const receivedOrder = await PurchaseOrder.create({
    orderNumber: 'PO-0004',
    supplier: supplierDocs[3]._id,
    items: products.filter((p) => p.received).map((p) => item(p.sku, p.received)),
    status: 'received',
    orderedAt: new Date(receivedAt.getTime() - 5 * DAY_MS),
    expectedDate: receivedAt,
    receivedAt,
    note: 'Monthly rice delivery',
  });
  await Transaction.insertMany(
    receivedOrder.items.map((line) => ({
      product: line.product,
      type: 'restock',
      quantity: line.quantity,
      unitCost: line.unitCost,
      totalAmount: line.quantity * line.unitCost,
      note: 'Received PO-0004',
      purchaseOrder: receivedOrder._id,
      date: receivedAt,
    }))
  );

  await PurchaseOrder.create([
    {
      orderNumber: 'PO-0001',
      supplier: supplierDocs[1]._id,
      items: [item('BEV-MILO-24', 120), item('NDL-LM-PC-ORIG', 144)],
      status: 'ordered',
      orderedAt: new Date(Date.now() - 2 * DAY_MS),
      expectedDate: daysFromNow(2),
      note: 'Milo ran out on Saturday',
    },
    {
      orderNumber: 'PO-0002',
      supplier: supplierDocs[0]._id,
      items: [item('BEV-COKE-15', 60), item('BEV-C2-APL', 48)],
      status: 'draft',
      note: 'Check with Ramon for the promo price',
    },
    {
      orderNumber: 'PO-0003',
      supplier: supplierDocs[4]._id,
      items: [item('HSE-JOY-40', 96)],
      status: 'cancelled',
      note: 'Supplier was out of stock',
    },
  ]);

  return (
    `Seeded ${categoryDocs.length} categories, ${supplierDocs.length} suppliers, ` +
    `${productDocs.length} products, ${transactions.length} transactions and 4 purchase orders.`
  );
}

module.exports = seedDatabase;
