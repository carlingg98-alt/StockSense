import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, getErrorMessage } from '../api/client';
import type { Forecast, LedgerRow, Product } from '../api/types';
import { BarChart } from '../components/ui/BarChart';
import { Badge } from '../components/ui/Badge';
import { Button, buttonClass } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { inputClass } from '../components/ui/Field';
import { ConfirmDialog } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States';
import { StockGauge } from '../components/ui/StockGauge';
import { StockBadge, TypeBadge } from '../components/ui/TypeBadge';
import { useFetch } from '../hooks/useFetch';
import { useToast } from '../hooks/useToast';
import { formatDate, formatDateTime, formatDayKey, formatNumber, peso } from '../lib/format';
import { getExpiry, marginPercent } from '../lib/stock';

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-sm text-ink-soft">{label}</dt>
      <dd className="tabular text-right font-medium">{value}</dd>
    </div>
  );
}

// REQUIREMENT [Core Req 3 - Frontend Application]: page 4 - product details: stock status, forecast and the stock ledger of ONE product (useParams).
export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [windowDays, setWindowDays] = useState(14);
  // REQUIREMENT [Core Req 3 - Frontend Application]: three API calls (product, forecast, ledger). Each part has its own loading and error state.
  const product = useFetch<Product>(`/products/${id}`);
  const forecast = useFetch<Forecast>(`/products/${id}/forecast`, { window: windowDays });
  const ledger = useFetch<LedgerRow[]>(`/products/${id}/transactions`);

  // REQUIREMENT [Core Req 3 - Frontend Application]: delete with a confirmation step.
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function deleteProduct() {
    if (!product.data) return;
    setDeleting(true);
    try {
      await api.delete(`/products/${product.data._id}`);
      showToast(`${product.data.name} deleted`);
      navigate('/app/products');
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
      setDeleting(false);
      setConfirming(false);
    }
  }

  // REQUIREMENT [Core Req 3 - Frontend Application]: early return for loading (and, next, for error / not found) so there is never a blank screen.
  if (product.loading && !product.data) {
    return (
      <Card>
        <LoadingState rows={5} label="Loading product" />
      </Card>
    );
  }

  // Covers both "Product not found" (404) and a malformed ID (400)
  if (product.error || !product.data) {
    return (
      <>
        <PageHeader title="Product" backTo={{ to: '/app/products', label: 'All products' }} />
        <Card>
          <ErrorState message={product.error ?? 'Product not found'} onRetry={product.reload} />
        </Card>
      </>
    );
  }

  const item = product.data;
  // Derived during render
  const expiry = getExpiry(item.expiryDate);
  const margin = marginPercent(item.unitCost, item.unitPrice);
  const stockValue = item.quantity * item.unitCost;
  const profitPerUnit = item.unitPrice - item.unitCost;
  const f = forecast.data;

  return (
    <>
      <PageHeader
        title={item.name}
        description={`${item.sku}, ${item.category?.name ?? 'no category'}`}
        backTo={{ to: '/app/products', label: 'All products' }}
        actions={
          <>
            <Link to={`/app/stock/new?product=${item._id}`} className={buttonClass('secondary')}>
              Restock
            </Link>
            <Link to={`/app/products/${item._id}/edit`} className={buttonClass('secondary')}>
              Edit
            </Link>
            <Button variant="danger" onClick={() => setConfirming(true)}>
              Delete
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">On the shelf</h2>
            <StockBadge quantity={item.quantity} reorderLevel={item.reorderLevel} />
          </div>
          <StockGauge quantity={item.quantity} reorderLevel={item.reorderLevel} unit={item.unit} />
          <dl className="mt-4 divide-y divide-line">
            <Detail label="Stock value at cost" value={peso(stockValue)} />
            <Detail label="Expiry" value={item.expiryDate ? `${formatDate(item.expiryDate)} (${expiry.label})` : 'Does not expire'} />
          </dl>
        </Card>

        <Card className="p-5">
          <h2 className="mb-2 text-lg font-semibold">Pricing</h2>
          <dl className="divide-y divide-line">
            <Detail label="Unit cost" value={peso(item.unitCost)} />
            <Detail label="Selling price" value={peso(item.unitPrice)} />
            <Detail label={`Profit per ${item.unit}`} value={`${peso(profitPerUnit)} (${formatNumber(margin)}%)`} />
          </dl>
        </Card>

        <Card className="p-5">
          <h2 className="mb-2 text-lg font-semibold">Supplier</h2>
          <dl className="divide-y divide-line">
            <Detail label="Name" value={item.supplier?.name ?? 'None'} />
            <Detail label="Delivery lead time" value={item.supplier ? `${item.supplier.leadTimeDays} days` : 'Unknown'} />
            <Detail label="Last updated" value={formatDate(item.updatedAt)} />
          </dl>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Demand forecast"
          hint="Moving average of this product's own sales"
          action={
            <select
              aria-label="Forecast window"
              value={windowDays}
              onChange={(event) => setWindowDays(Number(event.target.value))}
              className={`${inputClass} h-9 w-auto`}
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
            </select>
          }
        />
        {forecast.loading && !f ? (
          <LoadingState rows={3} label="Loading forecast" />
        ) : forecast.error || !f ? (
          <ErrorState message={forecast.error ?? 'No forecast'} onRetry={forecast.reload} />
        ) : (
          <div className="grid grid-cols-1 gap-6 px-5 pb-5 lg:grid-cols-[1.3fr_1fr]">
            <div>
              {f.unitsSold === 0 ? (
                <EmptyState icon="chart" title={`No sales in the last ${f.windowDays} days`} hint="With no recent sales there is no demand to forecast yet." />
              ) : (
                <BarChart
                  ariaLabel={`Units sold per day over the last ${f.windowDays} days`}
                  bars={(f.daily ?? []).map((day) => ({
                    key: day.date,
                    label: formatDayKey(day.date),
                    value: day.units,
                    display: `${day.units} ${item.unit}`,
                  }))}
                />
              )}
            </div>
            <div>
              <dl className="divide-y divide-line">
                <Detail label={`Sold in ${f.windowDays} days`} value={`${f.unitsSold} ${item.unit}`} />
                <Detail label="Average per day" value={`${f.unitsSold} ÷ ${f.windowDays} = ${formatNumber(f.avgDailyDemand)}`} />
                <Detail label="Expected next 7 days" value={`${f.forecastNext7Days} ${item.unit}`} />
                <Detail
                  label="Stock lasts"
                  value={
                    f.daysOfStockLeft === null
                      ? 'No recent sales'
                      : `${formatNumber(f.daysOfStockLeft)} days (until ${formatDate(f.stockOutDate)})`
                  }
                />
              </dl>
              <div className={`mt-3 rounded-xl p-4 ${f.needsReorder ? 'bg-tag-soft' : 'bg-canvas'}`}>
                {f.needsReorder ? (
                  <>
                    <p className="font-semibold">
                      Order {f.suggestedOrderQty} {item.unit} now
                    </p>
                    <p className="mt-1 text-sm text-ink-soft">
                      Covers the {f.leadTimeDays}-day delivery wait plus {f.coverDays} days of selling. About {peso(f.estimatedOrderCost)}.
                    </p>
                    <Link to="/app/forecast" className="mt-2 inline-block text-sm font-semibold text-accent hover:underline">
                      Open reorder suggestions
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="font-semibold">No order needed yet</p>
                    <p className="mt-1 text-sm text-ink-soft">
                      Stock is above the reorder level and will outlast the {f.leadTimeDays}-day delivery time.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>

      <Card className="mt-4">
        <CardHeader title="Stock ledger" hint="Every movement, newest first, with the balance after each one" />
        {ledger.loading && !ledger.data ? (
          <LoadingState rows={4} label="Loading ledger" />
        ) : ledger.error ? (
          <ErrorState message={ledger.error} onRetry={ledger.reload} />
        ) : !ledger.data || ledger.data.length === 0 ? (
          <EmptyState
            icon="list"
            title="No movements yet"
            hint="This product has never been restocked or sold."
            action={
              <Link to={`/app/stock/new?product=${item._id}`} className={buttonClass('primary')}>
                Add the first stock
              </Link>
            }
          />
        ) : (
          <div className="max-h-[26rem] overflow-y-auto">
            <ul className="divide-y divide-line">
              {/* REQUIREMENT [Core Req 3 - Frontend Application]: map() with a stable key (row._id). Shows the running balance from the API (Data Processing and Business Logic). */}
              {ledger.data.map((row) => (
                <li key={row._id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-5 py-3 sm:grid-cols-[9rem_6rem_minmax(0,1fr)_5rem_6rem]">
                  <span className="text-sm text-ink-soft">{formatDateTime(row.date)}</span>
                  <span className="justify-self-end sm:justify-self-start">
                    <TypeBadge type={row.type} />
                  </span>
                  <span className="hidden truncate text-sm text-ink-soft sm:block">
                    {row.note || (row.reason ? `Reason: ${row.reason}` : '')}
                  </span>
                  <span className={`tabular font-semibold sm:text-right ${row.type === 'restock' ? 'text-ok' : ''}`}>
                    {row.type === 'restock' ? '+' : '−'}
                    {row.quantity}
                  </span>
                  <span className="tabular text-right text-sm text-ink-soft">
                    <Badge>{row.balanceAfter} left</Badge>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {confirming && (
        <ConfirmDialog
          title={`Delete ${item.name}?`}
          message="The product is removed for good. Products that already have sales or restocks cannot be deleted, because that would change your reports."
          confirmLabel="Delete product"
          busy={deleting}
          onConfirm={deleteProduct}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  );
}
