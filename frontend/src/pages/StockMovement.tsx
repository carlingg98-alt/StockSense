import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router-dom';
import { api, getErrorMessage } from '../api/client';
import { REASONS, type Product, type TransactionResult } from '../api/types';
import { Button, buttonClass } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Field, inputClass } from '../components/ui/Field';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States';
import { StockGauge } from '../components/ui/StockGauge';
import { useFetch } from '../hooks/useFetch';
import { useToast } from '../hooks/useToast';
import { peso } from '../lib/format';
import { stockMovementSchema, type StockMovementFormValues } from '../schemas/transaction';

const EMPTY_FORM: StockMovementFormValues = {
  type: 'restock',
  product: '',
  quantity: 1,
  unitCost: undefined,
  reason: '',
  note: '',
};

// REQUIREMENT [Core Req 3 - Frontend Application]: page 6 - restock or write off stock (POST /transactions).
export default function StockMovement() {
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const preselected = searchParams.get('product') ?? '';

  const products = useFetch<Product[]>('/products');

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  // REQUIREMENT [Core Req 3 - Frontend Application]: React Hook Form + Zod (stockMovementSchema, conditional rule: a reason is required for write-offs).
  } = useForm<StockMovementFormValues>({ resolver: zodResolver(stockMovementSchema), defaultValues: EMPTY_FORM });

  // Arriving from a product page (?product=ID): select that product once the list has loaded
  const loaded = Boolean(products.data);
  useEffect(() => {
    if (loaded && preselected) setValue('product', preselected);
  }, [loaded, preselected, setValue]);

  // REQUIREMENT [Core Req 3 - Frontend Application]: derived values (stock after, cost each, amount) are computed during render, not stored in state.
  // Derived preview
  const type = watch('type');
  const productId = watch('product');
  const quantity = watch('quantity');
  const newCost = watch('unitCost');
  const selected = products.data?.find((product) => product._id === productId);
  const validQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
  const isRestock = type === 'restock';
  const stockAfter = selected ? selected.quantity + (isRestock ? validQuantity : -validQuantity) : 0;
  const costEach = selected ? (isRestock && typeof newCost === 'number' && Number.isFinite(newCost) ? newCost : selected.unitCost) : 0;
  const amount = validQuantity * costEach;

  async function onSubmit(values: StockMovementFormValues) {
    const body = {
      type: values.type,
      product: values.product,
      quantity: values.quantity,
      note: values.note,
      // Only send the fields that belong to this kind of movement
      unitCost: values.type === 'restock' ? values.unitCost : undefined,
      reason: values.type === 'adjustment' ? values.reason : undefined,
    };
    try {
      const response = await api.post<TransactionResult>('/transactions', body);
      const name = response.data.transaction.product?.name ?? 'item';
      showToast(
        values.type === 'restock'
          ? `Added ${values.quantity} to ${name}. Now ${response.data.stockAfter} in stock.`
          : `Wrote off ${values.quantity} of ${name}. ${response.data.stockAfter} left.`
      );
      reset({ ...EMPTY_FORM, type: values.type });
      products.reload();
    } catch (error) {
      setError('root', { message: getErrorMessage(error) });
    }
  }

  return (
    <>
      <PageHeader
        title="Restock or write off"
        description="Add stock that arrived, or remove stock that was damaged, expired or lost."
      />

      <Card className="max-w-2xl">
        {products.loading && !products.data ? (
          <LoadingState rows={5} label="Loading products" />
        ) : products.error ? (
          <ErrorState message={products.error} onRetry={products.reload} />
        ) : (products.data ?? []).length === 0 ? (
          <EmptyState
            title="No products yet"
            hint="Add a product first, then you can restock it."
            action={
              <Link to="/app/products/new" className={buttonClass('primary')}>
                Add a product
              </Link>
            }
          />
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5 p-5 sm:p-6">
            <fieldset>
              <legend className="mb-1.5 text-sm font-medium">What happened?</legend>
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-canvas p-1">
                {(
                  [
                    { value: 'restock', label: 'Stock came in' },
                    { value: 'adjustment', label: 'Stock was lost' },
                  ] as const
                ).map((option) => (
                  <label
                    key={option.value}
                    className="cursor-pointer rounded-lg px-3 py-2.5 text-center text-sm font-semibold text-ink-soft has-checked:bg-surface has-checked:text-ink has-checked:shadow-sm has-focus-visible:outline-2 has-focus-visible:outline-accent"
                  >
                    <input type="radio" value={option.value} className="sr-only" {...register('type')} />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <Field label="Product" htmlFor="product" error={errors.product?.message}>
              <select id="product" className={inputClass} aria-invalid={Boolean(errors.product)} {...register('product')}>
                <option value="">Choose a product</option>
                {products.data?.map((product) => (
                  <option key={product._id} value={product._id}>
                    {product.name} ({product.quantity} in stock)
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={selected ? `Quantity (${selected.unit})` : 'Quantity'} htmlFor="quantity" error={errors.quantity?.message}>
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

              {isRestock ? (
                <Field
                  label="New unit cost (₱, optional)"
                  htmlFor="unitCost"
                  error={errors.unitCost?.message}
                  hint={selected ? `Currently ${peso(selected.unitCost)}. Leave empty if unchanged.` : 'Leave empty if unchanged'}
                >
                  <input
                    id="unitCost"
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    className={inputClass}
                    aria-invalid={Boolean(errors.unitCost)}
                    // An empty box means "no change", not zero
                    {...register('unitCost', { setValueAs: (value) => (value === '' || value == null ? undefined : Number(value)) })}
                  />
                </Field>
              ) : (
                <Field label="Reason" htmlFor="reason" error={errors.reason?.message}>
                  <select id="reason" className={inputClass} aria-invalid={Boolean(errors.reason)} {...register('reason')}>
                    <option value="">Choose a reason</option>
                    {REASONS.map((reason) => (
                      <option key={reason} value={reason}>
                        {reason.charAt(0).toUpperCase() + reason.slice(1)}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </div>

            <Field label="Note (optional)" htmlFor="note" error={errors.note?.message}>
              <input id="note" className={inputClass} placeholder={isRestock ? 'Delivery receipt no. 1042' : 'Found during the weekly count'} {...register('note')} />
            </Field>

            {selected && (
              <div className="rounded-xl bg-canvas p-4">
                <p className="mb-2 text-sm text-ink-soft">
                  Shelf after saving{stockAfter < 0 ? '' : `, ${isRestock ? 'costing' : 'losing'} ${peso(amount)}`}
                </p>
                {stockAfter < 0 ? (
                  <p className="font-medium text-out">
                    You only have {selected.quantity} {selected.unit}. You cannot write off {validQuantity}.
                  </p>
                ) : (
                  <StockGauge quantity={stockAfter} reorderLevel={selected.reorderLevel} unit={selected.unit} />
                )}
              </div>
            )}

            {errors.root && (
              <p role="alert" className="rounded-xl bg-out-soft px-4 py-3 text-sm text-out">
                {errors.root.message}
              </p>
            )}

            <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : isRestock ? 'Save restock' : 'Save write-off'}
            </Button>
          </form>
        )}
      </Card>
    </>
  );
}
