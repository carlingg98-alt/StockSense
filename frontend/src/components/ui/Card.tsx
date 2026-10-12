import type { ReactNode } from 'react';

// REQUIREMENT [Core Req 4 - Frontend Design]: consistency - one Card component so cards share the same corners, border and shadow on every page.
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`min-w-0 rounded-2xl border border-line bg-surface ${className}`}>{children}</section>;
}

export function CardHeader({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pt-5 pb-3">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold">{title}</h2>
        {hint && <p className="mt-0.5 text-sm text-ink-soft">{hint}</p>}
      </div>
      {action}
    </div>
  );
}
