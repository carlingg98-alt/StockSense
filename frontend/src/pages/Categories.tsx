import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { api, getErrorMessage } from '../api/client';
import type { Category } from '../api/types';
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
import { categorySchema, type CategoryFormValues } from '../schemas/category';

function CategoryForm({ category, onDone, onCancel }: { category: Category | null; onDone: () => void; onCancel: () => void }) {
  const { showToast } = useToast();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  // REQUIREMENT [Core Req 3 - Frontend Application]: React Hook Form + Zod (categorySchema, z.infer type CategoryFormValues).
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: category?.name ?? '', description: category?.description ?? '' },
  });

  async function onSubmit(values: CategoryFormValues) {
    try {
      if (category) {
        await api.put(`/categories/${category._id}`, values);
        showToast(`${values.name} saved`);
      } else {
        await api.post('/categories', values);
        showToast(`${values.name} added`);
      }
      onDone();
    } catch (error) {
      // REQUIREMENT [Core Req 3 - Frontend Application]: server validation errors (e.g. duplicate name) are shown per field.
      const matched = applyServerErrors(error, setError, ['name', 'description']);
      if (!matched) setError('root', { message: getErrorMessage(error) });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <Field label="Category name" htmlFor="category-name" error={errors.name?.message}>
        <input id="category-name" className={inputClass} aria-invalid={Boolean(errors.name)} placeholder="Frozen Goods" {...register('name')} />
      </Field>
      <Field label="Description (optional)" htmlFor="category-description" error={errors.description?.message}>
        <textarea
          id="category-description"
          rows={3}
          className={`${inputClass} h-auto py-2.5`}
          aria-invalid={Boolean(errors.description)}
          {...register('description')}
        />
      </Field>
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
          {isSubmitting ? 'Saving…' : category ? 'Save changes' : 'Add category'}
        </Button>
      </div>
    </form>
  );
}

// REQUIREMENT [Core Req 3 - Frontend Application]: page 14 - categories: full CRUD (create / edit in a modal, delete with confirmation). Shows the productCount from the API.
export default function Categories() {
  const { showToast } = useToast();
  const categories = useFetch<Category[]>('/categories');

  const [formFor, setFormFor] = useState<Category | 'new' | null>(null);
  const [toDelete, setToDelete] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      // REQUIREMENT [Core Req 2 - REST API]: DELETE /categories/:id. The 400 rule (category still has products) is shown as an error toast.
      await api.delete(`/categories/${toDelete._id}`);
      showToast(`${toDelete.name} deleted`);
      categories.reload();
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  }

  const list = categories.data ?? [];
  // Derived: the widest bar belongs to the category with the most products
  // REQUIREMENT [Core Req 3 - Frontend Application]: derived value (largest category, used for the bar width) computed during render.
  const largest = Math.max(...list.map((category) => category.productCount ?? 0), 1);

  return (
    <>
      <PageHeader
        title="Categories"
        description="Group products so they are easier to find and compare in reports."
        actions={
          <Button onClick={() => setFormFor('new')}>
            <Icon name="plus" className="size-4" />
            Add a category
          </Button>
        }
      />

      <Card className="max-w-3xl">
        {categories.loading && !categories.data ? (
          <LoadingState label="Loading categories" />
        ) : categories.error ? (
          <ErrorState message={categories.error} onRetry={categories.reload} />
        ) : list.length === 0 ? (
          <EmptyState
            icon="tag"
            title="No categories yet"
            hint="Create a category such as Beverages or Snacks before adding products."
            action={<Button onClick={() => setFormFor('new')}>Add a category</Button>}
          />
        ) : (
          <ul className="divide-y divide-line">
            {/* REQUIREMENT [Core Req 3 - Frontend Application]: map() with a stable key (category._id). */}
            {list.map((category) => {
              const count = category.productCount ?? 0;
              return (
                <li key={category._id} className="flex items-center gap-4 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <h2 className="truncate font-sans text-base font-semibold tracking-normal">{category.name}</h2>
                      <span className="shrink-0 text-sm text-ink-soft">{plural(count, 'product')}</span>
                    </div>
                    {category.description && <p className="mt-0.5 truncate text-sm text-ink-soft">{category.description}</p>}
                    <div className="mt-2 h-1.5 rounded-full bg-canvas">
                      <div className="h-full rounded-full bg-tag" style={{ width: `${(count / largest) * 100}%` }} />
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="sm" className="px-2" aria-label={`Edit ${category.name}`} onClick={() => setFormFor(category)}>
                      <Icon name="pencil" className="size-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="px-2" aria-label={`Delete ${category.name}`} onClick={() => setToDelete(category)}>
                      <Icon name="trash" className="size-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {formFor && (
        <Modal title={formFor === 'new' ? 'Add a category' : `Edit ${formFor.name}`} onClose={() => setFormFor(null)}>
          <CategoryForm
            category={formFor === 'new' ? null : formFor}
            onCancel={() => setFormFor(null)}
            onDone={() => {
              setFormFor(null);
              categories.reload();
            }}
          />
        </Modal>
      )}

      {toDelete && (
        <ConfirmDialog
          title={`Delete ${toDelete.name}?`}
          message="A category can only be deleted when no products are in it. Move its products to another category first."
          confirmLabel="Delete category"
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </>
  );
}
