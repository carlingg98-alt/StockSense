import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, getErrorMessage } from '../api/client';
import { UNITS, type Category, type Product, type Supplier } from '../api/types';
import { Button, buttonClass } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Field, inputClass } from '../components/ui/Field';
import { PageHeader } from '../components/ui/PageHeader';
import { ErrorState, LoadingState } from '../components/ui/States';
import { useFetch } from '../hooks/useFetch';
import { useToast } from '../hooks/useToast';
import { applyServerErrors } from '../lib/formErrors';
import { formatNumber, peso, toInputDate } from '../lib/format';
import { marginPercent } from '../lib/stock';
import { productSchema, type ProductFormValues } from '../schemas/product';

const EMPTY_FORM: ProductFormValues = {
  name: '',
  sku: '',
  category: '',
  supplier: '',
  unit: 'pc',
  unitCost: 0,
  unitPrice: 0,
  reorderLevel: 10,
  openingQuantity: 0,
  expiryDate: '',
};

// REQUIREMENT [Core Req 3 - Frontend Application]: page 3 - ONE form used for create (/products/new) and edit (/products/:id/edit).
export default function ProductForm() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const categories = useFetch<Category[]>('/categories');
  const suppliers = useFetch<Supplier[]>('/suppliers');
  const existing = useFetch<Product>(isEditing ? `/products/${id}` : null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors, isSubmitting },
  // REQUIREMENT [Core Req 3 - Frontend Application]: React Hook Form + Zod (zodResolver with productSchema from schemas/product.ts). z.infer type: ProductFormValues.
  } = useForm<ProductFormValues>({ resolver: zodResolver(productSchema), defaultValues: EMPTY_FORM });

  // When editing, fill the form once the product and the dropdown options have loaded.
  const product = existing.data;
  const optionsReady = Boolean(categories.data && suppliers.data);
  useEffect(() => {
    if (!product || !optionsReady) return;
    reset({
      name: product.name,
      sku: product.sku,
      category: product.category?._id ?? '',
      supplier: product.supplier?._id ?? '',
      unit: product.unit,
      unitCost: product.unitCost,
      unitPrice: product.unitPrice,
      reorderLevel: product.reorderLevel,
      openingQuantity: 0,
      expiryDate: toInputDate(product.expiryDate),
    });
  }, [product, optionsReady, reset]);

  // Live preview, derived from what is typed (never stored in state)
  const cost = watch('unitCost');
  const price = watch('unitPrice');
  const hasPrices = Number.isFinite(cost) && Number.isFinite(price) && price > 0;
  const margin = hasPrices ? marginPercent(cost, price) : 0;

  // REQUIREMENT [Core Req 3 - Frontend Application]: onSubmit is only called by handleSubmit AFTER the Zod schema passes (submit is gated); the button is disabled while isSubmitting.
  async function onSubmit(values: ProductFormValues) {
    const { openingQuantity, expiryDate, ...rest } = values;
    const body = { ...rest, sku: rest.sku.toUpperCase(), expiryDate: expiryDate || null };

    try {
      if (isEditing) {
        // REQUIREMENT [Core Req 2 - REST API]: PUT /products/:id (update) with success feedback.
        await api.put(`/products/${id}`, body);
        showToast(`${values.name} saved`);
        navigate(`/app/products/${id}`);
      } else {
        // REQUIREMENT [Core Req 2 - REST API]: POST /products (create) with success feedback.
        const response = await api.post<Product>('/products', { ...body, openingQuantity });
        showToast(`${values.name} added`);
        navigate(`/app/products/${response.data._id}`);
      }
    } catch (error) {
      // Put server-side validation messages under the matching fields
      // REQUIREMENT [Core Req 3 - Frontend Application]: server validation errors (e.g. duplicate SKU) are shown per field; other errors appear as a form-level message.
      const matched = applyServerErrors(error, setError, ['name', 'sku', 'category', 'supplier', 'unitCost', 'unitPrice', 'reorderLevel']);
      if (!matched) setError('root', { message: getErrorMessage(error) });
    }
  }

  const backTo = isEditing ? `/app/products/${id}` : '/app/products';
  const loading = categories.loading || suppliers.loading || existing.loading;
  const loadError = categories.error ?? suppliers.error ?? existing.error;

  return (
    <>
      <PageHeader
        title={isEditing ? 'Edit product' : 'Add a product'}
        description={
          isEditing
            ? 'Stock is not edited here. Use a restock, sale or write-off so the ledger stays correct.'
            : 'Opening stock is recorded as the first restock in the ledger.'
        }
        backTo={{ to: backTo, label: isEditing ? 'Back to product' : 'All products' }}
      />

      <Card className="max-w-3xl">
        {loading ? (
          <LoadingState rows={6} label="Loading form" />
        ) : loadError ? (
          <ErrorState
            message={loadError}
            onRetry={() => {
              categories.reload();
              suppliers.reload();
              existing.reload();
            }}
          />
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="p-5 sm:p-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Product name" htmlFor="name" error={errors.name?.message} className="sm:col-span-2">
                <input id="name" className={inputClass} aria-invalid={Boolean(errors.name)} placeholder="Coca-Cola 1.5L" {...register('name')} />
              </Field>

              <Field label="SKU" htmlFor="sku" error={errors.sku?.message} hint="Letters, numbers and dashes. Must be unique.">
                <input id="sku" className={`${inputClass} uppercase`} aria-invalid={Boolean(errors.sku)} placeholder="BEV-COKE-15" {...register('sku')} />
              </Field>

              <Field label="Sold by" htmlFor="unit" error={errors.unit?.message}>
                <select id="unit" className={inputClass} {...register('unit')}>
                  {UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Category" htmlFor="category" error={errors.category?.message}>
                <select id="category" className={inputClass} aria-invalid={Boolean(errors.category)} {...register('category')}>
                  <option value="">Choose a category</option>
                  {categories.data?.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Supplier" htmlFor="supplier" error={errors.supplier?.message}>
                <select id="supplier" className={inputClass} aria-invalid={Boolean(errors.supplier)} {...register('supplier')}>
                  <option value="">Choose a supplier</option>
                  {suppliers.data?.map((supplier) => (
                    <option key={supplier._id} value={supplier._id}>
                      {supplier.name}
                      {supplier.isActive ? '' : ' (inactive)'}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Unit cost (₱)" htmlFor="unitCost" error={errors.unitCost?.message} hint="What you pay the supplier">
                <input
                  id="unitCost"
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  className={inputClass}
                  aria-invalid={Boolean(errors.unitCost)}
                  {...register('unitCost', { valueAsNumber: true })}
                />
              </Field>

              <Field
                label="Selling price (₱)"
                htmlFor="unitPrice"
                error={errors.unitPrice?.message}
                hint={hasPrices ? `Profit ${peso(price - cost)} each, ${formatNumber(margin)}% margin` : 'What the customer pays'}
              >
                <input
                  id="unitPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  className={inputClass}
                  aria-invalid={Boolean(errors.unitPrice)}
                  {...register('unitPrice', { valueAsNumber: true })}
                />
              </Field>

              <Field label="Reorder level" htmlFor="reorderLevel" error={errors.reorderLevel?.message} hint="Flag as low stock at or below this quantity">
                <input
                  id="reorderLevel"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  className={inputClass}
                  aria-invalid={Boolean(errors.reorderLevel)}
                  {...register('reorderLevel', { valueAsNumber: true })}
                />
              </Field>

              {!isEditing && (
                <Field label="Opening stock" htmlFor="openingQuantity" error={errors.openingQuantity?.message} hint="How many you have right now">
                  <input
                    id="openingQuantity"
                    type="number"
                    min="0"
                    inputMode="numeric"
                    className={inputClass}
                    aria-invalid={Boolean(errors.openingQuantity)}
                    {...register('openingQuantity', { valueAsNumber: true })}
                  />
                </Field>
              )}

              <Field label="Expiry date" htmlFor="expiryDate" error={errors.expiryDate?.message} hint="Leave empty if it does not expire">
                <input id="expiryDate" type="date" className={inputClass} {...register('expiryDate')} />
              </Field>
            </div>

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
                {isSubmitting ? 'Saving…' : isEditing ? 'Save changes' : 'Add product'}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </>
  );
}
