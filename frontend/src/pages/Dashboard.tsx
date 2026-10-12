import { Link } from 'react-router-dom';
import type { ExpiringProduct, ReorderSuggestion, Summary, Transaction, TrendDay } from '../api/types';
import { BarChart } from '../components/ui/BarChart';
import { Badge } from '../components/ui/Badge';
import { buttonClass } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { StatTile } from '../components/ui/StatTile';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States';
import { TypeBadge } from '../components/ui/TypeBadge';
import { useFetch } from '../hooks/useFetch';
import { formatDateTime, formatDayKey, peso, pesoWhole, todayInputValue } from '../lib/format';

// REQUIREMENT [Core Req 3 - Frontend Application]: page 1 - Dashboard. Each section has its own loading, error and empty state. Data from /analytics/summary, /products/reorder-suggestions, /analytics/sales-trend, /products/expiring and /transactions.
export default function Dashboard() {
  // Each panel loads on its own, so one failed request never blanks the whole page.
  const summary = useFetch<Summary>('/analytics/summary', { days: 7 });
  const trend = useFetch<TrendDay[]>('/analytics/sales-trend', { days: 14 });
  const reorder = useFetch<ReorderSuggestion[]>('/products/reorder-suggestions');
  const expiring = useFetch<ExpiringProduct[]>('/products/expiring', { days: 30 });
  const recent = useFetch<Transaction[]>('/transactions', { limit: 6 });

  // REQUIREMENT [Core Req 3 - Frontend Application]: derived values are computed during render and NOT stored in state.
  // Derived during render (not stored in state)
  const inventory = summary.data?.inventory;
  const sales = summary.data?.sales;
  const needsReorderCount = inventory ? inventory.lowStockCount + inventory.outOfStockCount : 0;
  const expiryCount = inventory ? inventory.expiringCount + inventory.expiredCount : 0;
  const change = sales?.revenueChangePercent ?? null;
  const today = todayInputValue();

  return (
    <>
      <PageHeader
        title="Today at the store"
        description={new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}
        actions={
          <>
            <Link to="/app/stock/new" className={buttonClass('secondary')}>
              Restock
            </Link>
            <Link to="/app/sales/new" className={buttonClass('highlight')}>
              Record a sale
            </Link>
          </>
        }
      />

      {summary.error ? (
        <Card>
          <ErrorState message={summary.error} onRetry={summary.reload} />
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatTile
            label="Sales, last 7 days"
            value={sales ? pesoWhole(sales.revenue) : ''}
            loading={summary.loading}
            note={
              change === null ? (
                'No earlier week to compare'
              ) : (
                <span className={change >= 0 ? 'text-ok' : 'text-out'}>
                  {change >= 0 ? 'Up' : 'Down'} {Math.abs(change)}% on the week before
                </span>
              )
            }
          />
          <StatTile
            label="Stock value at cost"
            value={inventory ? pesoWhole(inventory.costValue) : ''}
            loading={summary.loading}
            note={inventory && `${inventory.totalUnits.toLocaleString()} units across ${inventory.productCount} products`}
          />
          <StatTile
            label="Needs reordering"
            value={String(needsReorderCount)}
            loading={summary.loading}
            note={inventory && `${inventory.outOfStockCount} sold out, ${inventory.lowStockCount} running low`}
          />
          <StatTile
            label="Expiry watch"
            value={String(expiryCount)}
            loading={summary.loading}
            note={inventory && `${inventory.expiredCount} expired, ${inventory.expiringCount} within 30 days`}
          />
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader
            title="Reorder first"
            hint="Sorted by how soon the shelf will be empty"
            action={
              <Link to="/app/forecast" className="text-sm font-semibold text-accent hover:underline">
                See all suggestions
              </Link>
            }
          />
          {reorder.loading ? (
            <LoadingState />
          ) : reorder.error ? (
            <ErrorState message={reorder.error} onRetry={reorder.reload} />
          ) : !reorder.data || reorder.data.length === 0 ? (
            <EmptyState icon="check" title="Every shelf is covered" hint="Nothing is at or below its reorder level right now." />
          ) : (
            <ul className="divide-y divide-line">
              {/* REQUIREMENT [Core Req 3 - Frontend Application]: map() with stable key (product._id). */}
              {reorder.data.slice(0, 5).map(({ product, forecast }) => (
                <li key={product._id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <Link to={`/app/products/${product._id}`} className="block truncate font-semibold hover:underline">
                      {product.name}
                    </Link>
                    <p className="tabular text-sm text-ink-soft">
                      {product.quantity} {product.unit} left, order {forecast.suggestedOrderQty}
                    </p>
                  </div>
                  <Badge tone={forecast.urgency === 'soon' ? 'low' : 'out'}>
                    {forecast.urgency === 'out'
                      ? 'Sold out'
                      : forecast.daysOfStockLeft === null
                        ? 'Below level'
                        : `${forecast.daysOfStockLeft} days left`}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Sales, last 14 days" hint="Today is the yellow bar" />
          <div className="px-5 pb-5">
            {trend.loading ? (
              <LoadingState rows={3} />
            ) : trend.error ? (
              <ErrorState message={trend.error} onRetry={trend.reload} />
            ) : !trend.data || trend.data.every((day) => day.revenue === 0) ? (
              <EmptyState icon="chart" title="No sales in the last 14 days" hint="Record a sale and it will show up here." />
            ) : (
              <BarChart
                ariaLabel="Revenue per day for the last 14 days"
                bars={trend.data.map((day) => ({
                  key: day.date,
                  label: formatDayKey(day.date),
                  value: day.revenue,
                  display: peso(day.revenue),
                  highlight: day.date === today,
                }))}
              />
            )}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Expiring soon" hint="Sell, discount or write these off" />
          {expiring.loading ? (
            <LoadingState rows={3} />
          ) : expiring.error ? (
            <ErrorState message={expiring.error} onRetry={expiring.reload} />
          ) : !expiring.data || expiring.data.length === 0 ? (
            <EmptyState icon="clock" title="Nothing is close to expiry" hint="No stocked item expires in the next 30 days." />
          ) : (
            <ul className="divide-y divide-line">
              {expiring.data.slice(0, 5).map((product) => (
                <li key={product._id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <Link to={`/app/products/${product._id}`} className="block truncate font-semibold hover:underline">
                      {product.name}
                    </Link>
                    <p className="tabular text-sm text-ink-soft">
                      {product.quantity} {product.unit}, {peso(product.valueAtRisk)} at risk
                    </p>
                  </div>
                  <Badge tone={product.isExpired ? 'out' : 'low'}>
                    {product.isExpired
                      ? `Expired ${Math.abs(product.daysUntilExpiry)}d ago`
                      : product.daysUntilExpiry === 0
                        ? 'Expires today'
                        : `${product.daysUntilExpiry}d left`}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Latest movements"
            action={
              <Link to="/app/transactions" className="text-sm font-semibold text-accent hover:underline">
                Open the ledger
              </Link>
            }
          />
          {recent.loading ? (
            <LoadingState rows={3} />
          ) : recent.error ? (
            <ErrorState message={recent.error} onRetry={recent.reload} />
          ) : !recent.data || recent.data.length === 0 ? (
            <EmptyState icon="list" title="No stock movements yet" hint="Sales, restocks and write-offs appear here as they happen." />
          ) : (
            <ul className="divide-y divide-line">
              {recent.data.map((row) => (
                <li key={row._id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{row.product?.name ?? 'Deleted product'}</p>
                    <p className="text-sm text-ink-soft">{formatDateTime(row.date)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="tabular text-sm font-semibold">
                      {row.type === 'restock' ? '+' : '−'}
                      {row.quantity}
                    </span>
                    <TypeBadge type={row.type} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
