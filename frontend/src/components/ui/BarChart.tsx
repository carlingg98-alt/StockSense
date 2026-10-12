interface Bar {
  key: string;
  label: string; // shown under the axis and in the tooltip
  value: number;
  display: string; // formatted value for the tooltip
  highlight?: boolean;
}

// A small bar chart built from plain divs. Heights are percentages of the tallest bar.
export function BarChart({ bars, ariaLabel }: { bars: Bar[]; ariaLabel: string }) {
  const max = Math.max(...bars.map((bar) => bar.value), 1);
  // Label only the first, middle and last bar so the axis stays readable on phones
  const labelled = new Set([0, Math.floor((bars.length - 1) / 2), bars.length - 1]);

  return (
    <figure aria-label={ariaLabel}>
      <div className="flex h-44 items-end gap-[3px] border-b border-line sm:gap-1.5">
        {bars.map((bar) => (
          <div
            key={bar.key}
            title={`${bar.label}: ${bar.display}`}
            className={`min-w-0 flex-1 rounded-t-[4px] ${bar.highlight ? 'bg-tag' : 'bg-ink/80'} hover:bg-accent`}
            style={{ height: `${Math.max((bar.value / max) * 100, bar.value > 0 ? 3 : 1)}%` }}
          />
        ))}
      </div>
      <div className="relative mt-1.5 flex justify-between text-xs text-ink-faint">
        {bars.map((bar, index) => (labelled.has(index) ? <span key={bar.key}>{bar.label}</span> : null))}
      </div>
    </figure>
  );
}
