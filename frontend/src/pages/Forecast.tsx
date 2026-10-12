import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, getErrorMessage } from '../api/client';
import type { PurchaseOrder, ReorderSuggestion, Urgency } from '../api/types';
import { Badge, type Tone } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { inputClass } from '../components/ui/Field';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States';
import { StockGauge } from '../components/ui/StockGauge';
import { useFetch } from '../hooks/useFetch';
import { useToast } from '../hooks/useToast';
import { formatNumber, peso, plural } from '../lib/format';

const URGENCY: Record<Urgency, { label: string; tone: Tone }> = {
  out: { label: 'Sold out', tone: 'out' },
  urgent: { label: 'Runs out before delivery', tone: 'out' },
  soon: { label: 'Below reorder level', tone: 'low' },
  ok: { label: 'Covered', tone: 'ok' },
};

interface SupplierGroup {
  supplierId: string;
  supplierName: string;
  leadTimeDays: number;
  isActive: boolean;
  rows: ReorderSuggestion[];
}

// REQUIREMENT [Core Req 3 - Frontend Application]: page 8 - forecast and reorder suggestions from GET /products/reorder-suggestions (Data Processing and Business Logic: moving average, days of stock left, suggested quantity).
export default function Forecast() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [windowDays, setWindowDays] = useState(14);
  const [creatingFor, setCreatingFor] = useState<string | null>(null);

  // REQUIREMENT [Core Req 3 - Frontend Application]: the window (7 / 14 / 30 days) is sent to the API and the list re-fetches when it changes.
  const suggestions = useFetch<ReorderSuggestion[]>('/products/reorder-suggestions', { window: windowDays });

  // REQUIREMENT [Core Req 3 - Frontend Application]: derived value - suggestions grouped by supplier, computed during render and not stored in state.
  // Group the flat list by supplier. Derived on every render, never stored.
  const groups: SupplierGroup[] = [];
  for (const row of suggestions.data ?? []) {
    const supplierId = row.product.supplier?._id ?? 'none';
    let group = groups.find((item) => item.supplierId === supplierId);
    if (!group) {
      group = {
        supplierId,
        supplierName: row.product.supplier?.name ?? 'No supplier',
        leadTimeDays: row.product.supplier?.leadTimeDays ?? 0,
        isActive: row.product.supplier?.isActive ?? false,
        rows: [],
      };
      groups.push(group);
    }
    group.rows.push(row);
  }
  // REQUIREMENT [Data Processing and Business Logic]: totals - estimated cost of all suggested orders.
  const grandTotal = (suggestions.data ?? []).reduce((sum, row) => sum + row.forecast.estimatedOrderCost, 0);

  // REQUIREMENT [Data Processing and Business Logic]: matching - turns the suggestions of one supplier into a draft purchase order (POST /purchase-orders).
  // Turn one supplier's suggestions into a draft purchase order
  async function createDraft(group: SupplierGroup) {
    setCreatingFor(group.supplierId);
    try {
      const response = await api.post<PurchaseOrder>('/purchase-orders', {
        supplier: group.supplierId,
        note: `From reorder suggestions (${windowDays}-day average)`,
        items: group.rows.map((row) => ({
          product: row.product._id,
          quantity: row.forecast.suggestedOrderQty,
          unitCost: row.product.unitCost,
        })),
      });
      showToast(`Draft ${response.data.orderNumber} created for ${group.supplierName}`);
      navigate(`/app/orders/${response.data._id}`);
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
      setCreatingFor(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Forecast and reorder"
        description="Products that will run out, how fast they sell, and how much to order from each supplier."
        actions={
          <select
            aria-label="Sales window used for the average"
            value={windowDays}
            onChange={(event) => setWindowDays(Number(event.target.value))}
            className={`${inputClass} w-auto`}
          >
            <option value={7}>Average of last 7 days</option>
            <option value={14}>Average of last 14 days</option>
            <option value={30}>Average of last 30 days</option>
          </select>
        }
      />

      <details className="mb-4 rounded-2xl border border-line bg-surface px-5 py-4">
        <summary className="font-semibold">How these numbers are worked out</summary>
        <div className="mt-3 grid gap-x-8 gap-y-2 text-sm text-ink-soft sm:grid-cols-2">
          <p>
            <span className="font-medium text-ink">Per day</span> = units sold in the last {windowDays} days ÷ {windowDays}
          </p>
          <p>
            <span className="font-medium text-ink">Days left</span> = stock on hand ÷ per day
          </p>
          <p>
            <span className="font-medium text-ink">Suggested order</span> = per day × (supplier lead time + 14 days) − stock on hand
          </p>
          <p>
            <span className="font-medium text-ink">Listed when</span> stock is at or below the reorder level, or will run out before a delivery could arrive
          </p>
        </div>
      </details>

      {suggestions.loading && !suggestions.data ? (
        <Card>
          <LoadingState rows={6} label="Working out suggestions" />
        </Card>
      ) : suggestions.error ? (
        <Card>
          <ErrorState message={suggestions.error} onRetry={suggestions.reload} />
        </Card>
      ) : groups.length === 0 ? (
        <Card>
          <EmptyState icon="check" title="Nothing to reorder" hint="Every product is above its reorder level and will outlast its delivery time." />
        </Card>
      ) : (
        <div className={`space-y-4 ${suggestions.loading ? 'opacity-60' : ''}`}>
          <p className="tabular text-sm text-ink-soft">
            {plural((suggestions.data ?? []).length, 'product')} to reorder from {plural(groups.length, 'supplier')}, about {peso(grandTotal)} in total
          </p>

          {/* REQUIREMENT [Core Req 3 - Frontend Application]: map() with a stable key (supplierId). */}
          {groups.map((group) => {
            const groupTotal = group.rows.reduce((sum, row) => sum + row.forecast.estimatedOrderCost, 0);
            return (
              <Card key={group.supplierId}>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold">{group.supplierName}</h2>
                    <p className="text-sm text-ink-soft">
                      Delivers in {plural(group.leadTimeDays, 'day')}, order total {peso(groupTotal)}
                      {!group.isActive && ', marked inactive'}
                    </p>
                  </div>
                  <Button
                    variant="highlight"
                    size="sm"
                    disabled={!group.isActive || creatingFor !== null}
                    onClick={() => createDraft(group)}
                  >
                    {creatingFor === group.supplierId ? 'Creating…' : 'Create draft order'}
                  </Button>
                </div>
                <ul className="divide-y divide-line">
                  {group.rows.map(({ product, forecast }) => (
                    <li
                      key={product._id}
                      className="grid items-center gap-x-6 gap-y-3 px-5 py-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1.1fr)_minmax(0,1fr)_8rem]"
                    >
                      <div className="min-w-0">
                        <Link to={`/app/products/${product._id}`} className="font-semibold hover:underline">
                          {product.name}
                        </Link>
                        <div className="mt-1">
                          <Badge tone={URGENCY[forecast.urgency].tone}>{URGENCY[forecast.urgency].label}</Badge>
                        </div>
                      </div>
                      <StockGauge quantity={product.quantity} reorderLevel={product.reorderLevel} unit={product.unit} />
                      <div className="tabular text-sm text-ink-soft">
                        <p>
                          Sells {formatNumber(forecast.avgDailyDemand)} a day ({forecast.unitsSold} ÷ {forecast.windowDays})
                        </p>
                        <p>
                          {forecast.daysOfStockLeft === null
                            ? 'No recent sales'
                            : forecast.daysOfStockLeft === 0
                              ? 'Nothing left to sell'
                              : `Lasts ${formatNumber(forecast.daysOfStockLeft)} more days`}
                        </p>
                      </div>
                      <div className="tabular sm:text-right">
                        <p className="font-semibold">
                          Order {forecast.suggestedOrderQty} {product.unit}
                        </p>
                        <p className="text-sm text-ink-soft">{peso(forecast.estimatedOrderCost)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
