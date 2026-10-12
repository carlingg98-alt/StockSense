// A tiny inline icon set, drawn as SVG strokes so icons take the colour of the text around them.
const PATHS = {
  home: 'M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6',
  box: 'M21 8l-9-5-9 5v8l9 5 9-5V8zM3 8l9 5 9-5M12 13v8',
  cart: 'M3 4h2l2.4 11h10.2L20 7H6M9 20a1 1 0 100-2 1 1 0 000 2zM17 20a1 1 0 100-2 1 1 0 000 2z',
  swap: 'M7 4v16M7 4L3 8M7 4l4 4M17 20V4M17 20l-4-4M17 20l4-4',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  trend: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  clipboard: 'M9 4h6v3H9zM9 5H6v16h12V5h-3M9 12h6M9 16h4',
  truck: 'M2 6h11v10H2zM13 9h4l4 4v3h-8M6.5 19a2 2 0 100-4 2 2 0 000 4zM17.5 19a2 2 0 100-4 2 2 0 000 4z',
  tag: 'M3 12V3h9l9 9-9 9-9-9zM7.5 7.5h.01',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  menu: 'M3 6h18M3 12h18M3 18h18',
  close: 'M6 6l12 12M18 6L6 18',
  plus: 'M12 5v14M5 12h14',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM21 21l-5-5',
  alert: 'M12 8v5M12 16.5h.01M12 3l10 18H2L12 3z',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6',
  pencil: 'M4 20h4L19 9l-4-4L4 16v4zM13 7l4 4',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  back: 'M19 12H5M11 6l-6 6 6 6',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = 'size-5' }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
