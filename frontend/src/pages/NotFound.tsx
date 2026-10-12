import { Link } from 'react-router-dom';
import { buttonClass } from '../components/ui/Button';

// REQUIREMENT [Core Req 3 - Frontend Application]: handles unknown routes - a friendly page instead of a blank screen.
export default function NotFound({ inApp = false }: { inApp?: boolean }) {
  return (
    <div className={`grid place-items-center px-4 text-center ${inApp ? 'py-20' : 'min-h-dvh'}`}>
      <div>
        <p className="font-display text-7xl font-bold text-tag">404</p>
        <h1 className="mt-3 text-2xl font-semibold">This shelf is empty</h1>
        <p className="mt-2 text-ink-soft">The page you asked for does not exist or was moved.</p>
        <Link to={inApp ? '/app' : '/'} className={buttonClass('primary', 'md', 'mt-6')}>
          {inApp ? 'Go to the dashboard' : 'Go to the home page'}
        </Link>
      </div>
    </div>
  );
}
