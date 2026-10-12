import { getStockStatus } from '../../lib/stock';

const FILL = { ok: 'bg-ok', low: 'bg-low', out: 'bg-out' } as const;
const TEXT = { ok: 'text-ink', low: 'text-low', out: 'text-out' } as const;

interface StockGaugeProps {
  quantity: number;
  reorderLevel: number;
  unit: string;
  animate?: boolean;
}

// The shelf gauge: a bar showing how full the shelf is, with a notch at the reorder level.
// When the fill drops to the left of the notch, it is time to reorder.
export function StockGauge({ quantity, reorderLevel, unit, animate = false }: StockGaugeProps) {
  // All derived during render from the two numbers we were given
  const status = getStockStatus(quantity, reorderLevel);
  const scaleMax = Math.max(quantity, reorderLevel * 2.5, 1);
  const fillPercent = (quantity / scaleMax) * 100;
  const notchPercent = (reorderLevel / scaleMax) * 100;

  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className={`tabular font-semibold ${TEXT[status]}`}>
          {quantity} {unit}
        </span>
        <span className="tabular text-xs text-ink-faint">reorder at {reorderLevel}</span>
      </div>
      <div
        className="relative mt-1.5 h-2 rounded-full bg-canvas"
        role="img"
        aria-label={`${quantity} ${unit} in stock, reorder level ${reorderLevel}`}
      >
        <div
          className={`h-full rounded-full ${FILL[status]} ${animate ? 'animate-grow' : ''}`}
          style={{ width: `${fillPercent}%` }}
        />
        {reorderLevel > 0 && (
          <div className="absolute -top-1 h-4 w-0.5 rounded-full bg-ink" style={{ left: `${notchPercent}%` }} />
        )}
      </div>
    </div>
  );
}
