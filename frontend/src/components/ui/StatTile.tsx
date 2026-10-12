import type { ReactNode } from 'react';

interface StatTileProps {
  label: string;
  value: string;
  note?: ReactNode;
  loading?: boolean;
}

export function StatTile({ label, value, note, loading }: StatTileProps) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <p className="text-sm text-ink-soft">{label}</p>
      {loading ? (
        <div className="animate-shimmer mt-2 h-8 w-24 rounded-lg bg-canvas" />
      ) : (
        <p className="tabular mt-1 font-display text-2xl font-semibold break-words sm:text-[1.75rem]">{value}</p>
      )}
      {note && !loading && <div className="mt-1 text-sm text-ink-soft">{note}</div>}
    </div>
  );
}
