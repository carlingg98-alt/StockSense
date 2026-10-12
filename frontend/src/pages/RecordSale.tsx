import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { api, getErrorMessage } from '../api/client';
import type { Product, Transaction, TransactionResult } from '../api/types';
import { Button, buttonClass } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { Field, inputClass } from '../components/ui/Field';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States';
import { useFetch } from '../hooks/useFetch';
import { useToast } from '../hooks/useToast';
import { formatDateTime, peso, plural, todayInputValue } from '../lib/format';
import { saleSchema, type SaleFormValues } from '../schemas/transaction';

// REQUIREMENT [Core Req 3 - Frontend Application]: page 5 - record a sale. Posts to /transactions/sale (Data Processing and Business Logic: a sale larger than the stock is rejected).
export default function RecordSale() {
  const { showToast } = useToast();
  const today = todayInputValue();

  const products = useFetch<Product[]>('/products');
  const todaysSales = useFetch<Transaction[]>('/transactions', { type: 'sale', from: today, to: today });

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setError,
    formState: { errors, isSubmitting },
  // REQUIREMENT [Core Req 3 - Frontend Application]: React Hook Form + Zod (saleSchema, z.infer type SaleFormValues).
  } = useForm<SaleFormValues>({
    resolver: zodResolver(saleSchema),
    defaultValues: { product: '', quantity: 1, note: '' },
  });

  // REQUIREMENT [Core Req 3 - Frontend Application]: derived values (total, stock after sale, "not enough stock" flag) are computed during render from watch() - not stored in state.
  // Live receipt preview, all derived from the two inputs during render
  const productId = watch('product');
  const quantity = watch('quantity');
  const selected = products.data?.find((product) => product._id === productId);
  const validQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
  const total = selected ? validQuantity * selected.unitPrice : 0;
  const stockAfter = selected ? selected.quantity - validQuantity : 0;
  const notEnough = selected !== undefined && stockAfter < 0;

  const sales = todaysSales.data ?? [];
  // REQUIREMENT [Data Processing and Business Logic]: totals - sum of today's sales, computed during render.
  const todaysTotal = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const todaysUnits = sales.reduce((sum, sale) => sum + sale.quantity, 0);

  async function onSubmit(values: SaleFormValues) {
    try {
      const response = await api.post<TransactionResult>('/transactions/sale', values);
      const { transaction, stockAfter: left, isLowStock } = response.data;
      const name = transaction.product?.name ?? 'item';
      showToast(
        `Sold ${transaction.quantity} × ${name} for ${peso(transaction.totalAmount)}.` +
          (isLowStock ? ` Only ${left} left, time to reorder.` : '')
      );
      reset({ product: '', quantity: 1, note: '' });
      products.reload();
      todaysSales.reload();
    } catch (error) {
      // REQUIREMENT [Core Req 2 - REST API]: the API's 400 error is shown in the form (no silent failure).
      // For example "Not enough stock: only 3 bottle of Coca-Cola 1.5L left"
      setError('root', { message: getErrorMessage(error) });
    }
  }

  return (
    <>
      <PageHeader title="Record a sale" description="Stock is deducted and the total is computed the moment you save." />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          {products.loading && !products.data ? (
            <LoadingState rows={4} label="Loading products" />
          ) : products.error ? (
            <ErrorState message={products.error} onRetry={products.reload} />
          ) : (products.data ?? []).length === 0 ? (
            <EmptyState
              title="Nothing to sell yet"
              hint="Add a product first, then come back to record sales."
              action={
                <Link to="/app/products/new" className={buttonClass('primary')}>
                  Add a product
                </Link>
              }
            />
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5 p-5 sm:p-6">
              <Field label="Product" htmlFor="product" error={errors.product?.message}>
                <select id="product" className={inputClass} aria-invalid={Boolean(errors.product)} {...register('product')}>
                  <option value="">Choose a product</option>
                  {products.data?.map((product) => (
                    <option key={product._id} value={product._id} disabled={product.quantity === 0}>
                      {product.name} ({product.quantity === 0 ? 'sold out' : `${product.quantity} left`})
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label={selected ? `Quantity (${selected.unit})` : 'Quantity'}
                htmlFor="quantity"
                error={errors.quantity?.message}
              >
                <input
                  id="quantity"
                  type="number"
                  min="1"
                  inputMode="numeric"
                  className={inputClass}
                  aria-invalid={Boolean(errors.quantity)}
                  {...register('quantity', { valueAsNumber: true })}
                />
              </Field>

              <Field label="Note (optional)" htmlFor="note" error={errors.note?.message}>
                <input id="note" className={inputClass} placeholder="Suki discount, bulk buyer…" {...register('note')} />
              </Field>

              <div className="rounded-xl bg-canvas p-4">
                {selected ? (
                  <dl className="space-y-1.5 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-ink-soft">Price each</dt>
                      <dd className="tabular">{peso(selected.unitPrice)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-ink-soft">Stock after this sale</dt>
                      <dd className={`tabular font-medium ${notEnough ? 'text-out' : stockAfter <= selected.reorderLevel ? 'text-low' : ''}`}>
                        {notEnough ? `Short by ${Math.abs(stockAfter)}` : `${stockAfter} ${selected.unit}`}
                      </dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-4 border-t border-line pt-2">
                      <dt className="font-semibold">Total</dt>
                      <dd className="tabular font-display text-2xl font-semibold">{peso(total)}</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="text-sm text-ink-soft">Choose a product to see the total.</p>
                )}
              </div>

              {errors.root && (
                <p role="alert" className="rounded-xl bg-out-soft px-4 py-3 text-sm text-out">
                  {errors.root.message}
                </p>
              )}

              <Button type="submit" variant="highlight" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : 'Save sale'}
              </Button>
            </form>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Sold today"
            hint={sales.length > 0 ? `${plural(sales.length, 'sale')}, ${todaysUnits} units, ${peso(todaysTotal)}` : undefined}
          />
          {todaysSales.loading && !todaysSales.data ? (
            <LoadingState rows={3} label="Loading today's sales" />
          ) : todaysSales.error ? (
            <ErrorState message={todaysSales.error} onRetry={todaysSales.reload} />
          ) : sales.length === 0 ? (
            <EmptyState icon="cart" title="No sales yet today" hint="The first sale you save will appear here." />
          ) : (
            <ul className="max-h-[28rem] divide-y divide-line overflow-y-auto">
              {sales.map((sale) => (
                <li key={sale._id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{sale.product?.name ?? 'Deleted product'}</p>
                    <p className="tabular text-sm text-ink-soft">
                      {sale.quantity} × {peso(sale.unitPrice)}, {formatDateTime(sale.date)}
                    </p>
                  </div>
                  <span className="tabular shrink-0 font-semibold">{peso(sale.totalAmount)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
