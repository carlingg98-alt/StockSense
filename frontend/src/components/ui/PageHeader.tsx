import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './Icon';

interface PageHeaderProps {
  title: string;
  description?: string;
  backTo?: { to: string; label: string };
  actions?: ReactNode;
}

export function PageHeader({ title, description, backTo, actions }: PageHeaderProps) {
  return (
    <header className="mb-6">
      {backTo && (
        <Link to={backTo.to} className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink">
          <Icon name="back" className="size-4" />
          {backTo.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold break-words sm:text-3xl">{title}</h1>
          {description && <p className="mt-1 max-w-2xl text-ink-soft">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}
