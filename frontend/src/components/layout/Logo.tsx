// The mark is two shelf tags: a short white one over a long yellow one.
export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden="true">
        <rect width="32" height="32" rx="8" className={light ? 'fill-white/10' : 'fill-ink'} />
        <rect x="7" y="18" width="18" height="6" rx="2" className="fill-tag" />
        <rect x="7" y="9" width="11" height="6" rx="2" fill="#fff" />
      </svg>
      <span className={`font-display text-xl font-bold tracking-tight ${light ? 'text-white' : 'text-ink'}`}>StockSense</span>
    </span>
  );
}
