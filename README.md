# StockSense

Inventory and demand forecasting system for small retailers.
Final project for **CTADWEBL, Advanced Web Programming** (NU Clark, A.Y. 2026-2027).

> Know what to reorder, and when, before the shelf runs empty.

## Group members

| Member | GitHub | Contributions |
| --- | --- | --- |
| Team Member 1 | @yowFreskow | Product catalog, inventory logic, and backend business rules |
| Team Member 2 | @carlingg98-alt | Sales workflow, purchase orders, and reporting features |
| Team Member 3 | @montemayormico1018-del | Frontend interfaces, routing, UI polish, and documentation |

## Teacher requirement checklist

This project satisfies the required course structure and business logic for a final web application project:

- [x] Full-stack web application using React + TypeScript frontend and Node.js/Express API
- [x] Database layer using MongoDB + Mongoose with related collections
- [x] CRUD management for categories, suppliers, products and transactions
- [x] Business logic for stock movement, reordering and demand forecasting
- [x] Purchase order workflow with status changes and cost updates
- [x] Reporting and analytics screens for inventory, sales and expiry monitoring
- [x] Clean route structure and separate frontend/backend responsibilities
- [x] Comments and requirement markers included throughout the codebase for maintainability and project review

## Concept

Small stores restock by memory. They run out of fast items, overbuy slow ones, and notice expiring stock too late.
StockSense records every sale, delivery and write-off in a stock ledger, then uses that history to answer three questions:
what is running low, how fast is each product selling, and how much should be ordered from each supplier.

### Project overview

StockSense is a full-stack inventory management and forecasting system designed for retail operations. Instead of manually tracking stock levels in spreadsheets, the system centralizes product information, sales, supplier orders, and stock adjustments in one dashboard. It helps managers understand which products are running low, which products sell faster, which items are near expiry, and how much should be reordered to avoid both stockouts and excess inventory.

The project focuses on meaningful business logic: it validates stock movement, calculates reorder recommendations, projects expected demand, computes sales trends, and surfaces inventory risks in a usable web interface.

### What data it processes

The app does more than store and display records. It computes:

| Logic | Rule |
| --- | --- |
| Running balance | stock on hand = restocks − sales − write-offs. A sale or write-off larger than the stock on hand is rejected. |
| Low-stock flag | A product is low when quantity ≤ reorder level, and out when quantity = 0. |
| Demand forecast | Moving average: units sold in the last N days ÷ N (N = 7, 14 or 30). |
| Days of stock left | quantity ÷ average daily demand, with the date the shelf will be empty. |
| Reorder suggestion | average daily demand × (supplier lead time + 14 days) − quantity, and never less than what gets the product back above its reorder level. |
| Expiry | Days until expiry, expired flag, and the cost value at risk. |
| Status transitions | Purchase orders move draft → ordered → received, or to cancelled before they are received. Receiving creates restock transactions and updates unit costs. |
| Totals and ranking | Revenue, profit, margin, inventory value, best sellers, slow movers and revenue share per category. |
| Search | Products filtered by text, category, supplier, stock status and price range, then sorted. |

## Screenshots

The project includes a working UI for the main inventory workflows. These screenshots are intended to help during review and final presentation.

| Landing page | Dashboard |
| --- | --- |
| ![Landing](docs/screenshots/landing.png) | ![Dashboard](docs/screenshots/dashboard.png) |

| Products | Forecast and reorder |
| --- | --- |
| ![Products](docs/screenshots/products.png) | ![Forecast](docs/screenshots/forecast.png) |

| Sales reports | Products at 375px |
| --- | --- |
| ![Reports](docs/screenshots/reports.png) | ![Mobile](docs/screenshots/mobile-products.png) |

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19 (Vite) with TypeScript, Tailwind CSS v4 (theme in `frontend/src/index.css`), React Router, React Hook Form + Zod, axios |
| Backend | Node.js, Express 5, Mongoose |
| Database | MongoDB Atlas |

## Project structure

