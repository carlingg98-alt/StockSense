import { Link } from 'react-router-dom';
import { Logo } from '../components/layout/Logo';
import { buttonClass } from '../components/ui/Button';
import { Icon, type IconName } from '../components/ui/Icon';
import { StockGauge } from '../components/ui/StockGauge';

// Sample shelf for the hero. Shown as an illustration, not live data.
const SHELF = [
  { name: 'Kopiko Black 3-in-1', quantity: 140, reorderLevel: 60, unit: 'sachet', note: '11 days left' },
  { name: 'Pancit Canton Original', quantity: 52, reorderLevel: 48, unit: 'pack', note: '5 days left' },
  { name: 'Coca-Cola 1.5L', quantity: 14, reorderLevel: 24, unit: 'bottle', note: 'Order 87 today' },
  { name: 'Milo Sachet 24g', quantity: 0, reorderLevel: 40, unit: 'sachet', note: 'Sold out Saturday' },
];

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'swap',
    title: 'Stock that adds up',
    text: 'Every sale, delivery and write-off is one line in a ledger. The count on screen is always restocks minus sales minus losses, and it can never go below zero.',
  },
  {
    icon: 'alert',
    title: 'Warnings before the gap',
    text: 'Items at or under their reorder level are flagged, and anything expiring within 30 days is listed with the money at risk.',
  },
  {
    icon: 'trend',
    title: 'A forecast you can check by hand',
    text: 'Demand is a moving average of your own recent sales. No black box: the page shows the numbers that went into it.',
  },
  {
    icon: 'clipboard',
    title: 'Orders that write themselves',
    text: 'Suggested quantities are grouped by supplier. One tap turns them into a draft purchase order, and receiving it restocks the shelf.',
  },
];

const FORMULAS = [
  { name: 'Stock on hand', formula: 'restocks − sales − write-offs', example: '422 − 406 − 2 = 14 bottles' },
  { name: 'Daily demand', formula: 'units sold in the last 14 days ÷ 14', example: '88 ÷ 14 = 6.3 a day' },
  { name: 'Days of stock left', formula: 'stock on hand ÷ daily demand', example: '14 ÷ 6.3 = 2.2 days' },
  {
    name: 'Suggested order',
    formula: 'daily demand × (lead time + 14 days) − stock on hand',
    example: '6.3 × (2 + 14) − 14 = 87 bottles',
  },
];

// REQUIREMENT [Project Theme]: the LANDING PAGE (route "/"). Explains the concept, the features and the formulas, and links into the app.
// REQUIREMENT [Core Req 4 - Frontend Design]: original design - not a template.
export default function Landing() {
  return (
    <div className="bg-surface">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <Link to="/app" className={buttonClass('primary', 'sm')}>
          Open the app
        </Link>
      </header>

      {/* Hero: the claim on the left, a shelf you can read at a glance on the right */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-8 pb-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pt-16 lg:pb-24">
        <div>
          <h1 className="text-[2.6rem] leading-[1.04] font-bold sm:text-6xl">
            Know what to reorder before the shelf runs empty.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
            StockSense keeps count for small stores. It records what you sell and what you receive, works out how
            fast each item moves, and tells you how much to order and when.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/app" className={buttonClass('highlight', 'md', 'h-12 px-6 text-base')}>
              Open the dashboard
            </Link>
            <a href="#how-it-counts" className={buttonClass('secondary', 'md', 'h-12 px-6 text-base')}>
              See how it counts
            </a>
          </div>
        </div>

        <div className="rounded-3xl bg-ink p-3 sm:p-4">
          <div className="flex items-center justify-between px-2 pt-1 pb-3 text-sm text-white/60">
            <span>Aisle 1, this morning</span>
            <span>sample data</span>
          </div>
          <ul className="space-y-2">
            {/* REQUIREMENT [Core Req 3 - Frontend Application]: map() with a stable key (item.name), not the index. */}
            {SHELF.map((item) => (
              <li key={item.name} className="rounded-2xl bg-surface px-4 py-3.5">
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate font-semibold">{item.name}</span>
                  <span className="shrink-0 text-sm text-ink-soft">{item.note}</span>
                </div>
                <StockGauge quantity={item.quantity} reorderLevel={item.reorderLevel} unit={item.unit} animate />
              </li>
            ))}
          </ul>
          <p className="px-2 pt-3 pb-1 text-sm text-white/60">
            The dark notch is the reorder level. A bar that ends before it needs an order.
          </p>
        </div>
      </section>

      <section className="border-y border-line bg-canvas">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <h2 className="max-w-2xl text-3xl font-semibold sm:text-4xl">Built for the way a small store actually runs</h2>
          <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="flex gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-tag text-ink">
                  <Icon name={feature.icon} />
                </span>
                <div>
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-1 leading-relaxed text-ink-soft">{feature.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-counts" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          <div>
            <h2 className="text-3xl font-semibold sm:text-4xl">Four sums, nothing hidden</h2>
            <p className="mt-4 leading-relaxed text-ink-soft">
              Everything StockSense tells you comes from arithmetic you could do on the back of a receipt. Here it is,
              worked through for one bottle of Coke that sells about six a day and takes two days to deliver.
            </p>
          </div>
          <dl className="divide-y divide-line rounded-2xl border border-line">
            {FORMULAS.map((row) => (
              <div key={row.name} className="grid gap-1 px-5 py-4 sm:grid-cols-[11rem_1fr] sm:gap-4">
                <dt className="font-semibold">{row.name}</dt>
                <dd>
                  <p>{row.formula}</p>
                  <p className="tabular mt-0.5 text-sm text-ink-soft">{row.example}</p>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 rounded-3xl bg-tag px-6 py-10 sm:px-10 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-3xl font-semibold">The demo store is already stocked</h2>
            <p className="mt-2 max-w-xl text-ink/75">
              27 products, 6 suppliers and two months of sales are loaded. Record a sale and watch the forecast move.
            </p>
          </div>
          <Link to="/app" className={buttonClass('primary', 'md', 'h-12 px-6 text-base')}>
            Open the dashboard
          </Link>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-ink-soft sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>StockSense, a final project for Advanced Web Programming (CTADWEBL) at NU Clark</span>
          <span>React, Express and MongoDB</span>
        </div>
      </footer>
    </div>
  );
}
