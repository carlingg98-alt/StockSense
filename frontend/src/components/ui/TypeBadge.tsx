import type { OrderStatus, TransactionType } from '../../api/types';
import { getStockStatus, STOCK_LABEL } from '../../lib/stock';
import { Badge, type Tone } from './Badge';

const TYPE: Record<TransactionType, { label: string; tone: Tone }> = {
  sale: { label: 'Sale', tone: 'accent' },
  restock: { label: 'Restock', tone: 'ok' },
  adjustment: { label: 'Write-off', tone: 'low' },
};

export function TypeBadge({ type }: { type: TransactionType }) {
  return <Badge tone={TYPE[type].tone}>{TYPE[type].label}</Badge>;
}

export function StockBadge({ quantity, reorderLevel }: { quantity: number; reorderLevel: number }) {
  const status = getStockStatus(quantity, reorderLevel);
  return <Badge tone={status}>{STOCK_LABEL[status]}</Badge>;
}

const ORDER: Record<OrderStatus, { label: string; tone: Tone }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  ordered: { label: 'Ordered', tone: 'tag' },
  received: { label: 'Received', tone: 'ok' },
  cancelled: { label: 'Cancelled', tone: 'out' },
};

export function OrderBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={ORDER[status].tone}>{ORDER[status].label}</Badge>;
}
