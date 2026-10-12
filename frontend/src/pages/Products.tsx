import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getErrorMessage } from '../api/client';
import type { Category, Product, Supplier } from '../api/types';
import { Badge } from '../components/ui/Badge';
import { Button, buttonClass } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { inputClass } from '../components/ui/Field';
import { Icon } from '../components/ui/Icon';
import { ConfirmDialog } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States';
import { StockGauge } from '../components/ui/StockGauge';
import { useDebounce } from '../hooks/useDebounce';
import { useFetch } from '../hooks/useFetch';
import { useToast } from '../hooks/useToast';
import { peso, pesoWhole, plural } from '../lib/format';
import { getExpiry } from '../lib/stock';

const SORTS = [
  { value: 'name:asc', label: 'Name, A to Z' },
  { value: 'quantity:asc', label: 'Stock, lowest first' },
  { value: 'quantity:desc', label: 'Stock, highest first' },
  { value: 'unitPrice:desc', label: 'Price, highest first' },
  { value: 'stockValue:desc', label: 'Stock value, highest first' },
  { value: 'createdAt:desc', label: 'Newest first' },
];

// REQUIREMENT [Core Req 3 - Frontend Application]: page 2 - Products list. Multi-criteria search / filter / sort (Data Processing and Business Logic) sent to GET /products/search.
export default function Products() {
  const { showToast } = useToast();

  // REQUIREMENT [Core Req 3 - Frontend Application]: only the filter controls are state. The product list is not copied into state; it comes from the API.
  // Filter controls. The list itself is never copied into state: it comes from the API.
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [supplier, setSupplier] = useState('');
  const [status, setStatus] = useState('');
  const [sortBy, setSortBy] = useState('name:asc');
  const debouncedSearch = useDebounce(search);
  const [sort, order] = sortBy.split(':');

  // REQUIREMENT [Core Req 3 - Frontend Application]: API call through the custom useFetch hook (shared axios instance). It re-fetches when a filter changes and gives loading and error states.
  const products = useFetch<Product[]>('/products/search', {
    q: debouncedSearch || undefined,
    category: category || undefined,
    supplier: supplier || undefined,
    status: status || undefined,
    sort,
    order,
  });
  const categories = useFetch<Category[]>('/categories');
  const suppliers = useFetch<Supplier[]>('/suppliers');

  // REQUIREMENT [Core Req 3 - Frontend Application]: delete with a confirmation step - the product is only stored here; the API call runs after the user confirms.
  const [toDelete, setToDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      // REQUIREMENT [Core Req 2 - REST API]: DELETE /products/:id. Success toast after delete; the API error (e.g. product has history) is shown as an error toast.
      await api.delete(`/products/${toDelete._id}`);
      showToast(`${toDelete.name} deleted`);
      products.reload();
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  }

  // REQUIREMENT [Core Req 3 - Frontend Application]: derived values computed during render, not stored in state.
  // Derived values, recomputed on every render from the list we already have
  const list = products.data ?? [];
  const totalValue = list.reduce((sum, product) => sum + product.quantity * product.unitCost, 0);
  const hasFilters = Boolean(search || category || supplier || status);

  function clearFilters() {
    setSearch('');
    setCategory('');
    setSupplier('');
    setStatus('');
  }

  return (
    <>
      <PageHeader
        title="Products"
        description="Everything on your shelves, with how full each one is."
        actions={
          <Link to="/app/products/new" className={buttonClass('primary')}>
            <Icon name="plus" className="size-4" />
            Add a product
          </Link>
        }
      />

      <Card className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_repeat(4,minmax(0,1fr))]">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Icon name="search" className="pointer-events-none absolute top-3 left-3 size-5 text-ink-faint" />
            <input
              type="search"
              aria-label="Search by name or SKU"
              placeholder="Search by name or SKU"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className={`${inputClass} pl-10`}
            />
          </div>
          <select aria-label="Category" value={category} onChange={(event) => setCategory(event.target.value)} className={inputClass}>
            <option value="">All categories</option>
            {categories.data?.map((item) => (
              <option key={item._id} value={item._id}>
                {item.name}
              </option>
            ))}
          </select>
          <select aria-label="Supplier" value={supplier} onChange={(event) => setSupplier(event.target.value)} className={inputClass}>
            <option value="">All suppliers</option>
            {suppliers.data?.map((item) => (
              <option key={item._id} value={item._id}>
                {item.name}
              </option>
            ))}
          </select>
          <select aria-label="Stock status" value={status} onChange={(event) => setStatus(event.target.value)} className={inputClass}>
            <option value="">Any status</option>
            <option value="in-stock">In stock</option>
            <option value="low">Low stock</option>
            <option value="out">Out of stock</option>
            <option value="expiring">Expiring within 30 days</option>
          </select>
          <select aria-label="Sort by" value={sortBy} onChange={(event) => setSortBy(event.target.value)} className={inputClass}>
            {SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <Card>
        {products.loading && !products.data ? (
          <LoadingState rows={6} label="Loading products" />
        ) : products.error ? (
          <ErrorState message={products.error} onRetry={products.reload} />
        ) : list.length === 0 ? (
          hasFilters ? (
            <EmptyState
              icon="search"
              title="No products match these filters"
              hint="Try a shorter search or remove a filter."
              action={
                <Button variant="secondary" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              title="No products yet"
              hint="Add your first product to start tracking its stock."
              action={
                <Link to="/app/products/new" className={buttonClass('primary')}>
                  Add a product
                </Link>
              }
            />
          )
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3 text-sm text-ink-soft">
              <span>
                {plural(list.length, 'product')}
                {hasFilters && ' match your filters'}
              </span>
              <span className="tabular">Stock value {pesoWhole(totalValue)}</span>
            </div>
            <ul className={`divide-y divide-line ${products.loading ? 'opacity-60' : ''}`}>
              {/* REQUIREMENT [Core Req 3 - Frontend Application]: map() with a stable key (product._id). */}
              {list.map((product) => {
                const expiry = getExpiry(product.expiryDate);
                return (
                  <li
                    key={product._id}
                    className="grid items-center gap-x-6 gap-y-3 px-5 py-4 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:grid-cols-[minmax(0,1.7fr)_9rem_minmax(0,1.2fr)_6rem_auto]"
                  >
                    <div className="min-w-0">
                      <Link to={`/app/products/${product._id}`} className="font-semibold hover:underline">
                        {product.name}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
                        <span className="tabular">{product.sku}</span>
                        <span className="tabular lg:hidden">{peso(product.unitPrice)}</span>
                        {(expiry.state === 'expired' || expiry.state === 'expiring') && (
                          <Badge tone={expiry.state === 'expired' ? 'out' : 'low'}>{expiry.label}</Badge>
                        )}
                      </div>
                    </div>
                    <span className="hidden truncate text-sm text-ink-soft lg:block">{product.category?.name ?? 'No category'}</span>
                    <StockGauge quantity={product.quantity} reorderLevel={product.reorderLevel} unit={product.unit} />
                    <span className="tabular hidden text-right font-semibold lg:block">{peso(product.unitPrice)}</span>
                    <div className="hidden gap-1 lg:flex">
                      <Link
                        to={`/app/products/${product._id}/edit`}
                        aria-label={`Edit ${product.name}`}
                        className={buttonClass('ghost', 'sm', 'px-2')}
                      >
                        <Icon name="pencil" className="size-4" />
                      </Link>
                      <Button variant="ghost" size="sm" className="px-2" aria-label={`Delete ${product.name}`} onClick={() => setToDelete(product)}>
                        <Icon name="trash" className="size-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Card>

      {toDelete && (
        <ConfirmDialog
          title={`Delete ${toDelete.name}?`}
          message="The product is removed for good. Products that already have sales or restocks cannot be deleted, because that would change your reports."
          confirmLabel="Delete product"
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </>
  );
}
