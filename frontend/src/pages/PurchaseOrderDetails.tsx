import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, getErrorMessage } from '../api/client';
import type { OrderStatus, PurchaseOrder } from '../api/types';
import { Button, buttonClass } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { Icon } from '../components/ui/Icon';
import { ConfirmDialog } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { ErrorState, LoadingState } from '../components/ui/States';
import { OrderBadge } from '../components/ui/TypeBadge';
import { useFetch } from '../hooks/useFetch';
import { useToast } from '../hooks/useToast';
import { formatDate, peso } from '../lib/format';

type Action = 'ordered' | 'received' | 'cancelled' | 'delete';

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'draft', label: 'Draft' },
  { status: 'ordered', label: 'Ordered' },
  { status: 'received', label: 'Received' },
];

// REQUIREMENT [Core Req 3 - Frontend Application]: page 10 - purchase order details and status workflow (Data Processing and Business Logic: draft -> ordered -> received / cancelled).
export default function PurchaseOrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const order = useFetch<PurchaseOrder>(`/purchase-orders/${id}`);

  // REQUIREMENT [Core Req 3 - Frontend Application]: the pending action (order / receive / cancel / delete) waits here until the user confirms in the dialog.
  const [action, setAction] = useState<Action | null>(null);
  const [busy, setBusy] = useState(false);

  async function runAction() {
    if (!action || !order.data) return;
    setBusy(true);
    try {
      if (action === 'delete') {
        await api.delete(`/purchase-orders/${id}`);
        showToast(`${order.data.orderNumber} deleted`);
        navigate('/app/orders');
        return;
      }
      // REQUIREMENT [Core Req 2 - REST API]: PATCH /purchase-orders/:id/status - the rule-based status change. The API explains which rule was broken (400).
      await api.patch(`/purchase-orders/${id}/status`, { status: action });
      showToast(
        action === 'ordered'
          ? `${order.data.orderNumber} marked as ordered`
          : action === 'received'
            ? `${order.data.orderNumber} received. Stock has been added.`
            : `${order.data.orderNumber} cancelled`
      );
      order.reload();
    } catch (error) {
      // The API explains which rule was broken, for example an order that is already received
      showToast(getErrorMessage(error), 'error');
    } finally {
      setBusy(false);
      setAction(null);
    }
  }

  if (order.loading && !order.data) {
    return (
      <Card>
        <LoadingState rows={5} label="Loading purchase order" />
      </Card>
    );
  }
  if (order.error || !order.data) {
    return (
      <>
        <PageHeader title="Purchase order" backTo={{ to: '/app/orders', label: 'All orders' }} />
        <Card>
          <ErrorState message={order.error ?? 'Purchase order not found'} onRetry={order.reload} />
        </Card>
      </>
    );
  }

  const po = order.data;
  const currentStep = STEPS.findIndex((step) => step.status === po.status); // -1 when cancelled
  const totalUnits = po.items.reduce((sum, item) => sum + item.quantity, 0);

  const CONFIRM: Record<Action, { title: string; message: string; label: string; tone: 'primary' | 'danger' }> = {
    ordered: {
      title: `Mark ${po.orderNumber} as ordered?`,
      message: `This records that the order was sent to ${po.supplier?.name ?? 'the supplier'}. The expected delivery date is set from their ${po.supplier?.leadTimeDays ?? 0}-day lead time, and the order can no longer be edited.`,
      label: 'Mark as ordered',
      tone: 'primary',
    },
    received: {
      title: `Receive ${po.orderNumber}?`,
      message: `All ${totalUnits} units are added to stock as restocks and the unit costs are updated. This cannot be undone.`,
      label: 'Receive into stock',
      tone: 'primary',
    },
    cancelled: {
      title: `Cancel ${po.orderNumber}?`,
      message: 'The order is kept for your records but can never be received.',
      label: 'Cancel order',
      tone: 'danger',
    },
    delete: {
      title: `Delete ${po.orderNumber}?`,
      message: 'The order is removed for good.',
      label: 'Delete order',
      tone: 'danger',
    },
  };

  return (
    <>
      <PageHeader
        title={po.orderNumber}
        description={po.supplier ? `${po.supplier.name}, ${po.supplier.contactPerson}, ${po.supplier.phone}` : 'Deleted supplier'}
        backTo={{ to: '/app/orders', label: 'All orders' }}
        actions={
          <>
            {po.status === 'draft' && (
              <>
                <Link to={`/app/orders/${po._id}/edit`} className={buttonClass('secondary')}>
                  Edit
                </Link>
                <Button variant="highlight" onClick={() => setAction('ordered')}>
                  Mark as ordered
                </Button>
              </>
            )}
            {po.status === 'ordered' && (
              <Button variant="highlight" onClick={() => setAction('received')}>
                Receive into stock
              </Button>
            )}
            {(po.status === 'draft' || po.status === 'ordered') && (
              <Button variant="secondary" onClick={() => setAction('cancelled')}>
                Cancel order
              </Button>
            )}
            {(po.status === 'draft' || po.status === 'cancelled') && (
              <Button variant="danger" onClick={() => setAction('delete')}>
                Delete
              </Button>
            )}
          </>
        }
      />

      {/* The three stages are a real sequence, so they are numbered */}
      <Card className="mb-4 p-5">
        {po.status === 'cancelled' ? (
          <div className="flex items-center gap-3">
            <OrderBadge status="cancelled" />
            <p className="text-sm text-ink-soft">This order was cancelled and will not be received.</p>
          </div>
        ) : (
          <ol className="grid grid-cols-3 gap-2">
            {/* REQUIREMENT [Core Req 3 - Frontend Application]: map() with a stable key (step.status). The progress bar is derived from the order status during render. */}
            {STEPS.map((step, index) => {
              const done = index < currentStep;
              const current = index === currentStep;
              const date = step.status === 'draft' ? po.createdAt : step.status === 'ordered' ? po.orderedAt : po.receivedAt;
              return (
                <li key={step.status} className={`border-t-4 pt-3 ${done || current ? 'border-tag' : 'border-line'}`}>
                  <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                    <span
                      className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold ${
                        done ? 'bg-ink text-white' : current ? 'bg-tag text-ink' : 'bg-canvas text-ink-faint'
                      }`}
                    >
                      {done ? <Icon name="check" className="size-3.5" /> : index + 1}
                    </span>
                    <span className={`font-semibold ${done || current ? '' : 'text-ink-faint'}`}>{step.label}</span>
                  </div>
                  <p className="mt-1 text-sm text-ink-soft">
                    {date
                      ? formatDate(date)
                      : step.status === 'received' && po.expectedDate
                        ? `Expected ${formatDate(po.expectedDate)}`
                        : 'Not yet'}
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </Card>

      <Card>
        <CardHeader title="Items" hint={po.note || undefined} />
        <ul className="divide-y divide-line border-t border-line">
          {/* REQUIREMENT [Core Req 3 - Frontend Application]: map() with a stable key (item._id). */}
          {po.items.map((item) => (
            <li key={item._id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-5 py-3 sm:grid-cols-[minmax(0,1fr)_7rem_7rem_7rem]">
              <div className="min-w-0">
                {item.product ? (
                  <Link to={`/app/products/${item.product._id}`} className="block truncate font-semibold hover:underline">
                    {item.product.name}
                  </Link>
                ) : (
                  <p className="font-semibold">Deleted product</p>
                )}
                <p className="tabular text-sm text-ink-soft">
                  {item.product ? `${item.product.quantity} ${item.product.unit} on the shelf now` : ''}
                </p>
              </div>
              <span className="tabular text-right font-semibold sm:font-normal">
                {item.quantity} {item.product?.unit}
              </span>
              <span className="tabular hidden text-right text-ink-soft sm:block">{peso(item.unitCost)} each</span>
              <span className="tabular col-span-2 text-right font-semibold sm:col-span-1">{peso(item.quantity * item.unitCost)}</span>
            </li>
          ))}
        </ul>
        <div className="flex items-baseline justify-between gap-4 border-t border-line px-5 py-4">
          <span className="text-ink-soft">{totalUnits} units in total</span>
          <span className="tabular font-display text-2xl font-semibold">{peso(po.totalCost)}</span>
        </div>
      </Card>

      {action && (
        <ConfirmDialog
          title={CONFIRM[action].title}
          message={CONFIRM[action].message}
          confirmLabel={CONFIRM[action].label}
          tone={CONFIRM[action].tone}
          busy={busy}
          onConfirm={runAction}
          onCancel={() => setAction(null)}
        />
      )}
    </>
  );
}
