import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { OrderStatus, PurchaseOrder } from '../api/types';
import { Badge } from '../components/ui/Badge';
import { buttonClass } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Icon } from '../components/ui/Icon';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States';
import { OrderBadge } from '../components/ui/TypeBadge';
import { useFetch } from '../hooks/useFetch';
import { formatDate, peso, plural } from '../lib/format';
import { daysUntil } from '../lib/stock';

const TABS: { value: OrderStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'ordered', label: 'Ordered' },
  { value: 'received', label: 'Received' },
  { value: 'cancelled', label: 'Cancelled' },
];

// One line that says where the order stands, derived from its dates
function describe(order: PurchaseOrder) {
  if (order.status === 'draft') return 'Not sent to the supplier yet';
  if (order.status === 'cancelled') return 'Cancelled';
  if (order.status === 'received') return `Received ${formatDate(order.receivedAt)}`;
  return `Expected ${formatDate(order.expectedDate)}`;
}

// REQUIREMENT [Core Req 3 - Frontend Application]: page 9 - purchase order list with status tabs (filter sent to GET /purchase-orders?status=).
export default function PurchaseOrders() {
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const orders = useFetch<PurchaseOrder[]>('/purchase-orders', { status: status || undefined });
  const list = orders.data ?? [];

  return (
    <>
      <PageHeader
        title="Purchase orders"
        description="Orders move from draft to ordered to received. Receiving an order adds its items to stock."
        actions={
          <Link to="/app/orders/new" className={buttonClass('primary')}>
            <Icon name="plus" className="size-4" />
            New order
          </Link>
        }
      />

      <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-surface p-1 ring-1 ring-line sm:w-fit" role="tablist" aria-label="Filter by status">
        {TABS.map((tab) => (
          <button
            key={tab.label}
            type="button"
            role="tab"
            aria-selected={status === tab.value}
            onClick={() => setStatus(tab.value)}
            className={`shrink-0 rounded-lg px-3.5 py-2 text-sm font-semibold ${
              status === tab.value ? 'bg-ink text-white' : 'text-ink-soft hover:bg-canvas'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card>
        {orders.loading && !orders.data ? (
          <LoadingState rows={4} label="Loading purchase orders" />
        ) : orders.error ? (
          <ErrorState message={orders.error} onRetry={orders.reload} />
        ) : list.length === 0 ? (
          <EmptyState
            icon="clipboard"
            title={status ? `No ${status} orders` : 'No purchase orders yet'}
            hint={status ? 'Pick another status to see other orders.' : 'Create one here, or let the forecast page draft one for you.'}
            action={
              <Link to="/app/forecast" className={buttonClass('secondary')}>
                See reorder suggestions
              </Link>
            }
          />
        ) : (
          <ul className={`divide-y divide-line ${orders.loading ? 'opacity-60' : ''}`}>
            {/* REQUIREMENT [Core Req 3 - Frontend Application]: map() with a stable key (order._id). */}
            {list.map((order) => {
              // Late = ordered, and the expected date has passed
              const lateBy = order.status === 'ordered' && order.expectedDate ? -daysUntil(order.expectedDate) : 0;
              return (
                <li key={order._id}>
                  <Link
                    to={`/app/orders/${order._id}`}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-5 py-4 hover:bg-canvas/60 md:grid-cols-[6rem_minmax(0,1.5fr)_minmax(0,1.2fr)_7rem_6.5rem]"
                  >
                    <span className="tabular font-semibold">{order.orderNumber}</span>
                    <span className="justify-self-end md:order-last">
                      <OrderBadge status={order.status} />
                    </span>
                    <div className="col-span-2 min-w-0 md:col-span-1">
                      <p className="truncate">{order.supplier?.name ?? 'Deleted supplier'}</p>
                      <p className="text-sm text-ink-soft">{plural(order.items.length, 'item')}</p>
                    </div>
                    <span className="text-sm text-ink-soft">
                      {describe(order)} {lateBy > 0 && <Badge tone="out">{plural(lateBy, 'day')} late</Badge>}
                    </span>
                    <span className="tabular text-right font-semibold">{peso(order.totalCost)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
