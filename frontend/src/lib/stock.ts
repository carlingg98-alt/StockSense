// REQUIREMENT [Core Req 3 - Frontend Application]: derived values are computed during render by these functions and are never stored in state.
// Small pure functions that derive values from a product.
// They are called during render, so nothing here is ever stored in state.

export type StockStatus = 'out' | 'low' | 'ok';

// REQUIREMENT [Data Processing and Business Logic]: low-stock flag in the UI (quantity 0 = out, quantity <= reorder level = low).
export function getStockStatus(quantity: number, reorderLevel: number): StockStatus {
  if (quantity === 0) return 'out';
  if (quantity <= reorderLevel) return 'low';
  return 'ok';
}

export const STOCK_LABEL: Record<StockStatus, string> = {
  out: 'Out of stock',
  low: 'Low stock',
  ok: 'In stock',
};

const DAY_MS = 24 * 60 * 60 * 1000;

// Whole days from today until the date. Negative when it has passed.
export function daysUntil(dateValue: string) {
  const target = new Date(dateValue);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / DAY_MS);
}

export type ExpiryState = 'none' | 'expired' | 'expiring' | 'fresh';

// REQUIREMENT [Data Processing and Business Logic]: date logic in the UI - expired / expiring (30 days) / fresh label.
export function getExpiry(expiryDate: string | null): { state: ExpiryState; label: string } {
  if (!expiryDate) return { state: 'none', label: 'No expiry' };
  const days = daysUntil(expiryDate);
  if (days < 0) return { state: 'expired', label: `Expired ${Math.abs(days)}d ago` };
  if (days === 0) return { state: 'expiring', label: 'Expires today' };
  if (days <= 30) return { state: 'expiring', label: `Expires in ${days}d` };
  return { state: 'fresh', label: `Good for ${days}d` };
}

// Profit per unit as a percentage of the selling price
// REQUIREMENT [Data Processing and Business Logic]: profit margin per unit = (price - cost) / price.
export function marginPercent(unitCost: number, unitPrice: number) {
  if (!unitPrice || unitPrice <= 0) return 0;
  return ((unitPrice - unitCost) / unitPrice) * 100;
}