```
frontend/                  React app
  src/
    api/client.ts           the single axios instance + error helpers
    api/types.ts            TypeScript types for API responses
    hooks/                  useFetch, useDebounce, useToast (custom hooks)
    schemas/                Zod schemas (one file per form)
    lib/                    pure helpers: formatting, stock status, expiry
    context/ToastContext    success / error toasts
    components/ui/          Button, Card, Field, Modal, StockGauge, states...
    components/layout/      sidebar layout and logo
    pages/                  one file per route
backend/                   Express API
  server.js                 connects to MongoDB, starts listening
  app.js                    configuration and route mounting only
  config/db.js              mongoose.connect (Atlas, or a local dev database when no URI is set)
  models/                   Category, Supplier, Product, Transaction, PurchaseOrder
  routes/                   one express.Router() per resource
  services/                 stock rules and forecast arithmetic
  middleware/               logger, validateObjectId, notFound, errorHandler
  seed/                     sample data (seedDatabase.js) and the npm run seed command
```

## Setup

You need Node.js 20 or newer.

### Quick start (one terminal)

From the project folder (the one that contains `frontend` and `backend`):

```bash
npm install      # installs the root, backend and frontend packages
npm start        # runs the API and the web app together
```

Then open the address Vite prints (normally `http://localhost:5173`).

- **No database setup is needed to try it.** If `backend/.env` has no `MONGO_URI`, the API starts a local development MongoDB stored in `backend/.data`. The first run downloads MongoDB once, so wait for the line `StockSense API running`.
- **An empty database is filled with the sample store automatically** on startup.

### Using MongoDB Atlas (required for submission)

1. Copy `backend/.env.example` to `backend/.env`.
2. Replace `MONGO_URI` with your Atlas connection string.
3. In Atlas, open Network Access and allow your IP address.
4. Run `npm start` again. The console should say `MongoDB connected`.

Environment variables (`backend/.env`):

| Variable | Example | Purpose |
| --- | --- | --- |
| `PORT` | `5000` | Port the API listens on |
| `MONGO_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/stocksense` | MongoDB connection string |
| `CLIENT_URL` | `http://localhost:5173` | Extra origin allowed by CORS (any `localhost` port is always allowed) |

Optional `frontend/.env`: `VITE_API_URL=http://localhost:5000/api` (this is already the default).

### Other commands

| Command | Where | What it does |
| --- | --- | --- |
| `npm run seed` | project folder | Deletes all data and reloads the sample store |
| `npm run dev` | `backend` | Runs only the API |
| `npm run dev` | `frontend` | Runs only the web app |
| `npm run check` | project folder | Validates the frontend build without launching the app |

### Presentation-friendly demo flow

During the final presentation, a clean way to demonstrate the project is:

1. Open the Dashboard and explain the high-level inventory picture.
2. Show a few products and explain low-stock and reorder logic.
3. Open the Forecast page to demonstrate the demand calculation and reorder suggestions.
4. Show Purchase Orders and explain the status transitions.
5. Show Reports or Transactions to demonstrate sales revenue, profit and inventory analysis.

This flow clearly demonstrates that the system is not only storing records, but also processing business information into operational decisions.

## Database

Five related collections, all with timestamps.

| Collection | Key fields and rules | Relations |
| --- | --- | --- |
| `categories` | `name` (required, unique, 2-40 chars), `description` (max 200) | has many products |
| `suppliers` | `name` (required, unique), `contactPerson` (required), `phone` (required, pattern), `email` (pattern), `leadTimeDays` (0-90, default 3), `isActive` (default true) | has many products and purchase orders |
| `products` | `name` (required), `sku` (required, unique, uppercase, pattern), `unit` (enum), `unitCost` (min 0), `unitPrice` (min 0, must be ≥ cost), `quantity` (integer, min 0, default 0), `reorderLevel` (min 0, default 10), `expiryDate` | `category` → categories, `supplier` → suppliers |
| `transactions` | `type` (enum: sale, restock, adjustment), `quantity` (integer, min 1), `unitPrice`, `unitCost`, `totalAmount`, `profit`, `reason` (enum, required for adjustments), `note` (max 200), `date` (not in the future) | `product` → products, `purchaseOrder` → purchaseorders |
| `purchaseorders` | `orderNumber` (unique), `items[]` (product, quantity min 1, unitCost min 0; at least one), `status` (enum: draft, ordered, received, cancelled; default draft), `orderedAt`, `expectedDate`, `receivedAt`, virtual `totalCost` | `supplier` → suppliers, `items.product` → products |

