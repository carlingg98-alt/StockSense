import type { ReactNode } from 'react';

export type Tone = 'ok' | 'low' | 'out' | 'tag' | 'accent' | 'neutral';

const TONES: Record<Tone, string> = {
  ok: 'bg-ok-soft text-ok',
  low: 'bg-low-soft text-low',
  out: 'bg-out-soft text-out',
  tag: 'bg-tag-soft text-tag-deep',
  accent: 'bg-accent-soft text-accent',
  neutral: 'bg-canvas text-ink-soft',
};

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${TONES[tone]}`}>
      {children}
    </span>
  );
}
