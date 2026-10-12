import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'highlight' | 'secondary' | 'danger' | 'ghost';
type Size = 'md' | 'sm';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-ink text-white hover:bg-ink/85',
  highlight: 'bg-tag text-ink hover:bg-tag/80',
  secondary: 'border border-line bg-surface text-ink hover:bg-canvas',
  danger: 'bg-out text-white hover:bg-out/85',
  ghost: 'text-ink-soft hover:bg-ink/5 hover:text-ink',
};

const SIZES: Record<Size, string> = {
  md: 'h-11 px-4 text-sm',
  sm: 'h-9 px-3 text-sm',
};

// Exported so a <Link> can look exactly like a <Button>.
// REQUIREMENT [Core Req 4 - Frontend Design]: consistency - one Button component (variants and sizes) so buttons look the same on every page.
export function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra = '') {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${extra}`;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({ variant = 'primary', size = 'md', className = '', type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}
