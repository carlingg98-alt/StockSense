import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { RankedProduct, Summary, TrendDay } from '../api/types';
import { BarChart } from '../components/ui/BarChart';
import { Card, CardHeader } from '../components/ui/Card';
import { inputClass } from '../components/ui/Field';
import { PageHeader } from '../components/ui/PageHeader';
import { StatTile } from '../components/ui/StatTile';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States';
import { useFetch } from '../hooks/useFetch';
import { formatDayKey, peso, pesoWhole } from '../lib/format';

// A ranked list where each row's bar is its share of the top row
function RankedList({ rows, metric }: { rows: RankedProduct[]; metric: 'unitsSold' | 'stockValue' }) {
  const top = Math.max(...rows.map((row) => row[metric]), 1);
  return (
    <ol className="divide-y divide-line">
      {rows.map((row, index) => (
        <li key={row._id} className="px-5 py-3">
          <div className="flex items-baseline justify-between gap-4">
            <Link to={`/app/products/${row._id}`} className="min-w-0 truncate font-semibold hover:underline">
              <span className="tabular mr-2 text-ink-faint">{index + 1}</span>
              {row.name}
            </Link>
            <span className="tabular shrink-0 text-sm">
              {metric === 'unitsSold' ? `${row.unitsSold} ${row.unit}, ${pesoWhole(row.revenue)}` : `${row.unitsSold} sold, ${pesoWhole(row.stockValue)} on shelf`}
            </span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-canvas">
            <div
              className={`h-full rounded-full ${metric === 'unitsSold' ? 'bg-ink' : 'bg-low'}`}
              style={{ width: `${(row[metric] / top) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

// REQUIREMENT [Core Req 3 - Frontend Application]: page 12 - sales reports. Data processed by the API (Data Processing and Business Logic: revenue, profit, margin, best sellers, slow movers, revenue share).
export default function Reports() {
  const [days, setDays] = useState(30);
  // REQUIREMENT [Core Req 3 - Frontend Application]: the period (7 / 14 / 30 days) is sent to the API; every section has loading, error and empty states.
  const summary = useFetch<Summary>('/analytics/summary', { days });
  const trend = useFetch<TrendDay[]>('/analytics/sales-trend', { days });

  const sales = summary.data?.sales;
  const change = sales?.revenueChangePercent ?? null;
  // REQUIREMENT [Core Req 3 - Frontend Application]: derived value (best day) computed during render, not stored in state.
  // Derived from the trend: the single best day in the period
  const bestDay = (trend.data ?? []).reduce<TrendDay | null>((best, day) => (!best || day.revenue > best.revenue ? day : best), null);

  return (
    <>
      <PageHeader
        title="Sales reports"
        description="What sold, what it earned and what is sitting on the shelf."
        actions={
          <select aria-label="Period" value={days} onChange={(event) => setDays(Number(event.target.value))} className={`${inputClass} w-auto`}>
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
        }
      />

      {summary.error ? (
        <Card>
          <ErrorState message={summary.error} onRetry={summary.reload} />
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          <StatTile
            label="Revenue"
            value={sales ? pesoWhole(sales.revenue) : ''}
            loading={summary.loading && !sales}
            note={
              change === null ? (
                'No earlier period to compare'
              ) : (
                <span className={change >= 0 ? 'text-ok' : 'text-out'}>
                  {change >= 0 ? 'Up' : 'Down'} {Math.abs(change)}% on the {days} days before
                </span>
              )
            }
          />
          <StatTile
            label="Gross profit"
            value={sales ? pesoWhole(sales.profit) : ''}
            loading={summary.loading && !sales}
            note={sales && `${sales.marginPercent}% of revenue`}
          />
          <StatTile
            label="Units sold"
            value={sales ? sales.unitsSold.toLocaleString() : ''}
            loading={summary.loading && !sales}
            note={sales && `${sales.saleCount.toLocaleString()} sales, ${peso(sales.averageSale)} on average`}
          />
          <StatTile
            label="Spent on restocks"
            value={sales ? pesoWhole(sales.restockSpend) : ''}
            loading={summary.loading && !sales}
            note="Cost of stock received"
          />
          <StatTile
            label="Lost to write-offs"
            value={sales ? pesoWhole(sales.writeOffLoss) : ''}
            loading={summary.loading && !sales}
            note="Damaged, expired or lost stock at cost"
          />
          <StatTile
            label="Stock on hand"
            value={summary.data ? pesoWhole(summary.data.inventory.costValue) : ''}
            loading={summary.loading && !sales}
            note={summary.data && `Would sell for ${pesoWhole(summary.data.inventory.retailValue)}`}
          />
        </div>
      )}

      <Card className="mt-4">
        <CardHeader
          title="Revenue by day"
          hint={bestDay && bestDay.revenue > 0 ? `Best day was ${formatDayKey(bestDay.date)} with ${peso(bestDay.revenue)}` : undefined}
        />
        <div className="px-5 pb-5">
          {trend.loading && !trend.data ? (
            <LoadingState rows={3} label="Loading trend" />
          ) : trend.error ? (
            <ErrorState message={trend.error} onRetry={trend.reload} />
          ) : !trend.data || trend.data.every((day) => day.revenue === 0) ? (
            <EmptyState icon="chart" title="No sales in this period" hint="Choose a longer period or record a sale." />
          ) : (
            <BarChart
              ariaLabel={`Revenue per day for the last ${days} days`}
              bars={trend.data.map((day) => ({
                key: day.date,
                label: formatDayKey(day.date),
                value: day.revenue,
                display: `${peso(day.revenue)} from ${day.saleCount} sales`,
                highlight: day.date === bestDay?.date,
              }))}
            />
          )}
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Best sellers" hint="Most units sold in the period" />
          {summary.loading && !summary.data ? (
            <LoadingState label="Loading best sellers" />
          ) : summary.error ? (
            <ErrorState message={summary.error} onRetry={summary.reload} />
          ) : !summary.data || summary.data.bestSellers.length === 0 ? (
            <EmptyState icon="chart" title="Nothing sold yet" hint="Best sellers appear after the first sales in this period." />
          ) : (
            <RankedList rows={summary.data.bestSellers} metric="unitsSold" />
          )}
        </Card>

        <Card>
          <CardHeader title="Slow movers" hint="In stock but barely selling. Money sitting on the shelf." />
          {summary.loading && !summary.data ? (
            <LoadingState label="Loading slow movers" />
          ) : summary.error ? (
            <ErrorState message={summary.error} onRetry={summary.reload} />
          ) : !summary.data || summary.data.slowMovers.length === 0 ? (
            <EmptyState title="No stock on hand" hint="Slow movers are picked from products that have stock." />
          ) : (
            <RankedList rows={summary.data.slowMovers} metric="stockValue" />
          )}
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="By category" hint="Share of revenue next to the stock value each category holds" />
        {summary.loading && !summary.data ? (
          <LoadingState label="Loading categories" />
        ) : summary.error ? (
          <ErrorState message={summary.error} onRetry={summary.reload} />
        ) : !summary.data || summary.data.categoryBreakdown.length === 0 ? (
          <EmptyState icon="tag" title="No categories to compare" hint="Add products to see how each category performs." />
        ) : (
          <ul className="divide-y divide-line">
            {/* REQUIREMENT [Core Req 3 - Frontend Application]: map() with a stable key (row.category). */}
            {summary.data.categoryBreakdown.map((row) => (
              <li key={row.category} className="grid items-center gap-x-6 gap-y-1.5 px-5 py-3 sm:grid-cols-[10rem_minmax(0,1fr)_14rem]">
                <span className="font-semibold">{row.category}</span>
                <div className="flex items-center gap-3">
                  <div className="h-2 min-w-0 flex-1 rounded-full bg-canvas">
                    <div className="h-full rounded-full bg-tag" style={{ width: `${row.revenueShare}%` }} />
                  </div>
                  <span className="tabular w-12 shrink-0 text-right text-sm font-semibold">{row.revenueShare}%</span>
                </div>
                <span className="tabular text-sm text-ink-soft sm:text-right">
                  {pesoWhole(row.revenue)} sold, {pesoWhole(row.stockValue)} in stock
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