## API documentation

Base URL: `http://localhost:5000/api`. Errors always look like `{ "message": "..." }`; validation errors add `"errors": { "field": "message" }`.
Status codes used: 200, 201, 400, 404, 500.

### Products

| Method | Path | Purpose | Sample request | Sample response |
| --- | --- | --- | --- | --- |
| GET | `/products` | List all products | | `200 [ { "_id": "...", "name": "Coca-Cola 1.5L", "sku": "BEV-COKE-15", "quantity": 14, "reorderLevel": 24, ... } ]` |
| GET | `/products/:id` | Get one product | | `200 { "_id": "...", "name": "Coca-Cola 1.5L", "category": { "name": "Beverages" }, ... }` or `404 { "message": "Product not found" }` |
| POST | `/products` | Create a product; opening stock becomes the first restock | `{ "name": "Mogu Mogu Lychee", "sku": "BEV-MOGU-LY", "category": "<id>", "supplier": "<id>", "unit": "bottle", "unitCost": 28, "unitPrice": 38, "reorderLevel": 12, "openingQuantity": 24 }` | `201 { "_id": "...", "quantity": 24, ... }` |
| PUT | `/products/:id` | Update a product (quantity cannot be set here) | `{ "unitPrice": 78 }` | `200 { ... "unitPrice": 78 }` or `400 { "message": "Selling price cannot be lower than the unit cost" }` |
| DELETE | `/products/:id` | Delete; blocked when the product has movements or orders | | `200 { "message": "Product deleted" }` |
| GET | `/products/search` | **Processing.** Multi-criteria search, filter and sort | `?q=lucky&status=low&minPrice=10&sort=quantity&order=asc` | `200 [ { "name": "Lucky Me Pancit Canton Original", ... } ]` |
| GET | `/products/low-stock` | **Processing.** Products at or below reorder level, emptiest first | | `200 [ { "name": "Milo Sachet 24g", "quantity": 0, "shortBy": 40 } ]` |
| GET | `/products/expiring` | **Processing.** Expired or expiring within N days, with value at risk | `?days=30` | `200 [ { "name": "Chippy BBQ 110g", "daysUntilExpiry": 12, "isExpired": false, "valueAtRisk": 899 } ]` |
| GET | `/products/reorder-suggestions` | **Processing.** Products to reorder now with suggested quantities | `?window=14` | `200 [ { "product": { ... }, "forecast": { "avgDailyDemand": 6.29, "daysOfStockLeft": 2.2, "suggestedOrderQty": 87, "urgency": "soon" } } ]` |
| GET | `/products/:id/forecast` | **Processing.** Moving-average demand forecast for one product | `?window=7` | `200 { "windowDays": 7, "unitsSold": 55, "avgDailyDemand": 7.86, "forecastNext7Days": 55, "daysOfStockLeft": 1.8, "suggestedOrderQty": 112, "daily": [ ... ] }` |
| GET | `/products/:id/transactions` | **Processing.** Ledger of one product with running balance | | `200 [ { "type": "sale", "quantity": 4, "balanceAfter": 14 } ]` |

### Transactions

