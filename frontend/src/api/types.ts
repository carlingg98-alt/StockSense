// Shapes of the JSON the API returns.

export interface Category {
  _id: string;
  name: string;
  description: string;
  productCount?: number;
}

export interface Supplier {
  _id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  leadTimeDays: number;
  isActive: boolean;
  productCount?: number;
}

export const UNITS = ['pc', 'pack', 'bottle', 'sachet', 'can', 'box', 'kg'] as const;
export type Unit = (typeof UNITS)[number];

export interface Product {
  _id: string;
  name: string;
  sku: string;
  category: Pick<Category, '_id' | 'name'> | null;
  supplier: Pick<Supplier, '_id' | 'name' | 'leadTimeDays' | 'isActive'> | null;
  unit: Unit;
  unitCost: number;
  unitPrice: number;
  quantity: number;
  reorderLevel: number;
  expiryDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpiringProduct extends Product {
  daysUntilExpiry: number;
  isExpired: boolean;
  valueAtRisk: number;
}

export type TransactionType = 'sale' | 'restock' | 'adjustment';
export const REASONS = ['damaged', 'expired', 'lost', 'other'] as const;
export type Reason = (typeof REASONS)[number];

export interface Transaction {
  _id: string;
  product: { _id: string; name: string; sku: string; unit: Unit } | null;
  type: TransactionType;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  totalAmount: number;
  profit: number;
  reason?: Reason;
  note: string;
  date: string;
  purchaseOrder: string | null;
}

// A row of one product's ledger (product is just the id here)
export interface LedgerRow extends Omit<Transaction, 'product'> {
  product: string;
  balanceAfter: number;
}

export interface TransactionResult {
  transaction: Transaction;
  stockAfter: number;
  isLowStock: boolean;
}

export type Urgency = 'out' | 'urgent' | 'soon' | 'ok';

export interface Forecast {
  windowDays: number;
  leadTimeDays: number;
  coverDays: number;
  unitsSold: number;
  avgDailyDemand: number;
  forecastNext7Days: number;
  daysOfStockLeft: number | null;
  stockOutDate: string | null;
  targetStock: number;
  suggestedOrderQty: number;
  estimatedOrderCost: number;
  needsReorder: boolean;
  urgency: Urgency;
  daily?: { date: string; units: number }[];
}

export interface ReorderSuggestion {
  product: Product;
  forecast: Forecast;
}

export type OrderStatus = 'draft' | 'ordered' | 'received' | 'cancelled';

export interface PurchaseOrderItem {
  _id: string;
  product: { _id: string; name: string; sku: string; unit: Unit; quantity: number } | null;
  quantity: number;
  unitCost: number;
}

export interface PurchaseOrder {
  _id: string;
  orderNumber: string;
  supplier: Pick<Supplier, '_id' | 'name' | 'contactPerson' | 'phone' | 'leadTimeDays'> | null;
  items: PurchaseOrderItem[];
  status: OrderStatus;
  orderedAt: string | null;
  expectedDate: string | null;
  receivedAt: string | null;
  note: string;
  totalCost: number;
  createdAt: string;
}

export interface RankedProduct {
  _id: string;
  name: string;
  sku: string;
  unit: Unit;
  quantity: number;
  unitsSold: number;
  revenue: number;
  profit: number;
  stockValue: number;
}

export interface Summary {
  days: number;
  inventory: {
    productCount: number;
    totalUnits: number;
    costValue: number;
    retailValue: number;
    potentialProfit: number;
    lowStockCount: number;
    outOfStockCount: number;
    expiringCount: number;
    expiredCount: number;
  };
  sales: {
    revenue: number;
    profit: number;
    unitsSold: number;
    saleCount: number;
    marginPercent: number;
    averageSale: number;
    previousRevenue: number;
    revenueChangePercent: number | null;
    restockSpend: number;
    writeOffLoss: number;
  };
  bestSellers: RankedProduct[];
  slowMovers: RankedProduct[];
  categoryBreakdown: {
    category: string;
    productCount: number;
    stockValue: number;
    revenue: number;
    revenueShare: number;
  }[];
}

export interface TrendDay {
  date: string;
  revenue: number;
  profit: number;
  units: number;
  saleCount: number;
}
