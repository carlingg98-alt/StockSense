import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, getErrorMessage } from '../api/client';
import type { Product, PurchaseOrder, Supplier } from '../api/types';
import { Button, buttonClass } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Field, inputClass } from '../components/ui/Field';
import { Icon } from '../components/ui/Icon';
import { PageHeader } from '../components/ui/PageHeader';
import { ErrorState, LoadingState } from '../components/ui/States';
import { useFetch } from '../hooks/useFetch';
import { useToast } from '../hooks/useToast';
import { peso } from '../lib/format';
import { purchaseOrderSchema, type PurchaseOrderFormValues } from '../schemas/purchaseOrder';

const EMPTY_ITEM = { product: '', quantity: 1, unitCost: 0 };

// REQUIREMENT [Core Req 3 - Frontend Application]: page 11 - ONE form for create (/orders/new) and edit (/orders/:id/edit); only drafts can be edited.
export default function PurchaseOrderForm() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const suppliers = useFetch<Supplier[]>('/suppliers');
  const products = useFetch<Product[]>('/products');
  const existing = useFetch<PurchaseOrder>(isEditing ? `/purchase-orders/${id}` : null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  // REQUIREMENT [Core Req 3 - Frontend Application]: React Hook Form + Zod (purchaseOrderSchema, z.infer type PurchaseOrderFormValues).
  } = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: { supplier: '', note: '', items: [EMPTY_ITEM] },
  });
  // REQUIREMENT [Core Req 3 - Frontend Application]: dynamic item rows. `field.id` from useFieldArray is the stable key (not the index).
  // useFieldArray manages the add / remove rows. Each row gets a stable `id` to use as its key.
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const order = existing.data;
  const optionsReady = Boolean(suppliers.data && products.data);
  useEffect(() => {
    if (!order || !optionsReady) return;
    reset({
      supplier: order.supplier?._id ?? '',
      note: order.note,
      items: order.items.map((item) => ({
        product: item.product?._id ?? '',
        quantity: item.quantity,
        unitCost: item.unitCost,
      })),
    });
  }, [order, optionsReady, reset]);

  // REQUIREMENT [Data Processing and Business Logic]: matching + totals - only the chosen supplier's products can be ordered, and the order total is computed during render (not stored in state).
  // Derived: only this supplier's products can be ordered, and the total updates as you type
  const supplierId = watch('supplier');
  const items = watch('items');
  const supplierProducts = (products.data ?? []).filter((product) => product.supplier?._id === supplierId);
  const total = items.reduce((sum, item) => {
    const lineTotal = item.quantity * item.unitCost;
    return sum + (Number.isFinite(lineTotal) ? lineTotal : 0);
  }, 0);

  async function onSubmit(values: PurchaseOrderFormValues) {
    try {
      if (isEditing) {
        // REQUIREMENT [Core Req 2 - REST API]: PUT /purchase-orders/:id (update) with success feedback.
        await api.put(`/purchase-orders/${id}`, values);
        showToast('Order saved');
        navigate(`/app/orders/${id}`);
      } else {
        // REQUIREMENT [Core Req 2 - REST API]: POST /purchase-orders (create) with success feedback.
        const response = await api.post<PurchaseOrder>('/purchase-orders', values);
        showToast(`Draft ${response.data.orderNumber} created`);
        navigate(`/app/orders/${response.data._id}`);
      }
    } catch (error) {
      setError('root', { message: getErrorMessage(error) });
    }
  }

  const backTo = isEditing ? `/app/orders/${id}` : '/app/orders';
  const loading = suppliers.loading || products.loading || existing.loading;
  const loadError = suppliers.error ?? products.error ?? existing.error;
  // REQUIREMENT [Data Processing and Business Logic]: mirrors the server rule - an order that is not a draft cannot be edited.
  const notDraft = order && order.status !== 'draft';

  return (
    <>
      <PageHeader
        title={isEditing ? `Edit ${order?.orderNumber ?? 'order'}` : 'New purchase order'}
        description="Orders start as drafts. You can change a draft until you mark it as ordered."
        backTo={{ to: backTo, label: isEditing ? 'Back to order' : 'All orders' }}
      />

      <Card className="max-w-3xl">
        {loading ? (
          <LoadingState rows={5} label="Loading form" />
        ) : loadError ? (
          <ErrorState
            message={loadError}
            onRetry={() => {
              suppliers.reload();
              products.reload();
              existing.reload();
            }}
          />
        ) : notDraft ? (
          <ErrorState message={`This order is ${order.status}, and only draft orders can be edited.`} />
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="p-5 sm:p-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Supplier" htmlFor="supplier" error={errors.supplier?.message}>
                <select
                  id="supplier"
                  className={inputClass}
                  aria-invalid={Boolean(errors.supplier)}
                  {...register('supplier', {
                    // A different supplier sells different products, so start the item list again
                    onChange: () => setValue('items', [EMPTY_ITEM]),
                  })}
                >
                  <option value="">Choose a supplier</option>
                  {suppliers.data
                    ?.filter((supplier) => supplier.isActive)
                    .map((supplier) => (
                      <option key={supplier._id} value={supplier._id}>
                        {supplier.name}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Note (optional)" htmlFor="note" error={errors.note?.message}>
                <input id="note" className={inputClass} placeholder="Ask about the promo price" {...register('note')} />
              </Field>
            </div>

            <h2 className="mt-7 mb-3 text-lg font-semibold">Items</h2>
            {!supplierId ? (
              <p className="rounded-xl bg-canvas px-4 py-3 text-sm text-ink-soft">Choose a supplier to see the products you can order from them.</p>
            ) : supplierProducts.length === 0 ? (
              <p className="rounded-xl bg-canvas px-4 py-3 text-sm text-ink-soft">
                No products are linked to this supplier yet. Set the supplier on a product first.
              </p>
            ) : (
              <>
                <ul className="space-y-3">
                  {fields.map((field, index) => {
                    const itemErrors = errors.items?.[index];
                    return (
                      <li key={field.id} className="grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-[minmax(0,1fr)_6.5rem_8rem_auto] sm:items-start">
                        <Field label="Product" htmlFor={`items.${index}.product`} error={itemErrors?.product?.message}>
                          <select
                            id={`items.${index}.product`}
                            className={inputClass}
                            aria-invalid={Boolean(itemErrors?.product)}
                            {...register(`items.${index}.product`, {
                              // Fill in the product's current cost as a starting point
                              onChange: (event) => {
                                const chosen = supplierProducts.find((product) => product._id === event.target.value);
                                if (chosen) setValue(`items.${index}.unitCost`, chosen.unitCost);
                              },
                            })}
                          >
                            <option value="">Choose a product</option>
                            {supplierProducts.map((product) => (
                              <option key={product._id} value={product._id}>
                                {product.name} ({product.quantity} in stock)
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Quantity" htmlFor={`items.${index}.quantity`} error={itemErrors?.quantity?.message}>
                          <input
                            id={`items.${index}.quantity`}
                            type="number"
                            min="1"
                            inputMode="numeric"
                            className={inputClass}
                            aria-invalid={Boolean(itemErrors?.quantity)}
                            {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                          />
                        </Field>
                        <Field label="Cost each (₱)" htmlFor={`items.${index}.unitCost`} error={itemErrors?.unitCost?.message}>
                          <input
                            id={`items.${index}.unitCost`}
                            type="number"
                            step="0.01"
                            min="0"
                            inputMode="decimal"
                            className={inputClass}
                            aria-invalid={Boolean(itemErrors?.unitCost)}
                            {...register(`items.${index}.unitCost`, { valueAsNumber: true })}
                          />
                        </Field>
                        <Button
                          variant="ghost"
                          className="px-3 sm:mt-[1.6rem]"
                          aria-label={`Remove item ${index + 1}`}
                          disabled={fields.length === 1}
                          onClick={() => remove(index)}
                        >
                          <Icon name="trash" className="size-4" />
                          <span className="sm:hidden">Remove</span>
                        </Button>
                      </li>
                    );
                  })}
                </ul>
                {errors.items?.root?.message && <p className="mt-2 text-sm text-out">{errors.items.root.message}</p>}
                {errors.items?.message && <p className="mt-2 text-sm text-out">{errors.items.message}</p>}

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <Button variant="secondary" size="sm" onClick={() => append(EMPTY_ITEM)}>
                    <Icon name="plus" className="size-4" />
                    Add another item
                  </Button>
                  <p className="tabular text-ink-soft">
                    Order total <span className="ml-1 font-display text-xl font-semibold text-ink">{peso(total)}</span>
                  </p>
                </div>
              </>
            )}

            {errors.root && (
              <p role="alert" className="mt-5 rounded-xl bg-out-soft px-4 py-3 text-sm text-out">
                {errors.root.message}
              </p>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-end">
              <Link to={backTo} className={buttonClass('secondary')}>
                Cancel
              </Link>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : isEditing ? 'Save changes' : 'Create draft order'}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </>
  );
}