| Method | Path | Purpose | Sample request | Sample response |
| --- | --- | --- | --- | --- |
| GET | `/transactions` | List movements, filtered | `?type=sale&from=2026-10-01&to=2026-10-07` | `200 [ { "type": "sale", "quantity": 2, "totalAmount": 150, "product": { "name": "Coca-Cola 1.5L" } } ]` |
| GET | `/transactions/:id` | Get one movement | | `200 { ... }` or `404 { "message": "Transaction not found" }` |
| POST | `/transactions` | **Processing.** Record a sale, restock or write-off; updates stock and computes amounts | `{ "product": "<id>", "type": "adjustment", "quantity": 2, "reason": "expired" }` | `201 { "transaction": { ... }, "stockAfter": 12, "isLowStock": true }` |
| POST | `/transactions/sale` | **Processing.** Record a sale: deduct stock, compute total and profit | `{ "product": "<id>", "quantity": 2 }` | `201 { "transaction": { "totalAmount": 150, "profit": 26 }, "stockAfter": 12, "isLowStock": true }` or `400 { "message": "Not enough stock: only 12 bottle of Coca-Cola 1.5L left" }` |
| PUT | `/transactions/:id` | Correct the note or date only | `{ "note": "Walk-in customer" }` | `200 { ... "note": "Walk-in customer" }` |
| DELETE | `/transactions/:id` | **Processing.** Void: remove the row and reverse its effect on stock | | `200 { "message": "Transaction voided and stock restored", "stockAfter": 14 }` |

### Purchase orders

| Method | Path | Purpose | Sample request | Sample response |
| --- | --- | --- | --- | --- |
| GET | `/purchase-orders` | List orders | `?status=ordered` | `200 [ { "orderNumber": "PO-0001", "status": "ordered", "totalCost": 2964 } ]` |
| GET | `/purchase-orders/:id` | Get one order | | `200 { "orderNumber": "PO-0001", "items": [ ... ] }` |
| POST | `/purchase-orders` | Create a draft; every product must belong to the supplier | `{ "supplier": "<id>", "items": [ { "product": "<id>", "quantity": 60, "unitCost": 62 } ] }` | `201 { "orderNumber": "PO-0005", "status": "draft", "totalCost": 3720 }` |
| PUT | `/purchase-orders/:id` | Edit a draft | same body as POST | `200 { ... }` or `400 { "message": "Only draft orders can be edited. This order is ordered." }` |
| PATCH | `/purchase-orders/:id/status` | **Processing.** Rule-based status change; receiving restocks every item | `{ "status": "received" }` | `200 { "status": "received", "receivedAt": "..." }` or `400 { "message": "A draft order can only become: ordered or cancelled" }` |
| DELETE | `/purchase-orders/:id` | Delete a draft or cancelled order | | `200 { "message": "Purchase order deleted" }` |

### Suppliers and categories

| Method | Path | Purpose | Sample request | Sample response |
| --- | --- | --- | --- | --- |
| GET | `/suppliers` | List suppliers with product counts | | `200 [ { "name": "Clark Dry Goods Trading", "leadTimeDays": 4, "productCount": 9 } ]` |
| GET | `/suppliers/:id` | Get one supplier | | `200 { ... }` |
| POST | `/suppliers` | Create a supplier | `{ "name": "Dau Frozen Goods", "contactPerson": "Mia Santos", "phone": "0917 555 0199", "leadTimeDays": 2 }` | `201 { "_id": "...", "isActive": true }` |
| PUT | `/suppliers/:id` | Update a supplier | `{ "isActive": false }` | `200 { ... }` |
| DELETE | `/suppliers/:id` | Delete; blocked while products or orders use it | | `400 { "message": "Cannot delete: 6 product(s) still use this supplier" }` |
| GET | `/categories` | List categories with product counts | | `200 [ { "name": "Beverages", "productCount": 6 } ]` |
| GET | `/categories/:id` | Get one category | | `200 { ... }` |
| POST | `/categories` | Create a category | `{ "name": "Frozen Goods" }` | `201 { "_id": "...", "name": "Frozen Goods" }` |
| PUT | `/categories/:id` | Update a category | `{ "description": "Ice cream and frozen meat" }` | `200 { ... }` |
| DELETE | `/categories/:id` | Delete; blocked while products are in it | | `200 { "message": "Category deleted" }` |

