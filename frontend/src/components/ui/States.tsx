import type { ReactNode } from 'react';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';

// Placeholder rows shown while a request is in flight.
// REQUIREMENT [Core Req 3 - Frontend Application]: loading state - no blank screen while data loads.
export function LoadingState({ rows = 4, label = 'Loading' }: { rows?: number; label?: string }) {
  const widths = ['w-11/12', 'w-9/12', 'w-10/12', 'w-8/12', 'w-11/12', 'w-7/12'];
  return (
    <div role="status" aria-label={label} className="space-y-3 p-5">
      {widths.slice(0, rows).map((width) => (
        <div key={width} className={`animate-shimmer h-9 rounded-lg bg-canvas ${width}`} />
      ))}
      <span className="sr-only">{label}…</span>
    </div>
  );
}

// Shown when a request failed. Always says what happened and offers a way forward.
// REQUIREMENT [Core Req 3 - Frontend Application]: error state with a "Try again" button - no silent failures.
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-out-soft text-out">
        <Icon name="alert" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">This did not load</p>
        <p className="text-sm break-words text-ink-soft">{message}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  hint: string;
  action?: ReactNode;
}

// Shown when a request worked but there is nothing to list yet.
// REQUIREMENT [Core Req 3 - Frontend Application]: visible empty state when a list has no records.
export function EmptyState({ icon = 'box', title, hint, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-5 py-10 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-tag-soft text-tag-deep">
        <Icon name={icon} className="size-6" />
      </span>
      <p className="mt-4 font-display text-lg font-semibold">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-ink-soft">{hint}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
