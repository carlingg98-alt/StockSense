import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { api, getErrorMessage } from '../api/client';
import type { Product, Transaction } from '../api/types';
import { Button, buttonClass } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Field, inputClass } from '../components/ui/Field';
import { Icon } from '../components/ui/Icon';
import { ConfirmDialog, Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States';
import { TypeBadge } from '../components/ui/TypeBadge';
import { useFetch } from '../hooks/useFetch';
import { useToast } from '../hooks/useToast';
import { formatDateTime, peso, plural, toInputDate, todayInputValue } from '../lib/format';
import { transactionEditSchema, type TransactionEditValues } from '../schemas/transaction';

// The small form inside the "Edit note" dialog
function EditTransactionForm({ transaction, onDone, onCancel }: { transaction: Transaction; onDone: () => void; onCancel: () => void }) {
  const { showToast } = useToast();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  // REQUIREMENT [Core Req 3 - Frontend Application]: React Hook Form + Zod edit form (transactionEditSchema).
  } = useForm<TransactionEditValues>({
    resolver: zodResolver(transactionEditSchema),
    defaultValues: { note: transaction.note, date: toInputDate(transaction.date) },
  });

  async function onSubmit(values: TransactionEditValues) {
    try {
      // Only send the date if it was changed, so the original time of day is kept
      const body: { note: string; date?: string } = { note: values.note };
      if (values.date !== toInputDate(transaction.date)) body.date = values.date;
      await api.put(`/transactions/${transaction._id}`, body);
      showToast('Transaction updated');
      onDone();
    } catch (error) {
      setError('root', { message: getErrorMessage(error) });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <p className="text-sm text-ink-soft">
        Quantities and amounts are history and cannot be edited. To fix them, void this row and record it again.
      </p>
      <Field label="Date" htmlFor="edit-date" error={errors.date?.message}>
        <input id="edit-date" type="date" max={todayInputValue()} className={inputClass} aria-invalid={Boolean(errors.date)} {...register('date')} />
      </Field>
      <Field label="Note" htmlFor="edit-note" error={errors.note?.message}>
        <input id="edit-note" className={inputClass} aria-invalid={Boolean(errors.note)} {...register('note')} />
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
          {isSubmitting ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}

// REQUIREMENT [Core Req 3 - Frontend Application]: page 7 - stock ledger with filters (type, product, date range - Data Processing and Business Logic). Has edit (note / date) and void (delete with confirmation).
export default function Transactions() {
  const { showToast } = useToast();

  const [type, setType] = useState('');
  const [product, setProduct] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  // REQUIREMENT [Core Req 3 - Frontend Application]: filters are sent as query params; the list re-fetches when they change.
  const transactions = useFetch<Transaction[]>('/transactions', {
    type: type || undefined,
    product: product || undefined,
    from: from || undefined,
    to: to || undefined,
  });
  const products = useFetch<Product[]>('/products');

  const [editing, setEditing] = useState<Transaction | null>(null);
  // REQUIREMENT [Core Req 3 - Frontend Application]: delete (void) with a confirmation step.
  const [toVoid, setToVoid] = useState<Transaction | null>(null);
  const [voiding, setVoiding] = useState(false);

  async function confirmVoid() {
    if (!toVoid) return;
    setVoiding(true);
    try {
      await api.delete(`/transactions/${toVoid._id}`);
      showToast('Transaction voided and stock put back');
      transactions.reload();
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
    } finally {
      setVoiding(false);
      setToVoid(null);
    }
  }

  // Totals for whatever is currently listed, derived during render
  const rows = transactions.data ?? [];
  // REQUIREMENT [Data Processing and Business Logic]: totals for the visible rows (sales, restocks, write-offs), derived during render - not stored in state.
  const totals = rows.reduce(
    (sum, row) => {
      if (row.type === 'sale') sum.sales += row.totalAmount;
      else if (row.type === 'restock') sum.restocks += row.totalAmount;
      else sum.writeOffs += row.totalAmount;
      return sum;
    },
    { sales: 0, restocks: 0, writeOffs: 0 }
  );
  const hasFilters = Boolean(type || product || from || to);

  return (
    <>
      <PageHeader
        title="Stock ledger"
        description="Every sale, restock and write-off. Voiding a row puts the stock back the way it was."
        actions={
          <Link to="/app/sales/new" className={buttonClass('primary')}>
            <Icon name="plus" className="size-4" />
            Record a sale
          </Link>
        }
      />

      <Card className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select aria-label="Type" value={type} onChange={(event) => setType(event.target.value)} className={inputClass}>
            <option value="">All movement types</option>
            <option value="sale">Sales</option>
            <option value="restock">Restocks</option>
            <option value="adjustment">Write-offs</option>
          </select>
          <select aria-label="Product" value={product} onChange={(event) => setProduct(event.target.value)} className={inputClass}>
            <option value="">All products</option>
            {products.data?.map((item) => (
              <option key={item._id} value={item._id}>
                {item.name}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <span className="w-10 shrink-0">From</span>
            <input type="date" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} className={inputClass} />
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <span className="w-10 shrink-0">To</span>
            <input type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} className={inputClass} />
          </label>
        </div>
      </Card>

      <Card>
        {transactions.loading && !transactions.data ? (
          <LoadingState rows={6} label="Loading transactions" />
        ) : transactions.error ? (
          <ErrorState message={transactions.error} onRetry={transactions.reload} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="list"
            title={hasFilters ? 'No movements match these filters' : 'The ledger is empty'}
            hint={hasFilters ? 'Widen the date range or remove a filter.' : 'Record a sale or a restock to write the first line.'}
            action={
              hasFilters ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setType('');
                    setProduct('');
                    setFrom('');
                    setTo('');
                  }}
                >
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="flex flex-wrap gap-x-6 gap-y-1 border-b border-line px-5 py-3 text-sm text-ink-soft">
              <span>
                {plural(rows.length, 'movement')}
                {rows.length === 200 && ' (latest 200 shown)'}
              </span>
              <span className="tabular">Sales {peso(totals.sales)}</span>
              <span className="tabular">Restocked {peso(totals.restocks)}</span>
              <span className="tabular">Written off {peso(totals.writeOffs)}</span>
            </div>
            <ul className={`divide-y divide-line ${transactions.loading ? 'opacity-60' : ''}`}>
              {/* REQUIREMENT [Core Req 3 - Frontend Application]: map() with a stable key (row._id). */}
              {rows.map((row) => (
                <li
                  key={row._id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 px-5 py-3 md:grid-cols-[6.5rem_minmax(0,1.4fr)_minmax(0,1fr)_4rem_7rem_auto]"
                >
                  <span className="order-2 justify-self-end md:order-none md:justify-self-start">
                    <TypeBadge type={row.type} />
                  </span>
                  <div className="order-1 min-w-0 md:order-none">
                    <p className="truncate font-semibold">{row.product?.name ?? 'Deleted product'}</p>
                    <p className="text-sm text-ink-soft">{formatDateTime(row.date)}</p>
                  </div>
                  <span className="order-5 col-span-2 truncate text-sm text-ink-soft md:order-none md:col-span-1">
                    {row.note || (row.reason ? `Reason: ${row.reason}` : '')}
                  </span>
                  <span className={`tabular order-3 font-semibold md:order-none md:text-right ${row.type === 'restock' ? 'text-ok' : ''}`}>
                    {row.type === 'restock' ? '+' : '−'}
                    {row.quantity} {row.product?.unit}
                  </span>
                  <span className="tabular order-4 text-right md:order-none">{peso(row.totalAmount)}</span>
                  <div className="order-6 col-span-2 flex gap-1 md:order-none md:col-span-1">
                    <Button variant="ghost" size="sm" className="px-2" aria-label="Edit note and date" onClick={() => setEditing(row)}>
                      <Icon name="pencil" className="size-4" />
                      <span className="md:hidden">Edit</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="px-2" aria-label="Void transaction" onClick={() => setToVoid(row)}>
                      <Icon name="trash" className="size-4" />
                      <span className="md:hidden">Void</span>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      {editing && (
        <Modal title="Edit note and date" onClose={() => setEditing(null)}>
          <EditTransactionForm
            transaction={editing}
            onCancel={() => setEditing(null)}
            onDone={() => {
              setEditing(null);
              transactions.reload();
            }}
          />
        </Modal>
      )}

      {toVoid && (
        <ConfirmDialog
          title="Void this transaction?"
          message={
            <>
              This removes the {toVoid.type === 'adjustment' ? 'write-off' : toVoid.type} of {toVoid.quantity} ×{' '}
              {toVoid.product?.name ?? 'a deleted product'} and {toVoid.type === 'restock' ? 'takes that stock back off the shelf' : 'puts that stock back on the shelf'}.
            </>
          }
          confirmLabel="Void transaction"
          busy={voiding}
          onConfirm={confirmVoid}
          onCancel={() => setToVoid(null)}
        />
      )}
    </>
  );
}