### Analytics

| Method | Path | Purpose | Sample request | Sample response |
| --- | --- | --- | --- | --- |
| GET | `/analytics/summary` | **Processing.** Inventory valuation, revenue, profit, margin, change vs previous period, best sellers, slow movers, category shares | `?days=30` | `200 { "inventory": { "costValue": 32614, "lowStockCount": 5 }, "sales": { "revenue": 117547, "profit": 24910.5, "marginPercent": 21.2 }, "bestSellers": [ ... ], "slowMovers": [ ... ], "categoryBreakdown": [ ... ] }` |
| GET | `/analytics/sales-trend` | **Processing.** Revenue, profit and units per day, zero-filled | `?days=14` | `200 [ { "date": "2026-10-07", "revenue": 3634, "profit": 742, "units": 131, "saleCount": 23 } ]` |
| GET | `/health` | Check that the API is up | | `200 { "status": "ok" }` |

36 resource endpoints in total, 12 of which do processing beyond plain CRUD.

## How a sale travels through the system

1. **React.** `RecordSale.tsx` renders a form with React Hook Form. `saleSchema` (Zod) validates it in the browser and shows per-field errors.
2. **axios.** On submit the page calls `api.post('/transactions/sale', values)` through the single instance in `api/client.ts`.
3. **Express.** `app.js` runs `cors`, `express.json()` and the request logger, then hands the request to `routes/transactions.js`.
4. **Business rule.** The route calls `recordTransaction()` in `services/stockService.js`, which runs `findOneAndUpdate({ _id, quantity: { $gte: qty } }, { $inc: { quantity: -qty } })`. MongoDB only applies it when enough stock exists, so stock cannot go negative.
5. **MongoDB.** A `Transaction` document is saved with the price, cost, total and profit at that moment.
6. **Response.** The API answers `201` with the transaction and the new stock level. If anything failed, `middleware/errorHandler.js` turns it into `{ "message": "..." }` with a 400, 404 or 500.
7. **React again.** The page shows a success toast, resets the form and calls `reload()` from the `useFetch` hook so the lists refresh.

## Pages

Landing, Dashboard, Products, Product details, Add / edit product, Record a sale, Restock or write off, Stock ledger,
Forecast and reorder, Purchase orders, Purchase order details, New / edit purchase order, Sales reports, Suppliers, Categories, and a 404 page.

## Features

- Stock ledger where every change to quantity is a transaction, with a running balance per product
- Overselling blocked at the database level
- Low-stock and expiry alerts on the dashboard
- Moving-average demand forecast with selectable 7, 14 or 30 day window
- Reorder suggestions grouped by supplier, turned into a draft purchase order in one click
- Purchase order workflow with enforced status rules; receiving an order restocks the shelf
- Sales reports: revenue, profit, margin, trend, best sellers, slow movers, category shares
- Loading, error and empty states on every screen; confirmation before every delete; toasts after create, update and delete
- Responsive from 375px to desktop

## Demo checklist for the defense

- **Validation error:** on Add a product, set the selling price below the unit cost, or reuse the SKU `BEV-COKE-15`. On Record a sale, sell more than the stock on hand.
- **Not-found case:** open `/app/products/000000000000000000000000` (404 from the API) or `/app/products/abc` (400, invalid ID), or any unknown URL for the 404 page.
- **Rule-based status change:** open the draft order PO-0002, mark it as ordered, receive it, then check the product's ledger.
- **Delete with confirmation:** create a product with opening stock 0, then delete it. A product with history is refused with an explanation.

## Known limitations

- No login. Anyone who opens the app can change the data.
- A sale covers one product at a time; there is no multi-item cart or receipt.
- The forecast is a simple moving average. It does not model seasons, paydays or promotions.
- One expiry date per product, not per delivery batch.
- Receiving a purchase order is all-or-nothing; partial deliveries are not supported.
- Dates are grouped by the server's local time zone.
- The ledger page shows the latest 200 movements for the chosen filters; there is no pagination.
