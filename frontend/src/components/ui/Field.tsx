import type { ReactNode } from 'react';

// Shared look for every text input, number input and select in the app.
// REQUIREMENT [Core Req 4 - Frontend Design] / [Core Req 3 - Frontend Application]: consistent form fields; shows the per-field error message from React Hook Form.
export const inputClass =
  'h-11 w-full min-w-0 rounded-xl border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-faint ' +
  'focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 ' +
  'aria-[invalid=true]:border-out aria-[invalid=true]:ring-out/20 disabled:bg-canvas disabled:text-ink-soft';

interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}

// Label + input + per-field error message, laid out the same way on every form.
export function Field({ label, htmlFor, error, hint, children, className = '' }: FieldProps) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="mt-1.5 text-sm text-out">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-sm text-ink-soft">{hint}</p>
      )}
    </div>
  );
}
