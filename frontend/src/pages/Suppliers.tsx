import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { api, getErrorMessage } from '../api/client';
import type { Supplier } from '../api/types';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Field, inputClass } from '../components/ui/Field';
import { Icon } from '../components/ui/Icon';
import { ConfirmDialog, Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States';
import { useFetch } from '../hooks/useFetch';
import { useToast } from '../hooks/useToast';
import { applyServerErrors } from '../lib/formErrors';
import { plural } from '../lib/format';
import { supplierSchema, type SupplierFormValues } from '../schemas/supplier';

function SupplierForm({ supplier, onDone, onCancel }: { supplier: Supplier | null; onDone: () => void; onCancel: () => void }) {
  const { showToast } = useToast();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  // REQUIREMENT [Core Req 3 - Frontend Application]: React Hook Form + Zod (supplierSchema, z.infer type SupplierFormValues).
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: supplier
      ? {
          name: supplier.name,
          contactPerson: supplier.contactPerson,
          phone: supplier.phone,
          email: supplier.email,
          leadTimeDays: supplier.leadTimeDays,
          isActive: supplier.isActive,
        }
      : { name: '', contactPerson: '', phone: '', email: '', leadTimeDays: 3, isActive: true },
  });

  async function onSubmit(values: SupplierFormValues) {
    try {
      if (supplier) {
        await api.put(`/suppliers/${supplier._id}`, values);
        showToast(`${values.name} saved`);
      } else {
        await api.post('/suppliers', values);
        showToast(`${values.name} added`);
      }
      onDone();
    } catch (error) {
      // REQUIREMENT [Core Req 3 - Frontend Application]: server validation errors (e.g. duplicate name) are shown per field.
      const matched = applyServerErrors(error, setError, ['name', 'contactPerson', 'phone', 'email', 'leadTimeDays']);
      if (!matched) setError('root', { message: getErrorMessage(error) });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <Field label="Supplier name" htmlFor="supplier-name" error={errors.name?.message}>
        <input id="supplier-name" className={inputClass} aria-invalid={Boolean(errors.name)} {...register('name')} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Contact person" htmlFor="supplier-contact" error={errors.contactPerson?.message}>
          <input id="supplier-contact" className={inputClass} aria-invalid={Boolean(errors.contactPerson)} {...register('contactPerson')} />
        </Field>
        <Field label="Phone" htmlFor="supplier-phone" error={errors.phone?.message}>
          <input id="supplier-phone" type="tel" className={inputClass} aria-invalid={Boolean(errors.phone)} placeholder="0917 555 0142" {...register('phone')} />
        </Field>
        <Field label="Email (optional)" htmlFor="supplier-email" error={errors.email?.message}>
          <input id="supplier-email" type="email" className={inputClass} aria-invalid={Boolean(errors.email)} {...register('email')} />
        </Field>
        <Field label="Lead time (days)" htmlFor="supplier-lead" error={errors.leadTimeDays?.message} hint="Days from ordering to delivery">
          <input
            id="supplier-lead"
            type="number"
            min="0"
            max="90"
            inputMode="numeric"
            className={inputClass}
            aria-invalid={Boolean(errors.leadTimeDays)}
            {...register('leadTimeDays', { valueAsNumber: true })}
          />
        </Field>
      </div>
      <label className="flex cursor-pointer items-center gap-3 text-sm">
        <input type="checkbox" className="size-4 accent-ink" {...register('isActive')} />
        Active (can receive new purchase orders)
      </label>
      {errors.root && (
        <p role="alert" className="rounded-xl bg-out-soft px-4 py-3 text-sm text-out">
          {errors.root.message}
        </p>
      )}
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : supplier ? 'Save changes' : 'Add supplier'}
        </Button>
      </div>
    </form>
  );
}

// REQUIREMENT [Core Req 3 - Frontend Application]: page 13 - suppliers: full CRUD (create / edit in a modal, delete with confirmation).
export default function Suppliers() {
  const { showToast } = useToast();
  const suppliers = useFetch<Supplier[]>('/suppliers');

  // null = closed, 'new' = adding, a supplier = editing that one
  const [formFor, setFormFor] = useState<Supplier | 'new' | null>(null);
  const [toDelete, setToDelete] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      // REQUIREMENT [Core Req 2 - REST API]: DELETE /suppliers/:id. The 400 rule (supplier still in use) is shown as an error toast.
      await api.delete(`/suppliers/${toDelete._id}`);
      showToast(`${toDelete.name} deleted`);
      suppliers.reload();
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  }

  const list = suppliers.data ?? [];
  const activeCount = list.filter((supplier) => supplier.isActive).length;

  return (
    <>
      <PageHeader
        title="Suppliers"
        description="Who you buy from and how long each one takes to deliver. Lead time drives the reorder suggestions."
        actions={
          <Button onClick={() => setFormFor('new')}>
            <Icon name="plus" className="size-4" />
            Add a supplier
          </Button>
        }
      />

      {suppliers.loading && !suppliers.data ? (
        <Card>
          <LoadingState label="Loading suppliers" />
        </Card>
      ) : suppliers.error ? (
        <Card>
          <ErrorState message={suppliers.error} onRetry={suppliers.reload} />
        </Card>
      ) : list.length === 0 ? (
        <Card>
          <EmptyState
            icon="truck"
            title="No suppliers yet"
            hint="Add the people you buy stock from. Every product needs one."
            action={<Button onClick={() => setFormFor('new')}>Add a supplier</Button>}
          />
        </Card>
      ) : (
        <>
          <p className="mb-3 text-sm text-ink-soft">
            {plural(list.length, 'supplier')}, {activeCount} active
          </p>
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {/* REQUIREMENT [Core Req 3 - Frontend Application]: map() with a stable key (supplier._id). */}
            {list.map((supplier) => (
              <li key={supplier._id} className="flex flex-col rounded-2xl border border-line bg-surface p-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="min-w-0 text-lg leading-snug font-semibold break-words">{supplier.name}</h2>
                  <Badge tone={supplier.isActive ? 'ok' : 'neutral'}>{supplier.isActive ? 'Active' : 'Inactive'}</Badge>
                </div>
                <dl className="mt-3 flex-1 space-y-1 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-soft">Contact</dt>
                    <dd className="truncate">{supplier.contactPerson}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-soft">Phone</dt>
                    <dd className="tabular">{supplier.phone}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-soft">Delivers in</dt>
                    <dd>{plural(supplier.leadTimeDays, 'day')}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-soft">Supplies</dt>
                    <dd>{plural(supplier.productCount ?? 0, 'product')}</dd>
                  </div>
                </dl>
                <div className="mt-4 flex gap-2 border-t border-line pt-4">
                  <Button variant="secondary" size="sm" onClick={() => setFormFor(supplier)}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setToDelete(supplier)}>
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {formFor && (
        <Modal title={formFor === 'new' ? 'Add a supplier' : `Edit ${formFor.name}`} onClose={() => setFormFor(null)}>
          <SupplierForm
            supplier={formFor === 'new' ? null : formFor}
            onCancel={() => setFormFor(null)}
            onDone={() => {
              setFormFor(null);
              suppliers.reload();
            }}
          />
        </Modal>
      )}

      {toDelete && (
        <ConfirmDialog
          title={`Delete ${toDelete.name}?`}
          message="Suppliers that still have products or purchase orders cannot be deleted. Mark them inactive instead."
          confirmLabel="Delete supplier"
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </>
  );
}
